// apps/api/src/modules/test-engine/tests.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { RecordStatus, TestType, QuestionType, ResultPublishMode } from '@prisma/client';

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

    return test;
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

    return this.prisma.test.create({
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
        startDateTime: data.startDateTime ? new Date(data.startDateTime) : new Date(),
        endDateTime: data.endDateTime ? new Date(data.endDateTime) : new Date(Date.now() + 86400000),
        isPublished: data.isPublished || false,
        status: RecordStatus.ACTIVE,
        config: {
          create: {
            antiCheatLevel: data.antiCheatLevel || 3,
            allowLateJoin: data.allowLateJoin ?? true,
            lateJoinGraceMins: data.lateJoinGraceMinutes || 30,
            shuffleQuestions: data.shuffleQuestions ?? true,
            shuffleOptions: data.shuffleOptions ?? true,
            publishMode: data.resultPublishMode || ResultPublishMode.AFTER_TEST_END,
            submitUnlockDelayMins: data.submitUnlockMinutes || 5,
            questionsPerScreen: data.questionsPerScreen || 1,
          },
        },
        sections: {
          create: [
            {
              name: data.sectionTitle || 'General Section',
              sortOrder: 1,
            },
          ],
        },
      },
      include: {
        config: true,
        sections: true,
      },
    });
  }

  async update(id: string, instituteId: string | undefined, data: any) {
    await this.findOne(id, instituteId);

    // Update main test fields
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
        isPublished: data.isPublished,
        status: data.status,
      },
    });

    // Update config if config fields provided
    if (data.shuffleQuestions !== undefined || data.shuffleOptions !== undefined ||
        data.antiCheatLevel !== undefined || data.submitUnlockMinutes !== undefined ||
        data.questionsPerScreen !== undefined || data.resultPublishMode !== undefined) {
      await this.prisma.testConfig.upsert({
        where: { testId: id },
        update: {
          ...(data.shuffleQuestions !== undefined && { shuffleQuestions: data.shuffleQuestions }),
          ...(data.shuffleOptions !== undefined && { shuffleOptions: data.shuffleOptions }),
          ...(data.antiCheatLevel !== undefined && { antiCheatLevel: data.antiCheatLevel }),
          ...(data.submitUnlockMinutes !== undefined && { submitUnlockDelayMins: data.submitUnlockMinutes }),
          ...(data.questionsPerScreen !== undefined && { questionsPerScreen: data.questionsPerScreen }),
          ...(data.resultPublishMode !== undefined && { publishMode: data.resultPublishMode }),
        },
        create: {
          testId: id,
          shuffleQuestions: data.shuffleQuestions ?? true,
          shuffleOptions: data.shuffleOptions ?? true,
          antiCheatLevel: data.antiCheatLevel ?? 3,
          submitUnlockDelayMins: data.submitUnlockMinutes ?? 5,
          questionsPerScreen: data.questionsPerScreen ?? 1,
          publishMode: data.resultPublishMode || ResultPublishMode.AFTER_TEST_END,
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
    return this.prisma.test.update({
      where: { id },
      data: { isPublished: !test.isPublished },
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
    if (!sectionId) {
      const firstSection = await this.prisma.section.findFirst({ where: { testId } });
      if (!firstSection) {
        const newSec = await this.prisma.section.create({
          data: { testId, name: 'General Section', sortOrder: 1 },
        });
        sectionId = newSec.id;
      } else {
        sectionId = firstSection.id;
      }
    }

    const questionCount = await this.prisma.question.count({ where: { sectionId } });

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
        marksPositive: data.marksPositive || 4,
        marksNegative: data.marksNegative || 1,
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
  }[]) {
    const results = [];
    for (const q of questions) {
      const result = await this.addQuestion(testId, {
        sectionId: q.sectionId,
        questionType: (q.questionType as QuestionType) || QuestionType.SINGLE_CORRECT,
        contentHtml: q.contentHtml,
        marksPositive: q.marksPositive || 4,
        marksNegative: q.marksNegative || 1,
        options: q.options,
        solutionText: q.solutionText,
      });
      results.push(result);
    }
    return { imported: results.length, questions: results };
  }

  // ──────────────────────────────────────────────
  // Leaderboard with Tiebreaker (doc 9.6.2)
  // ──────────────────────────────────────────────

  async getAttemptsLeaderboard(testId: string) {
    const attempts = await this.prisma.testAttempt.findMany({
      where: { testId, submittedAt: { not: null } },
      include: {
        student: { select: { fullName: true, identifier: true, phone: true } },
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
    }));
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

  async startAttempt(testId: string, studentId: string) {
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      include: { config: true },
    });

    if (!test || !test.isPublished) {
      throw new NotFoundException('Test not found or not published');
    }

    const now = new Date();

    // Check if test window has closed
    if (now > test.endDateTime) {
      throw new BadRequestException('Test window has closed');
    }

    // Check existing attempt
    let attempt = await this.prisma.testAttempt.findFirst({
      where: { testId, studentId },
      include: { answers: true },
    });

    if (attempt && attempt.submittedAt) {
      throw new BadRequestException('You have already submitted this test');
    }

    if (!attempt) {
      attempt = await this.prisma.testAttempt.create({
        data: {
          testId,
          studentId,
          startedAt: now,
        },
        include: { answers: true },
      });
    }

    // Late-Join Shrinking Window Math (doc 9.4):
    // effectiveDuration = min(allocatedDuration, testEndTime - currentServerTime)
    const remainingSeconds = Math.max(0, Math.floor((test.endDateTime.getTime() - now.getTime()) / 1000));
    const allocatedSeconds = test.durationMinutes * 60;
    const effectiveDurationSeconds = Math.min(allocatedSeconds, remainingSeconds);

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

    return {
      attemptId: attempt.id,
      test: testData,
      effectiveDurationSeconds,
      startedAt: attempt.startedAt,
      existingAnswers: attempt.answers,
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

    let totalScore = 0;
    let totalCorrect = 0;
    let totalWrong = 0;
    let totalUnanswered = 0;

    const allQuestions = attempt.test.sections.flatMap((s) => s.questions);
    const answersMap = new Map(attempt.answers.map((a) => [a.questionId, a]));

    for (const q of allQuestions) {
      const answer = answersMap.get(q.id);
      if (!answer || answer.selectedOptionIds.length === 0) {
        totalUnanswered++;
        // Update awarded marks for unanswered
        if (answer) {
          await this.prisma.attemptAnswer.update({
            where: { id: answer.id },
            data: { awardedMarks: 0 },
          });
        }
        continue;
      }

      const correctOptionIds = q.options.filter((o) => o.isCorrect).map((o) => o.id);
      const selectedIds = answer.selectedOptionIds;

      let awardedMarks = 0;

      if (q.questionType === QuestionType.MULTIPLE_CORRECT) {
        // Partial Marking for Multiple-Correct MCQs (doc 19.2):
        // - If ANY incorrect option is chosen → -M
        // - If ALL correct options chosen and NO incorrect → +P
        // - If partial correct options chosen and NO incorrect → (chosen/total) * P
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
            // Partial credit: (correctChosen / totalCorrect) * positiveMarks
            totalCorrect++;
            awardedMarks = Math.round(((correctChosen / correctOptionIds.length) * q.marksPositive) * 100) / 100;
          }
        }
      } else {
        // Standard exact-match evaluation for SINGLE_CORRECT and other types
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

      // Store per-question awarded marks
      await this.prisma.attemptAnswer.update({
        where: { id: answer.id },
        data: { awardedMarks },
      });
    }

    const maxMarks = attempt.test.totalMarks;
    const percentage = Math.round((Math.max(0, totalScore) / maxMarks) * 10000) / 100;
    const isPassed = totalScore >= attempt.test.passMarks;

    const submittedAt = new Date();
    const durationSeconds = Math.floor((submittedAt.getTime() - attempt.startedAt.getTime()) / 1000);

    const [_, result] = await this.prisma.$transaction([
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
    ]);

    return result;
  }

  // ──────────────────────────────────────────────
  // Answer Key (SCR-STU-16)
  // ──────────────────────────────────────────────

  async getAnswerKey(testId: string, studentId: string) {
    const attempt = await this.prisma.testAttempt.findFirst({
      where: { testId, studentId, submittedAt: { not: null } },
      include: {
        result: true,
        answers: true,
        test: {
          include: {
            sections: {
              include: {
                questions: {
                  include: {
                    options: { orderBy: { sortOrder: 'asc' } },
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

    if (!attempt) {
      throw new NotFoundException('No submitted attempt found for this test');
    }

    const answersMap = new Map(attempt.answers.map((a) => [a.questionId, a]));
    let questionNumber = 0;

    const answerKey = attempt.test.sections.flatMap((section) =>
      section.questions.map((q) => {
        questionNumber++;
        const answer = answersMap.get(q.id);
        const correctOptions = q.options.filter((o) => o.isCorrect);
        const correctLabels = correctOptions.map((o) => o.optionLabel).join(', ');

        let yourAnswer = '-';
        let status: 'CORRECT' | 'WRONG' | 'UNANSWERED' = 'UNANSWERED';
        let marks = 0;
        let negative = 0;

        if (answer && answer.selectedOptionIds.length > 0) {
          const selectedOptions = q.options.filter((o) => answer.selectedOptionIds.includes(o.id));
          yourAnswer = selectedOptions.map((o) => o.optionLabel).join(', ');

          if (answer.awardedMarks !== null && answer.awardedMarks > 0) {
            status = 'CORRECT';
            marks = answer.awardedMarks;
          } else if (answer.awardedMarks !== null && answer.awardedMarks < 0) {
            status = 'WRONG';
            negative = answer.awardedMarks;
          } else {
            // Check manually
            const correctIds = correctOptions.map((o) => o.id);
            const isCorrect = correctIds.length === answer.selectedOptionIds.length &&
              correctIds.every((id) => answer.selectedOptionIds.includes(id));
            status = isCorrect ? 'CORRECT' : 'WRONG';
            marks = isCorrect ? q.marksPositive : 0;
            negative = isCorrect ? 0 : -q.marksNegative;
          }
        }

        return {
          questionNumber,
          questionId: q.id,
          sectionName: section.name,
          correctAnswer: correctLabels,
          yourAnswer,
          status,
          marks,
          negative,
          timeSpentSeconds: answer?.timeSpentSeconds || 0,
        };
      }),
    );

    return {
      test: {
        id: attempt.test.id,
        title: attempt.test.title,
        totalMarks: attempt.test.totalMarks,
      },
      result: attempt.result,
      answerKey,
      scoreBreakdown: {
        totalQuestions: answerKey.length,
        totalCorrect: attempt.result?.totalCorrect || 0,
        totalWrong: attempt.result?.totalWrong || 0,
        totalUnanswered: attempt.result?.totalUnanswered || 0,
        totalScore: attempt.result?.totalScore || 0,
        maxMarks: attempt.test.totalMarks,
        percentage: attempt.result?.percentage || 0,
        isPassed: attempt.result?.isPassed || false,
      },
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
          questionNumber,
          questionId: q.id,
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
          where: { submittedAt: { not: null } },
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
}
