// apps/api/src/modules/test-engine/tests.service.ts
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RecordStatus, TestType, QuestionType, ResultPublishMode } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PdfPrinter = require('pdfmake');
import * as ExcelJS from 'exceljs';

@Injectable()
export class TestsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(instituteId?: string, roleCode?: string, batchId?: string) {
    if (roleCode === 'STUDENT' && batchId) {
      return this.prisma.test.findMany({
        where: {
          batchId,
          isPublished: true,
          status: RecordStatus.ACTIVE,
        },
        include: {
          config: true,
          _count: { select: { sections: true } },
        },
        orderBy: { startDateTime: 'desc' },
      });
    }

    const where: any = {
      status: { not: RecordStatus.DELETED },
    };

    if (instituteId) {
      where.instituteId = instituteId;
    }

    return this.prisma.test.findMany({
      where,
      include: {
        config: true,
        batch: { select: { name: true, code: true } },
        subject: { select: { name: true } },
        sections: {
          include: {
            _count: { select: { questions: true } },
          },
        },
        _count: { select: { attempts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, instituteId?: string) {
    const where: any = { id, status: { not: RecordStatus.DELETED } };
    if (instituteId) {
      where.instituteId = instituteId;
    }

    const test = await this.prisma.test.findFirst({
      where,
      include: {
        config: true,
        batch: true,
        subject: true,
        sections: {
          include: {
            questions: {
              include: {
                options: { orderBy: { sortOrder: 'asc' } },
                solution: true,
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    // Lazy scheduled auto-publish: if this test is SCHEDULED and its publish time has passed,
    // transition it to LIVE so it can be attempted/listed (no background cron required).
    if (test.testStatus === 'SCHEDULED' && test.publishAt) {
      const now = new Date();
      if (now >= test.publishAt) {
        await this.prisma.test.update({
          where: { id },
          data: { testStatus: 'LIVE', isPublished: true },
        });
        test.testStatus = 'LIVE';
        test.isPublished = true;
      }
    }

    const lastJoinAt = new Date(test.endDateTime.getTime() - test.durationMinutes * 60 * 1000);
    return { ...test, lastJoinAt };
  }

  async create(instituteId: string | undefined, data: any) {
    let resolvedInstituteId = instituteId;
    if (!resolvedInstituteId && data.batchId) {
      const batch = await this.prisma.batch.findUnique({ where: { id: data.batchId } });
      if (batch) resolvedInstituteId = batch.instituteId;
    }
    if (!resolvedInstituteId) {
      const firstInst = await this.prisma.institute.findFirst();
      if (firstInst) resolvedInstituteId = firstInst.id;
    }

    const now = new Date();
    const publishAction = data.publishAction || data.statusAction || (data.isPublished ? 'INSTANT' : 'DRAFT');
    const isScheduled = publishAction === 'SCHEDULED' || data.testStatus === 'SCHEDULED';
    const isInstant = publishAction === 'INSTANT' || data.testStatus === 'LIVE';
    const testStatus: any = isScheduled ? 'SCHEDULED' : isInstant ? 'LIVE' : 'DRAFT';

    const durationMs = (data.durationMinutes || 120) * 60000;
    let startDateTime: Date;
    let endDateTime: Date;

    if (isInstant) {
      // Instant live: start = now. Keep the author's end window if it still allows a full sitting.
      startDateTime = now;
      const userEnd = data.endDateTime ? new Date(data.endDateTime) : null;
      const minEnd = new Date(now.getTime() + durationMs);
      endDateTime = userEnd && userEnd.getTime() >= minEnd.getTime() ? userEnd : minEnd;
    } else if (isScheduled) {
      startDateTime = data.startDateTime ? new Date(data.startDateTime) : now;
      endDateTime = data.endDateTime
        ? new Date(data.endDateTime)
        : new Date(startDateTime.getTime() + durationMs);
    } else {
      // DRAFT: use user-supplied dates or sensible defaults
      startDateTime = data.startDateTime ? new Date(data.startDateTime) : now;
      endDateTime = data.endDateTime
        ? new Date(data.endDateTime)
        : new Date(startDateTime.getTime() + durationMs);
    }

    const publishAt: Date | null = isScheduled
      ? (data.publishAt ? new Date(data.publishAt) : new Date(startDateTime))
      : null;
    const isPublished = isInstant;

    const sectionsToCreate =
      Array.isArray(data.sections) && data.sections.length > 0
        ? data.sections.map((s: any, idx: number) => ({
            name: s.name || `Section ${idx + 1}`,
            sortOrder: s.sortOrder != null ? Number(s.sortOrder) : idx + 1,
          }))
        : [
            {
              name: data.sectionTitle || 'General Section',
              sortOrder: 1,
            },
          ];

    const created = await this.prisma.test.create({
      data: {
        instituteId: resolvedInstituteId!,
        batchId: data.batchId ? data.batchId : null,
        subjectId: data.subjectId ? data.subjectId : null,
        lessonId: data.lessonId ? data.lessonId : null,
        title: data.title,
        description: data.description || null,
        testType: data.testType || TestType.BATCH_LEVEL,
        totalMarks: data.totalMarks || 200,
        passMarks: data.passMarks || 80,
        negativeMarkRate: data.negativeMarkRate !== undefined ? Number(data.negativeMarkRate) : 1.0,
        durationMinutes: data.durationMinutes || 120,
        startDateTime,
        endDateTime,
        isPublished,
        testStatus,
        publishAt,
        status: RecordStatus.ACTIVE,
        config: {
          create: {
            antiCheatLevel: data.antiCheatLevel || 3,
            allowLateJoin: data.allowLateJoin ?? true,
            lateJoinGraceMins: data.lateJoinGraceMinutes || 30,
            shuffleQuestions: data.shuffleQuestions ?? true,
            shuffleOptions: data.shuffleOptions ?? true,
            publishMode: data.resultPublishMode || ResultPublishMode.AFTER_TEST_END,
            publishDateTime: publishAt,
            submitUnlockDelayMins: data.submitUnlockMinutes || 5,
            questionsPerScreen: data.questionsPerScreen || 1,
            oneQuestionAtATime: data.oneQuestionAtATime ?? true,
            totalQuestions: data.totalQuestions != null ? Number(data.totalQuestions) : null,
            optionsCount: data.optionsCount || 4,
            correctAnswerType: data.correctAnswerType || 'SINGLE',
            defaultPositiveMarks: data.defaultPositiveMarks != null ? Number(data.defaultPositiveMarks) : 4.0,
            defaultNegativeMarks: data.defaultNegativeMarks != null ? Number(data.defaultNegativeMarks) : 1.0,
          },
        },
        sections: {
          create: sectionsToCreate,
        },
      },
      include: {
        config: true,
        sections: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (Array.isArray(data.questions) && data.questions.length > 0) {
      const filled = data.questions.filter((q: any) => q?.contentHtml && String(q.contentHtml).trim());
      if (filled.length > 0) {
        // Map any client-side temporary section IDs to the newly created DB section IDs
        const sectionMap: Record<string, string> = {};
        if (Array.isArray(data.sections) && data.sections.length > 0) {
          data.sections.forEach((clientSec: any, idx: number) => {
            const dbSec = created.sections[idx] || created.sections[0];
            if (clientSec?.id && dbSec) {
              sectionMap[clientSec.id] = dbSec.id;
            }
          });
        }

        const remappedQuestions = filled.map((q: any) => ({
          ...q,
          sectionId: (q.sectionId && sectionMap[q.sectionId]) ? sectionMap[q.sectionId] : created.sections[0]?.id,
        }));

        await this.bulkImportQuestions(created.id, remappedQuestions);
        return this.findOne(created.id, resolvedInstituteId);
      }
    }

    return created;
  }

  async update(id: string, instituteId: string | undefined, data: any) {
    await this.findOne(id, instituteId);

    const now = new Date();
    let testStatus = data.testStatus;
    let isPublished = data.isPublished;
    let publishAt = data.publishAt ? new Date(data.publishAt) : undefined;
    if (data.publishAction === 'INSTANT') {
      testStatus = 'LIVE';
      isPublished = true;
      if (!data.startDateTime) data.startDateTime = now.toISOString();
    } else if (data.publishAction === 'SCHEDULED') {
      testStatus = 'SCHEDULED';
      isPublished = false;
      publishAt = data.publishAt ? new Date(data.publishAt) : data.startDateTime ? new Date(data.startDateTime) : now;
    } else if (data.publishAction === 'DRAFT') {
      testStatus = 'DRAFT';
      isPublished = false;
    }

    const test = await this.prisma.test.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        totalMarks: data.totalMarks,
        passMarks: data.passMarks,
        negativeMarkRate: data.negativeMarkRate,
        durationMinutes: data.durationMinutes,
        startDateTime: data.startDateTime ? new Date(data.startDateTime) : undefined,
        endDateTime: data.endDateTime ? new Date(data.endDateTime) : undefined,
        isPublished,
        status: data.status,
        testStatus,
        publishAt,
      },
    });

    // Update config if config fields provided
    if (data.shuffleQuestions !== undefined || data.shuffleOptions !== undefined ||
        data.antiCheatLevel !== undefined || data.submitUnlockMinutes !== undefined ||
        data.questionsPerScreen !== undefined || data.resultPublishMode !== undefined ||
        data.oneQuestionAtATime !== undefined || data.totalQuestions !== undefined ||
        data.optionsCount !== undefined || data.correctAnswerType !== undefined ||
        data.defaultPositiveMarks !== undefined || data.defaultNegativeMarks !== undefined) {
      await this.prisma.testConfig.upsert({
        where: { testId: id },
        update: {
          ...(data.shuffleQuestions !== undefined && { shuffleQuestions: data.shuffleQuestions }),
          ...(data.shuffleOptions !== undefined && { shuffleOptions: data.shuffleOptions }),
          ...(data.antiCheatLevel !== undefined && { antiCheatLevel: data.antiCheatLevel }),
          ...(data.submitUnlockMinutes !== undefined && { submitUnlockDelayMins: data.submitUnlockMinutes }),
          ...(data.questionsPerScreen !== undefined && { questionsPerScreen: data.questionsPerScreen }),
          ...(data.resultPublishMode !== undefined && { publishMode: data.resultPublishMode }),
          ...(data.oneQuestionAtATime !== undefined && { oneQuestionAtATime: data.oneQuestionAtATime }),
          ...(data.totalQuestions != null && { totalQuestions: Number(data.totalQuestions) }),
          ...(data.optionsCount !== undefined && { optionsCount: data.optionsCount }),
          ...(data.correctAnswerType !== undefined && { correctAnswerType: data.correctAnswerType }),
          ...(data.defaultPositiveMarks != null && { defaultPositiveMarks: Number(data.defaultPositiveMarks) }),
          ...(data.defaultNegativeMarks != null && { defaultNegativeMarks: Number(data.defaultNegativeMarks) }),
        },
        create: {
          testId: id,
          shuffleQuestions: data.shuffleQuestions ?? true,
          shuffleOptions: data.shuffleOptions ?? true,
          antiCheatLevel: data.antiCheatLevel ?? 3,
          submitUnlockDelayMins: data.submitUnlockMinutes ?? 5,
          questionsPerScreen: data.questionsPerScreen ?? 1,
          publishMode: data.resultPublishMode || ResultPublishMode.AFTER_TEST_END,
          oneQuestionAtATime: data.oneQuestionAtATime ?? true,
          totalQuestions: data.totalQuestions != null ? Number(data.totalQuestions) : null,
          optionsCount: data.optionsCount ?? 4,
          correctAnswerType: data.correctAnswerType ?? 'SINGLE',
          defaultPositiveMarks: data.defaultPositiveMarks != null ? Number(data.defaultPositiveMarks) : 4.0,
          defaultNegativeMarks: data.defaultNegativeMarks != null ? Number(data.defaultNegativeMarks) : 1.0,
        },
      });
    }

    return this.findOne(id, instituteId);
  }

  async delete(id: string, instituteId: string | undefined) {
    await this.findOne(id, instituteId);
    return this.prisma.test.update({
      where: { id },
      data: { status: RecordStatus.DELETED },
    });
  }

  async togglePublish(id: string, instituteId: string | undefined) {
    const test = await this.findOne(id, instituteId);
    const nowPublishing = !test.isPublished;
    return this.prisma.test.update({
      where: { id },
      data: {
        isPublished: nowPublishing,
        testStatus: nowPublishing ? 'LIVE' : 'DRAFT',
        // Publishing immediately: ensure the live window is sensible (default end = now + duration if none)
        ...(nowPublishing && !test.publishAt
          ? {
              startDateTime: test.startDateTime ?? new Date(),
              endDateTime: test.endDateTime ?? new Date(Date.now() + test.durationMinutes * 60000),
            }
          : {}),
      },
    });
  }

  // ──────────────────────────────────────────────
  // Section Management
  // ──────────────────────────────────────────────

  async addSection(testId: string, data: { name: string }) {
    const maxSort = await this.prisma.section.aggregate({
      where: { testId },
      _max: { sortOrder: true },
    });
    return this.prisma.section.create({
      data: {
        testId,
        name: data.name,
        sortOrder: (maxSort._max.sortOrder || 0) + 1,
      },
    });
  }

  async updateSection(sectionId: string, data: { name?: string; sortOrder?: number }) {
    return this.prisma.section.update({
      where: { id: sectionId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      },
    });
  }

  async deleteSection(sectionId: string) {
    return this.prisma.section.delete({
      where: { id: sectionId },
    });
  }

  // ──────────────────────────────────────────────
  // Question Authoring & Management
  // ──────────────────────────────────────────────

  async addQuestion(testId: string, data: {
    sectionId?: string;
    questionType?: QuestionType;
    contentHtml: string;
    diagramUrl?: string;
    marksPositive?: number;
    marksNegative?: number;
    options: { optionLabel: string; contentHtml: string; isCorrect: boolean }[];
    solutionText?: string;
    hint?: string;
    shortExplanation?: string;
    stepByStepSolution?: string;
  }) {
    let sectionId = data.sectionId;
    const existingSection = sectionId
      ? await this.prisma.section.findFirst({ where: { id: sectionId, testId } })
      : null;

    if (!existingSection) {
      const firstSection = await this.prisma.section.findFirst({ where: { testId } });
      if (!firstSection) {
        const newSec = await this.prisma.section.create({
          data: { testId, name: 'General Section', sortOrder: 1 },
        });
        sectionId = newSec.id;
      } else {
        sectionId = firstSection.id;
      }
    } else {
      sectionId = existingSection.id;
    }

    const questionCount = await this.prisma.question.count({ where: { sectionId } });

    // Per-question marks default to the test-level configuration when left blank
    const testConfig = await this.prisma.testConfig.findUnique({ where: { testId } });
    const defaultPos = testConfig?.defaultPositiveMarks ?? 4.0;
    const defaultNeg = testConfig?.defaultNegativeMarks ?? 1.0;

    // Build solution create payload — supports both old single-field and new 3-part structure
    const hasSolution = data.solutionText || data.hint || data.shortExplanation || data.stepByStepSolution;
    const solutionCreate = hasSolution
      ? {
          create: {
            hintHtml: data.hint || null,
            shortExplanation: data.shortExplanation || null,
            stepByStepHtml: data.stepByStepSolution || data.solutionText || null,
          },
        }
      : undefined;

    return this.prisma.question.create({
      data: {
        sectionId,
        questionType: data.questionType || QuestionType.SINGLE_CORRECT,
        contentHtml: data.contentHtml,
        diagramUrl: data.diagramUrl,
        marksPositive: data.marksPositive != null ? data.marksPositive : defaultPos,
        marksNegative: data.marksNegative != null ? data.marksNegative : defaultNeg,
        sortOrder: questionCount + 1,
        options: {
          create: data.options.map((opt, idx) => ({
            optionLabel: opt.optionLabel,
            contentHtml: opt.contentHtml,
            isCorrect: opt.isCorrect,
            sortOrder: idx + 1,
          })),
        },
        solution: solutionCreate,
      },
      include: {
        options: true,
        solution: true,
      },
    });
  }

  async updateQuestion(questionId: string, data: any) {
    const { options, solutionText, hint, shortExplanation, stepByStepSolution, ...qData } = data;

    await this.prisma.question.update({
      where: { id: questionId },
      data: qData,
    });

    if (options && Array.isArray(options)) {
      await this.prisma.questionOption.deleteMany({ where: { questionId } });
      await this.prisma.questionOption.createMany({
        data: options.map((opt: any, idx: number) => ({
          questionId,
          optionLabel: opt.optionLabel,
          contentHtml: opt.contentHtml,
          isCorrect: opt.isCorrect,
          sortOrder: idx + 1,
        })),
      });
    }

    // Update solution with 3-part structure
    const hasSolution = solutionText || hint || shortExplanation || stepByStepSolution;
    if (hasSolution) {
      await this.prisma.questionSolution.upsert({
        where: { questionId },
        update: {
          hintHtml: hint || null,
          shortExplanation: shortExplanation || null,
          stepByStepHtml: stepByStepSolution || solutionText || null,
        },
        create: {
          questionId,
          hintHtml: hint || null,
          shortExplanation: shortExplanation || null,
          stepByStepHtml: stepByStepSolution || solutionText || null,
        },
      });
    }

    return this.prisma.question.findUnique({
      where: { id: questionId },
      include: { options: true, solution: true },
    });
  }

  async deleteQuestion(questionId: string) {
    return this.prisma.question.delete({
      where: { id: questionId },
    });
  }

  // ──────────────────────────────────────────────
  // Bulk Import Questions (SCR-ADM-14)
  // ──────────────────────────────────────────────

  async bulkImportQuestions(testId: string, questions: {
    sectionId?: string;
    contentHtml: string;
    questionType?: string;
    marksPositive?: number;
    marksNegative?: number;
    options: { optionLabel: string; contentHtml: string; isCorrect: boolean }[];
    solutionText?: string;
    hint?: string;
    shortExplanation?: string;
    stepByStepSolution?: string;
  }[]) {
    if (!questions.length) return { imported: 0, questions: [] };

    // 1. Fetch test config and sections once
    const [testConfig, sections] = await Promise.all([
      this.prisma.testConfig.findUnique({ where: { testId } }),
      this.prisma.section.findMany({ where: { testId }, orderBy: { sortOrder: 'asc' } }),
    ]);

    const defaultSectionId =
      sections[0]?.id ||
      (
        await this.prisma.section.create({
          data: { testId, name: 'General Section', sortOrder: 1 },
        })
      ).id;

    const defaultPos = testConfig?.defaultPositiveMarks ?? 4.0;
    const defaultNeg = testConfig?.defaultNegativeMarks ?? 1.0;

    // 2. Process questions in parallel concurrency chunks
    const chunkSize = 15;
    const results: any[] = [];

    for (let i = 0; i < questions.length; i += chunkSize) {
      const slice = questions.slice(i, i + chunkSize);
      const batchResults = await Promise.all(
        slice.map(async (q, idx) => {
          const sectionId = q.sectionId || defaultSectionId;
          const hasSolution = q.solutionText || q.hint || q.shortExplanation || q.stepByStepSolution;
          const solutionCreate = hasSolution
            ? {
                create: {
                  hintHtml: q.hint || null,
                  shortExplanation: q.shortExplanation || null,
                  stepByStepHtml: q.stepByStepSolution || q.solutionText || null,
                },
              }
            : undefined;

          return this.prisma.question.create({
            data: {
              sectionId,
              questionType: (q.questionType as QuestionType) || QuestionType.SINGLE_CORRECT,
              contentHtml: q.contentHtml,
              marksPositive: q.marksPositive != null ? q.marksPositive : defaultPos,
              marksNegative: q.marksNegative != null ? q.marksNegative : defaultNeg,
              sortOrder: i + idx + 1,
              options: {
                create: (q.options || []).map((opt, optIdx) => ({
                  optionLabel: opt.optionLabel || String.fromCharCode(65 + optIdx),
                  contentHtml: opt.contentHtml || '',
                  isCorrect: !!opt.isCorrect,
                  sortOrder: optIdx + 1,
                })),
              },
              solution: solutionCreate,
            },
            include: {
              options: true,
              solution: true,
            },
          });
        }),
      );
      results.push(...batchResults);
    }

    return { imported: results.length, questions: results };
  }

  // ──────────────────────────────────────────────
  // Leaderboard with Tiebreaker (doc 9.6.2)
  // ──────────────────────────────────────────────

  async getAttemptsLeaderboard(testId: string) {
    const attempts = await this.prisma.testAttempt.findMany({
      where: {
        testId,
        submittedAt: { not: null },
        student: {
          role: {
            name: { notIn: ['SUPER_ADMIN', 'ADMIN', 'BRANCH_ADMIN', 'TEACHER'] },
          },
        },
      },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            identifier: true,
            email: true,
            phone: true,
            studentProfile: { select: { rollNumber: true } },
          },
        },
        result: true,
      },
    });

    // Sort with tiebreaker hierarchy from doc 9.6.2:
    // 1. Highest totalScore (desc)
    // 2. Lowest durationSeconds (asc) — fastest submission wins
    // 3. Lowest totalWrong (asc) — higher accuracy wins
    const sorted = attempts
      .filter((a) => a.result)
      .sort((a, b) => {
        const scoreA = a.result!.totalScore;
        const scoreB = b.result!.totalScore;
        if (scoreB !== scoreA) return scoreB - scoreA;

        const durationA = a.durationSeconds;
        const durationB = b.durationSeconds;
        if (durationA !== durationB) return durationA - durationB;

        return (a.result!.totalWrong) - (b.result!.totalWrong);
      });

    // Assign ranks
    return sorted.map((a, idx) => ({
      ...a,
      rank: idx + 1,
      rollNumber:
        a.student?.studentProfile?.rollNumber ||
        (a.student?.identifier && !a.student.identifier.includes('@') ? a.student.identifier : null) ||
        '-',
    }));
  }

  // ──────────────────────────────────────────────
  // Multi-Attempt History (doc 9.4: students may re-sit a test)
  // ──────────────────────────────────────────────

  async getTestAttempts(testId: string) {
    const attempts = await this.prisma.testAttempt.findMany({
      where: {
        testId,
        submittedAt: { not: null },
        student: {
          role: {
            name: { notIn: ['SUPER_ADMIN', 'ADMIN', 'BRANCH_ADMIN', 'TEACHER'] },
          },
        },
      },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            identifier: true,
            email: true,
            phone: true,
            studentProfile: { select: { rollNumber: true } },
          },
        },
        result: true,
      },
      orderBy: { submittedAt: 'asc' },
    });

    const byStudent = new Map<string, typeof attempts>();
    for (const a of attempts) {
      const arr = byStudent.get(a.studentId) ?? [];
      arr.push(a);
      byStudent.set(a.studentId, arr);
    }

    const students = Array.from(byStudent.entries()).map(([studentId, list]) => {
      const scored = list.filter((a) => a.result);
      const best = scored.reduce(
        (m, a) => (a.result!.totalScore > (m?.result?.totalScore ?? -Infinity) ? a : m),
        null as (typeof scored)[number] | null,
      );
      return {
        studentId,
        student: list[0].student,
        attemptCount: list.length,
        scoredCount: scored.length,
        bestScore: best ? best.result!.totalScore : null,
        bestPercentage: best ? best.result!.percentage : null,
        lastSubmittedAt: list[list.length - 1].submittedAt,
        attempts: list.map((a) => ({
          attemptId: a.id,
          attemptNumber: a.attemptNumber,
          startedAt: a.startedAt,
          submittedAt: a.submittedAt,
          durationSeconds: a.durationSeconds,
          cheatStrikes: a.cheatStrikes,
          isAutoSubmitted: a.isAutoSubmitted,
          score: a.result?.totalScore ?? null,
          correct: a.result?.totalCorrect ?? null,
          wrong: a.result?.totalWrong ?? null,
          unanswered: a.result?.totalUnanswered ?? null,
          percentage: a.result?.percentage ?? null,
          isPassed: a.result?.isPassed ?? null,
          rank: a.result?.rank ?? null,
        })),
      };
    });

    return { testId, studentCount: students.length, totalAttempts: attempts.length, students };
  }

  async getStudentAttempts(testId: string, studentId: string) {
    const attempts = await this.prisma.testAttempt.findMany({
      where: { testId, studentId, submittedAt: { not: null } },
      include: { result: true },
      orderBy: { submittedAt: 'asc' },
    });

    return {
      testId,
      attemptCount: attempts.length,
      attempts: attempts.map((a) => ({
        attemptId: a.id,
        attemptNumber: a.attemptNumber,
        startedAt: a.startedAt,
        submittedAt: a.submittedAt,
        durationSeconds: a.durationSeconds,
        cheatStrikes: a.cheatStrikes,
        isAutoSubmitted: a.isAutoSubmitted,
        score: a.result?.totalScore ?? null,
        correct: a.result?.totalCorrect ?? null,
        wrong: a.result?.totalWrong ?? null,
        unanswered: a.result?.totalUnanswered ?? null,
        percentage: a.result?.percentage ?? null,
        isPassed: a.result?.isPassed ?? null,
        rank: a.result?.rank ?? null,
      })),
    };
  }

  // ──────────────────────────────────────────────
  // Anti-Cheat Strike Recording (doc 9.5)
  // ──────────────────────────────────────────────

  async recordCheatStrike(attemptId: string) {
    const attempt = await this.prisma.testAttempt.findUnique({
      where: { id: attemptId },
      include: { test: { include: { config: true } } },
    });

    if (!attempt) {
      throw new NotFoundException('Attempt not found');
    }

    if (attempt.submittedAt) {
      throw new BadRequestException('Test already submitted');
    }

    const newStrikes = attempt.cheatStrikes + 1;
    const maxStrikes = attempt.test.config?.antiCheatLevel || 3;

    // If strikes reach max, auto-submit
    if (newStrikes >= maxStrikes) {
      await this.prisma.testAttempt.update({
        where: { id: attemptId },
        data: { cheatStrikes: newStrikes, isAutoSubmitted: true },
      });
      // Auto-submit the attempt
      const result = await this.submitAttempt(attemptId, attempt.studentId);
      return { strikes: newStrikes, maxStrikes, autoSubmitted: true, result };
    }

    await this.prisma.testAttempt.update({
      where: { id: attemptId },
      data: { cheatStrikes: newStrikes },
    });

    return { strikes: newStrikes, maxStrikes, autoSubmitted: false };
  }

  // ──────────────────────────────────────────────
  // Start Attempt (with Late-Join Shrinking Window — doc 9.4)
  // ──────────────────────────────────────────────

  async startAttempt(testId: string, studentId: string, roleCode?: string) {
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      include: { config: true },
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    const isAdminOrTeacher =
      roleCode === 'ADMIN' ||
      roleCode === 'SUPER_ADMIN' ||
      roleCode === 'BRANCH_ADMIN' ||
      roleCode === 'TEACHER';

    if (!test.isPublished && !isAdminOrTeacher) {
      throw new BadRequestException('This test is not published yet.');
    }

    const now = new Date();

    if (!isAdminOrTeacher) {
      // Status gating (draft / scheduled / closed) for regular students
      if (test.testStatus === 'DRAFT') {
        throw new BadRequestException('This test is still a draft and not yet available for taking.');
      }
      if (test.testStatus === 'CLOSED') {
        throw new BadRequestException('This test has been closed and can no longer be attempted.');
      }
      if (test.testStatus === 'SCHEDULED') {
        const openAt = test.publishAt ?? test.startDateTime;
        // Lazy auto-publish: if the scheduled publish time has passed, flip to LIVE
        if (openAt && now >= openAt && test.testStatus === 'SCHEDULED') {
          await this.prisma.test.update({
            where: { id: testId },
            data: { testStatus: 'LIVE', isPublished: true },
          });
          test.testStatus = 'LIVE';
          test.isPublished = true;
        } else if (openAt && now < openAt) {
          throw new BadRequestException('This test is scheduled and not yet open. Please wait until the scheduled start time.');
        }
      }

      // Check if test window has opened (only if test is not already marked LIVE)
      if (test.testStatus !== 'LIVE' && test.startDateTime && now < test.startDateTime) {
        throw new BadRequestException(
          `This test is not open yet. It starts at ${test.startDateTime.toLocaleString()}.`,
        );
      }
    }

    // Resume an in-progress attempt if one exists; otherwise start a NEW attempt
    // (multi-attempt support: students may re-sit a test, doc 9.4)
    const existingInProgress = await this.prisma.testAttempt.findFirst({
      where: { testId, studentId, submittedAt: null },
      include: { answers: true },
      orderBy: { startedAt: 'desc' },
    });

    type AttemptWithAnswers = NonNullable<
      Awaited<ReturnType<typeof this.prisma.testAttempt.findFirst<{ include: { answers: true } }>>>
    >;
    let attempt: AttemptWithAnswers;
    if (existingInProgress) {
      attempt = existingInProgress;
    } else {
      const priorAttempts = await this.prisma.testAttempt.count({
        where: { testId, studentId },
      });
      attempt = await this.prisma.testAttempt.create({
        data: {
          testId,
          studentId,
          attemptNumber: priorAttempts + 1,
          startedAt: now,
        },
        include: { answers: true },
      });
    }

    // Late-Join Shrinking Window Math (doc 9.4):
    // effectiveDuration = min(allocatedDuration, testEndTime - currentServerTime)
    const remainingSeconds = test.endDateTime ? Math.max(0, Math.floor((test.endDateTime.getTime() - now.getTime()) / 1000)) : 0;
    const allocatedSeconds = (test.durationMinutes || 60) * 60;
    const effectiveDurationSeconds = (isAdminOrTeacher || remainingSeconds <= 0)
      ? allocatedSeconds
      : Math.min(allocatedSeconds, remainingSeconds);
    const lastJoinAt = test.endDateTime ? new Date(test.endDateTime.getTime() - allocatedSeconds * 1000) : now;

    const testData = await this.prisma.test.findUnique({
      where: { id: testId },
      include: {
        config: true,
        sections: {
          include: {
            questions: {
              select: {
                id: true,
                sectionId: true,
                questionType: true,
                contentHtml: true,
                marksPositive: true,
                marksNegative: true,
                diagramUrl: true,
                sortOrder: true,
                options: {
                  select: {
                    id: true,
                    optionLabel: true,
                    contentHtml: true,
                    sortOrder: true,
                  },
                  orderBy: { sortOrder: 'asc' },
                },
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    const shuffledTest = this.applyExamShuffle(testData, test.config);

    return {
      attemptId: attempt.id,
      test: shuffledTest,
      effectiveDurationSeconds,
      lastJoinAt,
      startedAt: attempt.startedAt,
      existingAnswers: attempt.answers,
    };
  }

  private shuffleInPlace<T>(items: T[]): T[] {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  private applyExamShuffle<T extends { sections?: any[]; config?: any } | null>(
    testData: T,
    config: { shuffleQuestions?: boolean; shuffleOptions?: boolean } | null,
  ): T {
    if (!testData?.sections) return testData;
    return {
      ...testData,
      sections: testData.sections.map((sec: any) => {
        let questions = [...(sec.questions || [])];
        if (config?.shuffleQuestions) questions = this.shuffleInPlace(questions);
        if (config?.shuffleOptions) {
          questions = questions.map((q: any) => ({
            ...q,
            options: this.shuffleInPlace(q.options || []),
          }));
        }
        return { ...sec, questions };
      }),
    };
  }

  // ──────────────────────────────────────────────
  // Save Answer
  // ──────────────────────────────────────────────

  async saveAnswer(attemptId: string, data: { questionId: string; selectedOptionIds: string[]; isMarkedForReview?: boolean; timeSpentSeconds?: number }) {
    return this.prisma.attemptAnswer.upsert({
      where: {
        attemptId_questionId: {
          attemptId,
          questionId: data.questionId,
        },
      },
      update: {
        selectedOptionIds: data.selectedOptionIds,
        isMarkedForReview: data.isMarkedForReview ?? false,
        timeSpentSeconds: data.timeSpentSeconds ?? 0,
      },
      create: {
        attemptId,
        questionId: data.questionId,
        selectedOptionIds: data.selectedOptionIds,
        isMarkedForReview: data.isMarkedForReview ?? false,
        timeSpentSeconds: data.timeSpentSeconds ?? 0,
      },
    });
  }

  // ──────────────────────────────────────────────
  // Submit Attempt & Score (doc 19.1, 19.2, 19.3)
  // ──────────────────────────────────────────────

  async submitAttempt(attemptId: string, studentId: string) {
    const attempt = await this.prisma.testAttempt.findUnique({
      where: { id: attemptId },
      include: {
        test: {
          include: {
            config: true,
            sections: {
              include: {
                questions: {
                  include: { options: true },
                },
              },
            },
          },
        },
        answers: true,
      },
    });

    if (!attempt || attempt.studentId !== studentId) {
      throw new NotFoundException('Attempt not found');
    }

    if (attempt.submittedAt) {
      return this.prisma.testResult.findUnique({ where: { attemptId } });
    }

    // Server-side submit-unlock guard: a student may not submit before the configured
    // unlock delay has elapsed (auto-submits from anti-cheat / time expiry bypass this).
    const submitUnlockMins = attempt.test.config?.submitUnlockDelayMins ?? 0;
    const elapsedMins = (Date.now() - attempt.startedAt.getTime()) / 60000;
    if (!attempt.isAutoSubmitted && submitUnlockMins > 0 && elapsedMins < submitUnlockMins) {
      const remainingSec = Math.ceil(submitUnlockMins * 60 - elapsedMins * 60);
      throw new BadRequestException(
        `Submit is locked until ${submitUnlockMins} minute(s) have elapsed. You can submit in about ${remainingSec} second(s).`
      );
    }

    let totalScore = 0;
    let totalCorrect = 0;
    let totalWrong = 0;
    let totalUnanswered = 0;

    const allQuestions = attempt.test.sections.flatMap((s) => s.questions);
    const answersMap = new Map(attempt.answers.map((a) => [a.questionId, a]));

    const answerUpdates: any[] = [];

    for (const q of allQuestions) {
      const answer = answersMap.get(q.id);
      if (!answer || answer.selectedOptionIds.length === 0) {
        totalUnanswered++;
        if (answer) {
          answerUpdates.push(
            this.prisma.attemptAnswer.update({
              where: { id: answer.id },
              data: { awardedMarks: 0 },
            }),
          );
        }
        continue;
      }

      const correctOptionIds = q.options.filter((o) => o.isCorrect).map((o) => o.id);
      const selectedIds = answer.selectedOptionIds;

      let awardedMarks = 0;

      if (q.questionType === QuestionType.MULTIPLE_CORRECT) {
        const hasIncorrect = selectedIds.some((id) => !correctOptionIds.includes(id));

        if (hasIncorrect) {
          totalWrong++;
          awardedMarks = -q.marksNegative;
        } else {
          const correctChosen = selectedIds.filter((id) => correctOptionIds.includes(id)).length;
          if (correctChosen === correctOptionIds.length) {
            totalCorrect++;
            awardedMarks = q.marksPositive;
          } else {
            totalCorrect++;
            awardedMarks = Math.round(((correctChosen / correctOptionIds.length) * q.marksPositive) * 100) / 100;
          }
        }
      } else {
        const isExactMatch =
          correctOptionIds.length === selectedIds.length &&
          correctOptionIds.every((id) => selectedIds.includes(id));

        if (isExactMatch) {
          totalCorrect++;
          awardedMarks = q.marksPositive;
        } else {
          totalWrong++;
          awardedMarks = -q.marksNegative;
        }
      }

      totalScore += awardedMarks;

      answerUpdates.push(
        this.prisma.attemptAnswer.update({
          where: { id: answer.id },
          data: { awardedMarks },
        }),
      );
    }

    const maxMarks = attempt.test.totalMarks;
    const percentage = Math.round((Math.max(0, totalScore) / maxMarks) * 10000) / 100;
    const isPassed = totalScore >= attempt.test.passMarks;

    const submittedAt = new Date();
    const durationSeconds = Math.floor((submittedAt.getTime() - attempt.startedAt.getTime()) / 1000);

    const transactionOps = [
      ...answerUpdates,
      this.prisma.testAttempt.update({
        where: { id: attemptId },
        data: { submittedAt, durationSeconds },
      }),
      this.prisma.testResult.upsert({
        where: { attemptId },
        update: {
          totalScore,
          totalCorrect,
          totalWrong,
          totalUnanswered,
          percentage,
          isPassed,
          publishedAt: submittedAt,
        },
        create: {
          attemptId,
          totalScore,
          totalCorrect,
          totalWrong,
          totalUnanswered,
          percentage,
          isPassed,
          publishedAt: submittedAt,
        },
      }),
    ];

    const results = await this.prisma.$transaction(transactionOps);
    const result = results[results.length - 1];

    return result;
  }

  // ──────────────────────────────────────────────
  // Answer Key (SCR-STU-16)
  // ──────────────────────────────────────────────

  async getAnswerKey(testId: string, studentId?: string) {
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      include: {
        sections: {
          include: {
            questions: {
              include: {
                options: { orderBy: { sortOrder: 'asc' } },
                solution: true,
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    // Find student's latest submitted attempt if studentId is provided
    let latestAttempt: any = studentId
      ? await this.prisma.testAttempt.findFirst({
          where: {
            testId,
            studentId,
            submittedAt: { not: null },
          },
          include: {
            result: true,
            answers: true,
          },
          orderBy: { submittedAt: 'desc' },
        })
      : null;

    if (studentId && !latestAttempt) {
      // Check if user is staff / teacher / admin
      const user = await this.prisma.user.findUnique({
        where: { id: studentId },
        include: { role: true },
      });
      const isAdminOrTeacher = ['SUPER_ADMIN', 'ADMIN', 'BRANCH_ADMIN', 'TEACHER'].includes(user?.role?.name || '');
      if (!isAdminOrTeacher) {
        throw new ForbiddenException('You must complete and submit the test before viewing the answer key and solutions.');
      }
    }

    const answersMap = new Map(latestAttempt?.answers?.map((a: any) => [a.questionId, a]) || []);
    let questionNumber = 0;

    const answerKey = test.sections.flatMap((section) =>
      section.questions.map((q) => {
        questionNumber++;
        const answer: any = answersMap.get(q.id);
        const correctOpts = q.options.filter((o) => o.isCorrect);
        const correctLabels = correctOpts.map((o) => o.optionLabel).join(', ');
        const correctText = correctOpts.map((o) => `${o.optionLabel}. ${o.contentHtml.replace(/<[^>]*>?/gm, '')}`).join('; ');

        const selectedOptionIds = answer?.selectedOptionIds || [];
        const selectedOpts = q.options.filter((o) => selectedOptionIds.includes(o.id));
        const yourLabels = selectedOpts.map((o) => o.optionLabel).join(', ') || '—';
        const yourText = selectedOpts.map((o) => `${o.optionLabel}. ${o.contentHtml.replace(/<[^>]*>?/gm, '')}`).join('; ') || 'Unanswered';

        const hasAnswered = selectedOptionIds.length > 0;
        const isCorrect =
          hasAnswered &&
          correctOpts.length > 0 &&
          correctOpts.length === selectedOptionIds.length &&
          correctOpts.every((o) => selectedOptionIds.includes(o.id));

        let status = 'UNANSWERED';
        let awardedMarks = 0;
        if (hasAnswered) {
          if (isCorrect) {
            status = 'CORRECT';
            awardedMarks = q.marksPositive;
          } else {
            status = 'WRONG';
            awardedMarks = -q.marksNegative;
          }
        }

        return {
          id: q.id,
          questionId: q.id,
          questionNumber,
          sectionName: section.name,
          questionType: q.questionType,
          contentHtml: q.contentHtml,
          diagramUrl: q.diagramUrl,
          correctAnswer: correctLabels || 'A',
          correctAnswerText: correctText,
          yourAnswer: yourLabels,
          yourAnswerText: yourText,
          status,
          isCorrect,
          marks: q.marksPositive,
          negative: q.marksNegative,
          marksPositive: q.marksPositive,
          marksNegative: q.marksNegative,
          awardedMarks,
          selectedOptionIds,
          isMarkedForReview: answer?.isMarkedForReview || false,
          solution: q.solution,
          options: q.options.map((o) => ({
            ...o,
            isSelected: selectedOptionIds.includes(o.id),
          })),
        };
      }),
    );

    const totalCorrect = answerKey.filter((a) => a.status === 'CORRECT').length;
    const totalWrong = answerKey.filter((a) => a.status === 'WRONG').length;
    const totalUnanswered = answerKey.filter((a) => a.status === 'UNANSWERED').length;
    const totalScore = latestAttempt?.result?.totalScore ?? answerKey.reduce((sum, a) => sum + a.awardedMarks, 0);
    const percentage = latestAttempt?.result?.percentage ?? (test.totalMarks > 0 ? Math.round((Math.max(0, totalScore) / test.totalMarks) * 10000) / 100 : 0);

    return {
      test: {
        id: test.id,
        title: test.title,
        totalMarks: test.totalMarks,
        passMarks: test.passMarks,
        durationMinutes: test.durationMinutes,
      },
      attemptId: latestAttempt?.id || null,
      result: {
        totalScore,
        totalMarks: test.totalMarks,
        percentage,
        isPassed: latestAttempt?.result?.isPassed ?? (percentage >= (test.passMarks ? (test.passMarks / test.totalMarks) * 100 : 50)),
        totalCorrect,
        totalWrong,
        totalUnanswered,
        accuracy: (totalCorrect + totalWrong) > 0 ? Math.round((totalCorrect / (totalCorrect + totalWrong)) * 10000) / 100 : 0,
      },
      answerKey,
      questions: answerKey,
    };
  }

  // ──────────────────────────────────────────────
  // Check Answers with Solutions (SCR-STU-15)
  // ──────────────────────────────────────────────

  async getAttemptReview(attemptId: string) {
    const attempt = await this.prisma.testAttempt.findUnique({
      where: { id: attemptId },
      include: {
        result: true,
        answers: true,
        test: {
          include: {
            config: true,
            sections: {
              include: {
                questions: {
                  include: {
                    options: { orderBy: { sortOrder: 'asc' } },
                    solution: true,
                  },
                  orderBy: { sortOrder: 'asc' },
                },
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!attempt || !attempt.submittedAt) {
      throw new NotFoundException('Submitted attempt not found');
    }

    const answersMap = new Map(attempt.answers.map((a) => [a.questionId, a]));
    let questionNumber = 0;

    const reviewQuestions = attempt.test.sections.flatMap((section) =>
      section.questions.map((q) => {
        questionNumber++;
        const answer = answersMap.get(q.id);

        return {
          id: q.id,
          questionId: q.id,
          questionNumber,
          sectionName: section.name,
          questionType: q.questionType,
          contentHtml: q.contentHtml,
          diagramUrl: q.diagramUrl,
          marksPositive: q.marksPositive,
          marksNegative: q.marksNegative,
          options: q.options.map((o) => ({
            ...o,
            isSelected: answer?.selectedOptionIds.includes(o.id) || false,
          })),
          selectedOptionIds: answer?.selectedOptionIds || [],
          awardedMarks: answer?.awardedMarks ?? 0,
          isMarkedForReview: answer?.isMarkedForReview || false,
          timeSpentSeconds: answer?.timeSpentSeconds || 0,
          solution: q.solution,
        };
      }),
    );

    return {
      test: {
        id: attempt.test.id,
        title: attempt.test.title,
        totalMarks: attempt.test.totalMarks,
        passMarks: attempt.test.passMarks,
      },
      result: attempt.result,
      questions: reviewQuestions,
    };
  }

  // ──────────────────────────────────────────────
  // Test Analytics (SCR-ADM-16)
  // ──────────────────────────────────────────────

  async getTestAnalytics(testId: string) {
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      include: {
        config: true,
        sections: {
          include: {
            questions: {
              include: {
                options: true,
                attemptAnswers: true,
              },
            },
          },
        },
        attempts: {
          where: {
            submittedAt: { not: null },
            student: {
              role: {
                name: { notIn: ['SUPER_ADMIN', 'ADMIN', 'BRANCH_ADMIN', 'TEACHER'] },
              },
            },
          },
          include: { result: true },
        },
      },
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    const submittedAttempts = test.attempts.filter((a) => a.submittedAt && a.result);
    const totalAttempted = submittedAttempts.length;

    if (totalAttempted === 0) {
      return {
        test: { id: test.id, title: test.title, totalMarks: test.totalMarks },
        totalAttempted: 0,
        avgScore: 0,
        topScore: 0,
        scoreDistribution: [],
        subjectAccuracy: [],
        toughestQuestions: [],
        topStudents: [],
      };
    }

    // Average & top scores
    const scores = submittedAttempts.map((a) => a.result!.totalScore);
    const avgScore = Math.round((scores.reduce((s, v) => s + v, 0) / totalAttempted) * 100) / 100;
    const topScore = Math.max(...scores);

    // Score distribution (buckets of 10%)
    const bucketSize = test.totalMarks / 10;
    const distribution: { range: string; count: number }[] = [];
    for (let i = 0; i < 10; i++) {
      const low = Math.round(i * bucketSize);
      const high = Math.round((i + 1) * bucketSize);
      const count = scores.filter((s) => s >= low && (i === 9 ? s <= high : s < high)).length;
      distribution.push({ range: `${low}-${high}`, count });
    }

    // Subject-wise accuracy (by section)
    const subjectAccuracy = test.sections.map((section) => {
      const totalQs = section.questions.length;
      let correctCount = 0;
      let totalAnswered = 0;

      section.questions.forEach((q) => {
        const correctOptionIds = q.options.filter((o) => o.isCorrect).map((o) => o.id);
        q.attemptAnswers.forEach((ans) => {
          if (ans.selectedOptionIds.length > 0) {
            totalAnswered++;
            const isCorrect =
              correctOptionIds.length === ans.selectedOptionIds.length &&
              correctOptionIds.every((id) => ans.selectedOptionIds.includes(id));
            if (isCorrect) correctCount++;
          }
        });
      });

      return {
        sectionName: section.name,
        totalQuestions: totalQs,
        accuracy: totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 10000) / 100 : 0,
      };
    });

    // Toughest questions (lowest accuracy)
    const questionStats = test.sections.flatMap((section) =>
      section.questions.map((q) => {
        const correctOptionIds = q.options.filter((o) => o.isCorrect).map((o) => o.id);
        let correctCount = 0;
        let totalAnswered = 0;

        q.attemptAnswers.forEach((ans) => {
          if (ans.selectedOptionIds.length > 0) {
            totalAnswered++;
            const isCorrect =
              correctOptionIds.length === ans.selectedOptionIds.length &&
              correctOptionIds.every((id) => ans.selectedOptionIds.includes(id));
            if (isCorrect) correctCount++;
          }
        });

        return {
          questionId: q.id,
          sectionName: section.name,
          sortOrder: q.sortOrder,
          accuracy: totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 10000) / 100 : 0,
          totalAnswered,
        };
      }),
    );
    const toughestQuestions = [...questionStats].sort((a, b) => a.accuracy - b.accuracy).slice(0, 5);

    // Top 3 leaderboard
    const topStudents = submittedAttempts
      .filter((a) => a.result)
      .sort((a, b) => b.result!.totalScore - a.result!.totalScore)
      .slice(0, 3);

    const topStudentsWithNames = await Promise.all(
      topStudents.map(async (a) => {
        const student = await this.prisma.user.findUnique({
          where: { id: a.studentId },
          select: { fullName: true, identifier: true },
        });
        return {
          studentName: student?.fullName || 'Unknown',
          identifier: student?.identifier || '',
          score: a.result!.totalScore,
          percentage: a.result!.percentage,
        };
      }),
    );

    return {
      test: { id: test.id, title: test.title, totalMarks: test.totalMarks },
      totalAttempted,
      avgScore,
      topScore,
      scoreDistribution: distribution,
      subjectAccuracy,
      toughestQuestions,
      topStudents: topStudentsWithNames,
    };
  }

  // ──────────────────────────────────────────────
  // PDF / EXCEL EXPORT (doc: data download with header/footer, page numbers, timestamps)
  // ──────────────────────────────────────────────

  private static readonly PDF_FONTS = {
    Helvetica: {
      normal: 'Helvetica',
      bold: 'Helvetica-Bold',
      italics: 'Helvetica-Oblique',
      bolditalics: 'Helvetica-BoldOblique',
    },
  };

  private makePdf(docDefinition: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const PrinterClass = typeof PdfPrinter === 'function' ? PdfPrinter : PdfPrinter.default || require('pdfmake');
        const printer = new PrinterClass(TestsService.PDF_FONTS);
        const doc = printer.createPdfKitDocument(docDefinition);
        const chunks: Buffer[] = [];
        doc.on('data', (c: Buffer) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err: any) => reject(err));
        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  private fmtDate(d: Date | string | null | undefined): string {
    if (!d) return '-';
    return new Date(d).toLocaleString('en-IN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
  }

  private fmtDuration(sec: number | null | undefined): string {
    if (sec === null || sec === undefined) return '-';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  }

  private pdfWrapper(title: string, subtitle: string | undefined, body: any[]): any {
    return {
      pageSize: 'A4',
      pageMargins: [40, 70, 40, 60],
      content: [
        { text: title, style: 'title' },
        subtitle ? { text: subtitle, style: 'subtitle' } : {},
        { text: `Generated on: ${this.fmtDate(new Date())}`, style: 'meta' },
        body,
      ],
      styles: {
        title: { fontSize: 18, bold: true, margin: [0, 0, 0, 4] },
        subtitle: { fontSize: 12, margin: [0, 0, 0, 6], color: '#555555' },
        meta: { fontSize: 9, italic: true, color: '#888888', margin: [0, 0, 0, 10] },
        tableHeader: { fontSize: 10, bold: true, fillColor: '#2f54a0', color: '#ffffff' },
        tableCell: { fontSize: 9 },
        table: { margin: [0, 10, 0, 0] },
      },
      footer: (currentPage: number, pageCount: number) => ({ text: `Page ${currentPage} of ${pageCount}`, alignment: 'center', fontSize: 8, margin: [0, 10, 0, 0] }),
      header: { text: 'Examly - Multi-Tenant Exam Platform', alignment: 'right', fontSize: 8, color: '#888888', margin: [40, 15, 40, 0] },
      defaultStyle: { font: 'Helvetica' },
    };
  }

  async exportAttemptsPdf(testId: string): Promise<{ buffer: Buffer; filename: string }> {
    const data = await this.getTestAttempts(testId);
    const test = await this.prisma.test.findUnique({ where: { id: testId }, select: { title: true } });
    const rows = data.students.flatMap((s) =>
      s.attempts.map((a) => [
        s.student.fullName,
        s.student.studentProfile?.rollNumber || (s.student.identifier && !s.student.identifier.includes('@') ? s.student.identifier : null) || '-',
        String(a.attemptNumber),
        this.fmtDate(a.submittedAt),
        this.fmtDuration(a.durationSeconds),
        a.score ?? '-',
        a.percentage !== null && a.percentage !== undefined ? `${a.percentage}%` : '-',
        a.isPassed ? 'Yes' : 'No',
      ]),
    );
    const dd = this.pdfWrapper(
      'Attempts History Report',
      `Test: ${test?.title ?? testId} | ${data.studentCount} students, ${data.totalAttempts} attempts`,
      [
        {
          style: 'table',
          table: {
            headerRows: 1,
            widths: [130, 70, 55, 80, 70, 60, 60, 55],
            body: [
              ['Student Name', 'Roll No', 'Attempt', 'Submitted At', 'Duration', 'Score', '%', 'Passed'],
              ...rows,
            ],
          },
        },
      ],
    );
    return { buffer: await this.makePdf(dd), filename: `attempts-${testId}.pdf` };
  }

  async exportAttemptsExcel(testId: string): Promise<{ buffer: Buffer; filename: string }> {
    const data = await this.getTestAttempts(testId);
    const test = await this.prisma.test.findUnique({ where: { id: testId }, select: { title: true } });
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Examly';
    wb.created = new Date();
    const ws = wb.addWorksheet('Attempts History');
    ws.headerFooter = {
      oddHeader: '&CExamly - Attempts History Report',
      oddFooter: '&CPage &P of &N',
      evenFooter: '&CPage &P of &N',
    };
    ws.columns = [
      { header: 'Student Name', key: 'name', width: 24 },
      { header: 'Roll No', key: 'roll', width: 14 },
      { header: 'Attempt', key: 'attempt', width: 10 },
      { header: 'Submitted At', key: 'submitted', width: 20 },
      { header: 'Duration', key: 'duration', width: 14 },
      { header: 'Score', key: 'score', width: 10 },
      { header: 'Percentage', key: 'pct', width: 12 },
      { header: 'Passed', key: 'passed', width: 10 },
    ];
    for (const s of data.students) {
      const roll = s.student.studentProfile?.rollNumber || (s.student.identifier && !s.student.identifier.includes('@') ? s.student.identifier : null) || '-';
      for (const a of s.attempts) {
        ws.addRow({
          name: s.student.fullName,
          roll,
          attempt: a.attemptNumber,
          submitted: this.fmtDate(a.submittedAt),
          duration: this.fmtDuration(a.durationSeconds),
          score: a.score ?? '-',
          pct: a.percentage !== null && a.percentage !== undefined ? `${a.percentage}%` : '-',
          passed: a.isPassed ? 'Yes' : 'No',
        });
      }
    }
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F54A0' } };
    ws.autoFilter = { from: 'A1', to: 'H1' };
    const buf = (await wb.xlsx.writeBuffer()) as unknown as Buffer;
    return { buffer: buf, filename: `attempts-${testId}.xlsx` };
  }

  async exportLeaderboardPdf(testId: string): Promise<{ buffer: Buffer; filename: string }> {
    const data = await this.getAttemptsLeaderboard(testId);
    const test = await this.prisma.test.findUnique({ where: { id: testId }, select: { title: true } });
    const rows = data.map((a, i) => [
      String(i + 1),
      a.student.fullName || 'Student',
      a.rollNumber || a.student.studentProfile?.rollNumber || '-',
      a.result!.totalScore,
      a.result!.percentage + '%',
      a.result!.totalCorrect,
      a.result!.totalWrong,
      this.fmtDuration(a.durationSeconds),
    ]);
    const dd = this.pdfWrapper(
      'Leaderboard / Ranked Results',
      `Test: ${test?.title ?? testId}`,
      [
        {
          style: 'table',
          table: {
            headerRows: 1,
            widths: [35, 140, 70, 55, 55, 55, 55, 65],
            body: [
              ['Rank', 'Student', 'Roll No', 'Score', '%', 'Correct', 'Wrong', 'Duration'],
              ...rows,
            ],
          },
        },
      ],
    );
    return { buffer: await this.makePdf(dd), filename: `leaderboard-${testId}.pdf` };
  }

  async exportLeaderboardExcel(testId: string): Promise<{ buffer: Buffer; filename: string }> {
    const data = await this.getAttemptsLeaderboard(testId);
    const test = await this.prisma.test.findUnique({ where: { id: testId }, select: { title: true } });
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Examly';
    wb.created = new Date();
    const ws = wb.addWorksheet('Leaderboard');
    ws.headerFooter = { oddHeader: '&CExamly - Leaderboard', oddFooter: '&CPage &P of &N' };
    ws.columns = [
      { header: 'Rank', key: 'rank', width: 8 },
      { header: 'Student', key: 'name', width: 24 },
      { header: 'Roll No', key: 'roll', width: 14 },
      { header: 'Score', key: 'score', width: 10 },
      { header: 'Percentage', key: 'pct', width: 12 },
      { header: 'Correct', key: 'correct', width: 10 },
      { header: 'Wrong', key: 'wrong', width: 10 },
      { header: 'Duration', key: 'duration', width: 14 },
    ];
    data.forEach((a, i) => ws.addRow({
      rank: i + 1,
      name: a.student.fullName || 'Student',
      roll: a.rollNumber || a.student.studentProfile?.rollNumber || '-',
      score: a.result!.totalScore,
      pct: a.result!.percentage + '%',
      correct: a.result!.totalCorrect,
      wrong: a.result!.totalWrong,
      duration: this.fmtDuration(a.durationSeconds),
    }));
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F54A0' } };
    ws.autoFilter = { from: 'A1', to: 'H1' };
    const buf = (await wb.xlsx.writeBuffer()) as unknown as Buffer;
    return { buffer: buf, filename: `leaderboard-${testId}.xlsx` };
  }

  async exportAnswerKeyPdf(testId: string, studentId: string): Promise<{ buffer: Buffer; filename: string }> {
    const data = await this.getAnswerKey(testId, studentId);
    const rows = data.answerKey.map((q) => [
      String(q.questionNumber),
      q.sectionName,
      q.correctAnswer,
      q.yourAnswer,
      q.status,
      q.marks,
      q.negative,
    ]);
    const dd = this.pdfWrapper(
      'Answer Key & Score Table',
      `Test: ${data.test.title} | Total Marks: ${data.test.totalMarks} | Scored: ${data.result?.totalScore ?? 0}`,
      [
        {
          style: 'table',
          table: {
            headerRows: 1,
            widths: [36, 80, 90, 90, 70, 55, 55],
            body: [
              ['Q#', 'Section', 'Correct Answer', 'Your Answer', 'Status', 'Marks', 'Negative'],
              ...rows,
            ],
          },
        },
      ],
    );
    return { buffer: await this.makePdf(dd), filename: `answer-key-${testId}.pdf` };
  }

  async exportAnswerKeyExcel(testId: string, studentId: string): Promise<{ buffer: Buffer; filename: string }> {
    const data = await this.getAnswerKey(testId, studentId);
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Examly';
    wb.created = new Date();
    const ws = wb.addWorksheet('Answer Key');
    ws.headerFooter = { oddHeader: '&CExamly - Answer Key', oddFooter: '&CPage &P of &N' };
    ws.columns = [
      { header: 'Q#', key: 'q', width: 6 },
      { header: 'Section', key: 'section', width: 18 },
      { header: 'Correct Answer', key: 'correct', width: 24 },
      { header: 'Your Answer', key: 'yours', width: 24 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Marks', key: 'marks', width: 8 },
      { header: 'Negative', key: 'negative', width: 8 },
    ];
    for (const q of data.answerKey) {
      ws.addRow({ q: q.questionNumber, section: q.sectionName, correct: q.correctAnswer, yours: q.yourAnswer, status: q.status, marks: q.marks, negative: q.negative });
    }
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F54A0' } };
    ws.autoFilter = { from: 'A1', to: 'G1' };
    const buf = (await wb.xlsx.writeBuffer()) as unknown as Buffer;
    return { buffer: buf, filename: `answer-key-${testId}.xlsx` };
  }
}
