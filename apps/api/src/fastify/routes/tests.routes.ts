// apps/api/src/fastify/routes/tests.routes.ts
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { requirePermission } from '../plugins/rbac.plugin';
import { RecordStatus, RoleType } from '@prisma/client';
import { installTestAccess, resultVisible } from './test-access';

const TestQuerySchema = z.object({
  batchId: z.string().optional(),
  subjectId: z.string().optional(),
  status: z.nativeEnum(RecordStatus).optional(),
});

const OptionSchema = z.object({ optionLabel: z.string().min(1).max(10), contentHtml: z.string().min(1), isCorrect: z.boolean() });
const QuestionSchema = z.object({ sectionId: z.string().optional(), questionType: z.string().optional(), contentHtml: z.string().min(1), diagramUrl: z.string().url().optional(), marksPositive: z.coerce.number().min(0).default(4), marksNegative: z.coerce.number().min(0).default(1), options: z.array(OptionSchema).min(2), hint: z.string().optional(), shortExplanation: z.string().optional(), stepByStepSolution: z.string().optional() });
const CreateTestSchema = z.object({ title: z.string().min(1).max(250), description: z.string().optional(), batchId: z.string().optional(), subjectId: z.string().optional(), lessonId: z.string().optional(), testType: z.enum(['BATCH_LEVEL', 'SUBJECT_LEVEL', 'LESSON_LEVEL']).default('BATCH_LEVEL'), totalMarks: z.coerce.number().positive(), passMarks: z.coerce.number().min(0), negativeMarkRate: z.coerce.number().min(0).optional(), durationMinutes: z.coerce.number().int().positive(), startDateTime: z.string().datetime(), endDateTime: z.string().datetime(), isPublished: z.boolean().optional(), publishAction: z.enum(['DRAFT','INSTANT','SCHEDULED']).optional(), antiCheatLevel: z.coerce.number().int().min(0).optional(), shuffleQuestions: z.boolean().optional(), shuffleOptions: z.boolean().optional(), resultPublishMode: z.enum(['IMMEDIATE', 'AFTER_TEST_END', 'MANUAL_BY_ADMIN', 'SCHEDULED']).optional(), publishAt: z.string().datetime().optional(), submitUnlockMinutes: z.coerce.number().int().min(0).optional(), questionsPerScreen: z.coerce.number().int().positive().optional(), oneQuestionAtATime: z.boolean().optional(), totalQuestions: z.coerce.number().int().positive().optional(), optionsCount: z.coerce.number().int().min(2).optional(), correctAnswerType: z.enum(['SINGLE', 'MULTIPLE']).optional(), defaultPositiveMarks: z.coerce.number().min(0).optional(), defaultNegativeMarks: z.coerce.number().min(0).optional(), sections: z.array(z.object({ id: z.string().optional(), name: z.string().min(1), sortOrder: z.coerce.number().optional() })).min(1), questions: z.array(QuestionSchema).default([]) });

export const testsRoutes: FastifyPluginAsync = async (fastify) => {
  installTestAccess(fastify);
  fastify.put('/api/v1/tests/:id/config',{preHandler:[fastify.authenticate,requirePermission('tests','update')]},async(request,reply)=>{
    const {id}=request.params as {id:string};const test=(request as any).examlyTest;
    if(test._count.attempts)return reply.code(409).send({message:'Engine settings are locked after attempts begin'});
    const p=z.object({shuffleQuestions:z.boolean(),shuffleOptions:z.boolean(),allowLateJoin:z.boolean(),lateJoinGraceMins:z.number().int().min(0).max(1440),antiCheatLevel:z.number().int().min(0).max(20),submitUnlockDelayMins:z.number().int().min(0),questionsPerScreen:z.number().int().min(1).max(100),oneQuestionAtATime:z.boolean(),publishMode:z.enum(['IMMEDIATE','AFTER_TEST_END','MANUAL_BY_ADMIN','SCHEDULED']),publishDateTime:z.string().datetime().nullable().optional()}).safeParse(request.body);
    if(!p.success)return reply.code(400).send({message:'Invalid engine settings'});
    if(p.data.submitUnlockDelayMins>test.durationMinutes)return reply.code(400).send({message:'Submit lock exceeds test duration'});
    if(p.data.publishMode==='SCHEDULED'&&!p.data.publishDateTime)return reply.code(400).send({message:'Choose the result release date'});
    const data={...p.data,publishDateTime:p.data.publishDateTime?new Date(p.data.publishDateTime):null};return fastify.prisma.testConfig.upsert({where:{testId:id},create:{...data,testId:id},update:data});
  });
  fastify.post('/api/v1/tests/:id/release-results',{preHandler:[fastify.authenticate,requirePermission('tests','publish')]},async(request)=>{
    const {id}=request.params as {id:string};await fastify.prisma.testResult.updateMany({where:{attempt:{testId:id,submittedAt:{not:null}}},data:{publishedAt:new Date()}});return {success:true};
  });
  fastify.post('/api/v1/tests', { preHandler: [fastify.authenticate, requirePermission('tests', 'create')] }, async (request, reply) => {
    const parsed = CreateTestSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ statusCode: 400, message: 'Invalid test data', errors: parsed.error.format() });
    const data = parsed.data; const user = request.user!;
    if (new Date(data.endDateTime) <= new Date(data.startDateTime)) return reply.status(400).send({ statusCode: 400, message: 'Test end time must be after start time' });
    data.batchId = data.batchId || undefined; data.subjectId = data.subjectId || undefined; data.lessonId = data.lessonId || undefined;
    let subject: any = data.subjectId ? await fastify.prisma.subject.findFirst({where:{id:data.subjectId,status:{not:RecordStatus.DELETED}},include:{batch:true}}) : null;
    if(data.lessonId){const lesson=await fastify.prisma.lesson.findFirst({where:{id:data.lessonId,status:{not:RecordStatus.DELETED}},include:{subject:{include:{batch:true}}}});if(!lesson || (data.subjectId&&data.subjectId!==lesson.subjectId))return reply.code(400).send({message:'Lesson and subject do not match'});subject=lesson.subject;data.subjectId=subject.id;}
    const batch = data.batchId ? await fastify.prisma.batch.findFirst({where:{id:data.batchId,status:{not:RecordStatus.DELETED}}}) : subject?.batch;
    if((data.subjectId&&!subject)||(data.batchId&&!batch))return reply.code(400).send({message:'Test scope is inconsistent'});
    if(subject && data.batchId && subject.batchId && subject.batchId !== data.batchId) {
      const batchSubject = await fastify.prisma.subject.findFirst({where:{batchId:data.batchId,OR:[{id:subject.id},{copiedFromId:subject.id}],status:{not:RecordStatus.DELETED}},include:{batch:true}});
      if(batchSubject) {
        data.subjectId = batchSubject.id;
        subject = batchSubject;
      } else {
        return reply.code(400).send({message:'Selected subject does not belong to the selected batch'});
      }
    }
    const instituteId = batch?.instituteId || subject?.instituteId || user.instituteId;
    if(user.roleCode!==RoleType.SUPER_ADMIN&&instituteId!==user.instituteId)return reply.code(403).send({message:'Test scope is outside your institute'});
    if(data.testType==='LESSON_LEVEL'&&!data.lessonId||data.testType==='SUBJECT_LEVEL'&&!subject||data.testType==='BATCH_LEVEL'&&!batch)return reply.code(400).send({message:'Select the required test scope'});
    data.batchId=batch?.id;
    if(data.passMarks>data.totalMarks)return reply.code(400).send({message:'Pass marks exceed total marks'});
    if(data.isPublished&&!data.questions.length)return reply.code(400).send({message:'Add questions before publishing'});
    for(const q of data.questions){const correct=q.options.filter(o=>o.isCorrect).length;if(!['SINGLE_CORRECT','MULTIPLE_CORRECT','TRUE_FALSE','ASSERTION_REASON'].includes(q.questionType||'SINGLE_CORRECT')||!correct||(q.questionType!=='MULTIPLE_CORRECT'&&correct!==1))return reply.code(400).send({message:'Use a supported choice question type with a valid answer key'});}
    if (!instituteId) return reply.status(400).send({ statusCode: 400, message: 'Institute context required' });
    const test = await fastify.prisma.$transaction(async (tx) => {
      const created = await tx.test.create({ data: { instituteId, title: data.title, description: data.description, batchId: data.batchId, subjectId: data.subjectId, lessonId: data.lessonId, testType: data.testType, totalMarks: data.totalMarks, passMarks: data.passMarks, negativeMarkRate: data.negativeMarkRate ?? 1, durationMinutes: data.durationMinutes, startDateTime: new Date(data.startDateTime), endDateTime: new Date(data.endDateTime), isPublished: data.isPublished || data.publishAction === 'SCHEDULED', publishAt: data.publishAction === 'SCHEDULED' ? new Date(data.publishAt || data.startDateTime) : null, testStatus: data.publishAction === 'SCHEDULED' ? 'SCHEDULED' : data.isPublished ? 'LIVE' : 'DRAFT', status: RecordStatus.ACTIVE } });
      const sections = await Promise.all(data.sections.map((section, index) => tx.section.create({ data: { testId: created.id, name: section.name, sortOrder: section.sortOrder ?? index } })));
      const sectionByClientId = new Map(data.sections.map((section, index) => [section.id, sections[index]]));
      await tx.testConfig.create({ data: { testId: created.id, antiCheatLevel: data.antiCheatLevel ?? 3, shuffleQuestions: data.shuffleQuestions ?? true, shuffleOptions: data.shuffleOptions ?? true, publishMode: data.resultPublishMode ?? 'AFTER_TEST_END', publishDateTime: data.publishAt ? new Date(data.publishAt) : undefined, submitUnlockDelayMins: data.submitUnlockMinutes ?? 5, questionsPerScreen: data.questionsPerScreen ?? 1, oneQuestionAtATime: data.oneQuestionAtATime ?? true, totalQuestions: data.totalQuestions, optionsCount: data.optionsCount ?? 4, correctAnswerType: data.correctAnswerType ?? 'SINGLE', defaultPositiveMarks: data.defaultPositiveMarks ?? 4, defaultNegativeMarks: data.defaultNegativeMarks ?? 1 } });
      for (const question of data.questions) {
        const section = question.sectionId ? sectionByClientId.get(question.sectionId) : sections[0];
        if (!section) throw new Error('Question section does not belong to this new test');
        await tx.question.create({ data: { sectionId: section.id, questionType: question.questionType as any || 'SINGLE_CORRECT', contentHtml: question.contentHtml, diagramUrl: question.diagramUrl, marksPositive: question.marksPositive, marksNegative: question.marksNegative, options: { create: question.options.map((option, index) => ({ ...option, sortOrder: index })) }, ...(question.hint || question.shortExplanation || question.stepByStepSolution ? { solution: { create: { hintHtml: question.hint, shortExplanation: question.shortExplanation, stepByStepHtml: question.stepByStepSolution } } } : {}) } });
      }
      return tx.test.findUniqueOrThrow({ where: { id: created.id }, include: { config: true, sections: { include: { questions: { include: { options: true, solution: true } } } } } });
    }, { timeout: 20_000 });
    return reply.status(201).send(test);
  });

  fastify.post('/api/v1/tests/:id/publish', { preHandler: [fastify.authenticate, requirePermission('tests', 'publish')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const test = await fastify.prisma.test.findUnique({ where: { id }, select: { id: true, sections: { select: { questions: { select: { id: true } } } } } });
    if (!test) return reply.status(404).send({ statusCode: 404, message: 'Test not found' });
    if (!test.sections.some((section) => section.questions.length > 0)) return reply.status(400).send({ statusCode: 400, message: 'A test needs at least one question before publishing' });
    return fastify.prisma.test.update({ where: { id }, data: { isPublished: true, testStatus: 'LIVE' } });
  });

  fastify.post('/api/v1/tests/:id/sections', { preHandler: [fastify.authenticate, requirePermission('tests', 'update')] }, async (request, reply) => {
    const body = z.object({ name: z.string().min(1).max(150) }).safeParse(request.body); if (!body.success) return reply.status(400).send({ statusCode: 400, message: 'Invalid section' }); const { id } = request.params as { id: string };
    if (!await fastify.prisma.test.findUnique({ where: { id }, select: { id: true } })) return reply.status(404).send({ statusCode: 404, message: 'Test not found' }); const sortOrder = await fastify.prisma.section.count({ where: { testId: id } }); return reply.status(201).send(await fastify.prisma.section.create({ data: { testId: id, name: body.data.name, sortOrder } }));
  });

  fastify.post('/api/v1/tests/:id/questions', { preHandler: [fastify.authenticate, requirePermission('questions', 'create')] }, async (request, reply) => {
    const body = QuestionSchema.safeParse(request.body); if (!body.success || !body.data.sectionId) return reply.status(400).send({ statusCode: 400, message: 'Invalid question data' }); const { id } = request.params as { id: string };
    const section = await fastify.prisma.section.findFirst({ where: { id: body.data.sectionId, testId: id }, select: { id: true } }); if (!section) return reply.status(400).send({ statusCode: 400, message: 'Section does not belong to test' });
    const sortOrder = await fastify.prisma.question.count({ where: { sectionId: section.id } }); return reply.status(201).send(await fastify.prisma.question.create({ data: { sectionId: section.id, questionType: body.data.questionType as any || 'SINGLE_CORRECT', contentHtml: body.data.contentHtml, marksPositive: body.data.marksPositive, marksNegative: body.data.marksNegative, sortOrder, options: { create: body.data.options.map((option, index) => ({ ...option, sortOrder: index })) }, ...(body.data.hint || body.data.shortExplanation || body.data.stepByStepSolution ? { solution: { create: { hintHtml: body.data.hint, shortExplanation: body.data.shortExplanation, stepByStepHtml: body.data.stepByStepSolution } } } : {}) }, include: { options: true, solution: true } }));
  });

  fastify.put('/api/v1/tests/:id', { preHandler: [fastify.authenticate, requirePermission('tests', 'update')] }, async (request, reply) => {
    const body = z.object({ title: z.string().min(1).max(250).optional(), description: z.string().optional(), totalMarks: z.coerce.number().positive().optional(), passMarks: z.coerce.number().min(0).optional(), durationMinutes: z.coerce.number().int().positive().optional(), negativeMarkRate: z.coerce.number().min(0).optional(), startDateTime: z.string().datetime().optional(), endDateTime: z.string().datetime().optional() }).safeParse(request.body);
    if (!body.success) return reply.status(400).send({ statusCode: 400, message: 'Invalid test update', errors: body.error.format() }); const { id } = request.params as { id: string };
    const existing = await fastify.prisma.test.findUnique({ where: { id }, select: { id: true, startDateTime: true, endDateTime: true } }); if (!existing) return reply.status(404).send({ statusCode: 404, message: 'Test not found' });
    const start = body.data.startDateTime ? new Date(body.data.startDateTime) : existing.startDateTime; const end = body.data.endDateTime ? new Date(body.data.endDateTime) : existing.endDateTime; if (end <= start) return reply.status(400).send({ statusCode: 400, message: 'Test end time must be after start time' });
    return fastify.prisma.test.update({ where: { id }, data: { ...body.data, startDateTime: body.data.startDateTime ? start : undefined, endDateTime: body.data.endDateTime ? end : undefined } });
  });

  // PUT /api/v1/tests/:id/full (Complete 4-Step Test Edit)
  fastify.put(
    '/api/v1/tests/:id/full',
    {
      preHandler: [fastify.authenticate, requirePermission('tests', 'update')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;

      const existing = await fastify.prisma.test.findFirst({
        where: {
          id,
          status: { not: RecordStatus.DELETED },
          ...(user.roleCode === RoleType.SUPER_ADMIN ? {} : { instituteId: user.instituteId || '__none__' }),
        },
        include: { _count: { select: { attempts: true } } },
      });

      if (!existing) {
        return reply.status(404).send({ statusCode: 404, message: 'Test not found' });
      }

      const body = request.body as any;
      const {
        title,
        description,
        totalMarks,
        passMarks,
        durationMinutes,
        negativeMarkRate,
        startDateTime,
        endDateTime,
        batchId,
        subjectId,
        lessonId,
        testType,
        isPublished,
        testStatus,
        config,
        sections = [],
        questions = [],
      } = body;

      const start = startDateTime ? new Date(startDateTime) : existing.startDateTime;
      const end = endDateTime ? new Date(endDateTime) : existing.endDateTime;

      await fastify.prisma.$transaction(async (tx) => {
        // 1. Update Test fields
        await tx.test.update({
          where: { id },
          data: {
            title: title || undefined,
            description: description !== undefined ? description : undefined,
            totalMarks: totalMarks !== undefined ? Number(totalMarks) : undefined,
            passMarks: passMarks !== undefined ? Number(passMarks) : undefined,
            durationMinutes: durationMinutes !== undefined ? Number(durationMinutes) : undefined,
            negativeMarkRate: negativeMarkRate !== undefined ? Number(negativeMarkRate) : undefined,
            startDateTime: start,
            endDateTime: end,
            batchId: batchId || null,
            subjectId: subjectId || null,
            lessonId: lessonId || null,
            testType: testType || undefined,
            isPublished: isPublished !== undefined ? Boolean(isPublished) : undefined,
            testStatus: testStatus || undefined,
          },
        });

        // 2. Upsert Config
        if (config) {
          const configData = {
            shuffleQuestions: Boolean(config.shuffleQuestions),
            shuffleOptions: Boolean(config.shuffleOptions),
            allowLateJoin: Boolean(config.allowLateJoin),
            lateJoinGraceMins: Number(config.lateJoinGraceMins) || 0,
            antiCheatLevel: Number(config.antiCheatLevel) || 3,
            submitUnlockDelayMins: Number(config.submitUnlockDelayMins) || 0,
            questionsPerScreen: Number(config.questionsPerScreen) || 1,
            oneQuestionAtATime: Boolean(config.oneQuestionAtATime),
            publishMode: config.publishMode || 'IMMEDIATE',
            publishDateTime: config.publishDateTime ? new Date(config.publishDateTime) : null,
          };
          await tx.testConfig.upsert({
            where: { testId: id },
            create: { ...configData, testId: id },
            update: configData,
          });
        }

        // 3. Sections & Questions (only replace if no student attempts have started, ensuring zero data loss)
        if (existing._count.attempts === 0 && sections.length > 0) {
          await tx.section.deleteMany({ where: { testId: id } });

          const sectionIdMap = new Map<string, string>();
          for (let sIdx = 0; sIdx < sections.length; sIdx++) {
            const sec = sections[sIdx];
            const createdSec = await tx.section.create({
              data: {
                testId: id,
                name: sec.name || `Section ${sIdx + 1}`,
                sortOrder: sec.sortOrder ?? sIdx + 1,
              },
            });
            if (sec.id) sectionIdMap.set(sec.id, createdSec.id);
            sectionIdMap.set(`idx_${sIdx}`, createdSec.id);
          }

          for (let qIdx = 0; qIdx < questions.length; qIdx++) {
            const q = questions[qIdx];
            const targetSectionId = (q.sectionId && sectionIdMap.get(q.sectionId)) || Array.from(sectionIdMap.values())[0];
            if (!targetSectionId) continue;

            await tx.question.create({
              data: {
                sectionId: targetSectionId,
                questionType: q.questionType || 'SINGLE_CORRECT',
                contentHtml: q.contentHtml || '',
                diagramUrl: q.diagramUrl || null,
                marksPositive: q.marksPositive != null ? Number(q.marksPositive) : 4,
                marksNegative: q.marksNegative != null ? Number(q.marksNegative) : 1,
                sortOrder: qIdx + 1,
                options: {
                  create: (q.options || []).map((o: any, oIdx: number) => ({
                    optionLabel: o.optionLabel || String.fromCharCode(65 + oIdx),
                    contentHtml: o.contentHtml || '',
                    isCorrect: Boolean(o.isCorrect),
                    sortOrder: oIdx,
                  })),
                },
                ...(q.hint || q.shortExplanation || q.stepByStepSolution
                  ? {
                      solution: {
                        create: {
                          hintHtml: q.hint || null,
                          shortExplanation: q.shortExplanation || null,
                          stepByStepHtml: q.stepByStepSolution || null,
                        },
                      },
                    }
                  : {}),
              },
            });
          }
        }
      });

      fastify.cache.invalidateTag('tests');
      fastify.cache.invalidate(`test:detail:${id}:true`);
      fastify.cache.invalidate(`test:detail:${id}:false`);
      fastify.cache.invalidate(`test:leaderboard:${id}`);

      return { success: true, id };
    },
  );

  fastify.delete('/api/v1/tests/:id', { preHandler: [fastify.authenticate, requirePermission('tests', 'delete')] }, async (request, reply) => {
    const { id } = request.params as { id: string }; if (!await fastify.prisma.test.findUnique({ where: { id }, select: { id: true } })) return reply.status(404).send({ statusCode: 404, message: 'Test not found' }); await fastify.prisma.test.update({ where: { id }, data: { status: RecordStatus.DELETED, isPublished: false, testStatus: 'CLOSED' } }); return { success: true };
  });

  fastify.delete('/api/v1/tests/sections/:id', { preHandler: [fastify.authenticate, requirePermission('tests', 'update')] }, async (request, reply) => {
    const { id } = request.params as { id: string }; if (!await fastify.prisma.section.findUnique({ where: { id }, select: { id: true } })) return reply.status(404).send({ statusCode: 404, message: 'Section not found' }); await fastify.prisma.section.delete({ where: { id } }); return { success: true };
  });

  fastify.put('/api/v1/tests/questions/:id', { preHandler: [fastify.authenticate, requirePermission('questions', 'update')] }, async (request, reply) => {
    const body = QuestionSchema.safeParse(request.body); if (!body.success) return reply.status(400).send({ statusCode: 400, message: 'Invalid question data', errors: body.error.format() }); const { id } = request.params as { id: string };
    if (!await fastify.prisma.question.findUnique({ where: { id }, select: { id: true } })) return reply.status(404).send({ statusCode: 404, message: 'Question not found' });
    const question = await fastify.prisma.$transaction(async (tx) => { await tx.questionOption.deleteMany({ where: { questionId: id } }); return tx.question.update({ where: { id }, data: { questionType: body.data.questionType as any || 'SINGLE_CORRECT', contentHtml: body.data.contentHtml, marksPositive: body.data.marksPositive, marksNegative: body.data.marksNegative, options: { create: body.data.options.map((option, index) => ({ ...option, sortOrder: index })) }, ...(body.data.hint || body.data.shortExplanation || body.data.stepByStepSolution ? { solution: { upsert: { create: { hintHtml: body.data.hint, shortExplanation: body.data.shortExplanation, stepByStepHtml: body.data.stepByStepSolution }, update: { hintHtml: body.data.hint, shortExplanation: body.data.shortExplanation, stepByStepHtml: body.data.stepByStepSolution } } } } : {}) }, include: { options: true, solution: true } }); }); return question;
  });

  fastify.delete('/api/v1/tests/questions/:id', { preHandler: [fastify.authenticate, requirePermission('questions', 'delete')] }, async (request, reply) => {
    const { id } = request.params as { id: string }; if (!await fastify.prisma.question.findUnique({ where: { id }, select: { id: true } })) return reply.status(404).send({ statusCode: 404, message: 'Question not found' }); await fastify.prisma.question.delete({ where: { id } }); return { success: true };
  });

  fastify.put('/api/v1/tests/:id/questions/reorder', { preHandler: [fastify.authenticate, requirePermission('questions', 'update')] }, async (request, reply) => {
    const { id } = request.params as { id: string }; const body = z.object({ questionIds: z.array(z.string()).min(1) }).safeParse(request.body); if (!body.success) return reply.status(400).send({ statusCode: 400, message: 'Invalid question order' }); const questions = await fastify.prisma.question.findMany({ where: { id: { in: body.data.questionIds }, section: { testId: id } }, select: { id: true } }); if (questions.length !== body.data.questionIds.length) return reply.status(400).send({ statusCode: 400, message: 'Questions must belong to test' }); await fastify.prisma.$transaction(body.data.questionIds.map((questionId, sortOrder) => fastify.prisma.question.update({ where: { id: questionId }, data: { sortOrder } }))); return { success: true };
  });

  fastify.post('/api/v1/tests/:id/bulk-import', { preHandler: [fastify.authenticate, requirePermission('questions', 'create')] }, async (request, reply) => {
    const { id } = request.params as { id: string }; const body = z.object({ questions: z.array(QuestionSchema.omit({ sectionId: true })).min(1).max(200) }).safeParse(request.body); if (!body.success) return reply.status(400).send({ statusCode: 400, message: 'Invalid question import', errors: body.error.format() }); const section = await fastify.prisma.section.findFirst({ where: { testId: id }, orderBy: { sortOrder: 'asc' }, select: { id: true } }); if (!section) return reply.status(400).send({ statusCode: 400, message: 'Test requires a section before import' }); const base = await fastify.prisma.question.count({ where: { sectionId: section.id } }); await fastify.prisma.$transaction(body.data.questions.map((question, index) => fastify.prisma.question.create({ data: { sectionId: section.id, questionType: question.questionType as any || 'SINGLE_CORRECT', contentHtml: question.contentHtml, marksPositive: question.marksPositive, marksNegative: question.marksNegative, sortOrder: base + index, options: { create: question.options.map((option, optionIndex) => ({ ...option, sortOrder: optionIndex })) } } }))); return reply.status(201).send({ success: true, imported: body.data.questions.length });
  });
  // GET /api/v1/tests
  fastify.get(
    '/api/v1/tests',
    {
      preHandler: [fastify.authenticate, requirePermission('tests', 'read')],
    },
    async (request, reply) => {
      const user = request.user!;
      const query = TestQuerySchema.parse(request.query);
      const isStudent = user.roleCode === RoleType.STUDENT;

      const where: any = {
        status: isStudent ? RecordStatus.ACTIVE : query.status || { not: RecordStatus.DELETED },
        ...(isStudent ? { isPublished: true } : {}),
      };

      if (query.batchId) where.batchId = query.batchId;
      if (query.subjectId) where.subjectId = query.subjectId;
      if (user.instituteId && user.roleCode !== RoleType.SUPER_ADMIN) {
        where.instituteId = user.instituteId;
      }

      if(user.roleCode!==RoleType.SUPER_ADMIN&&!user.instituteId)return [];
      if(isStudent){
        const profile=await fastify.prisma.studentProfile.findUnique({where:{userId:user.userId},select:{batchId:true,batch:{select:{status:true}}}});
        if(profile?.batchId){
          const batchSubjects = await fastify.prisma.subject.findMany({
            where: { batchId: profile.batchId, status: { not: RecordStatus.DELETED } },
            select: { id: true, copiedFromId: true, lessons: { select: { id: true, copiedFromId: true } } }
          });
          const allSubIds = [...new Set([...batchSubjects.map(s => s.id), ...batchSubjects.map(s => s.copiedFromId).filter((x): x is string => Boolean(x))])];
          const allLesIds = [...new Set([...batchSubjects.flatMap(s => s.lessons.map(l => l.id)), ...batchSubjects.flatMap(s => s.lessons.map(l => l.copiedFromId)).filter((x): x is string => Boolean(x))])];

          where.OR = [
            { batchId: profile.batchId },
            { batchId: null },
            ...(allSubIds.length ? [{ subjectId: { in: allSubIds } }] : []),
            ...(allLesIds.length ? [{ lessonId: { in: allLesIds } }] : []),
          ];
        } else {
          where.batchId = null;
        }
      }
      if(user.roleCode===RoleType.TEACHER){
        if(query.batchId) where.batchId = query.batchId;
      }
      const cacheKey = `tests:list:${user.userId}:${query.batchId || 'all'}:${query.subjectId||'all'}:${query.status||'all'}:${isStudent}`;

      return fastify.cache.getOrSet(
        cacheKey,
        async () => {
          return fastify.prisma.test.findMany({
            where,
            select: {
              id: true,
              title: true,
              description: true,
              testType: true,
              durationMinutes: true,
              totalMarks: true,
              passMarks: true,
              startDateTime: true,
              endDateTime: true,
              isPublished: true,
              testStatus: true,
              batch: { select: { id: true, name: true, code: true } },
              subject: { select: { id: true, name: true } },
              _count: { select: { sections: true, attempts: true } },
            },
            orderBy: { startDateTime: 'desc' },
          });
        },
        30,
        ['tests'],
      );
    },
  );

  // GET /api/v1/tests/:id
  fastify.get(
    '/api/v1/tests/:id',
    {
      preHandler: [fastify.authenticate, requirePermission('tests', 'read')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;
      const isStudent = user.roleCode === RoleType.STUDENT;

      const cacheKey = `test:detail:${id}:${isStudent}`;

      const test = await fastify.cache.getOrSet(
        cacheKey,
        async () => {
          return fastify.prisma.test.findFirst({
            where: {
              id,
              status: isStudent ? RecordStatus.ACTIVE : { not: RecordStatus.DELETED },
              ...(isStudent ? { isPublished: true } : {}),
            },
            include: {
              config: true,
              sections: {
                include: {
                  questions: {
                    select: {
                      id: true,
                      questionType: true,
                      contentHtml: true,
                      marksPositive: true,
                      marksNegative: true,
                      diagramUrl: true,
                      sortOrder: true,
                      solution: !isStudent ? { select: { hintHtml: true, shortExplanation: true, stepByStepHtml: true } } : false,
                      options: {
                        select: {
                          id: true,
                          optionLabel: true,
                          contentHtml: true,
                          sortOrder: true,
                          // Omit isCorrect for student exam integrity!
                          isCorrect: !isStudent,
                        },
                        orderBy: { sortOrder: 'asc' },
                      },
                    },
                    orderBy: { sortOrder: 'asc' },
                  },
                },
                orderBy: { sortOrder: 'asc' },
              },
              _count: { select: { attempts: true } },
            },
          });
        },
        30,
        [`test:${id}`],
      );

      if (!test) {
        return reply.status(404).send({
          statusCode: 404,
          message: 'Test not found or inaccessible',
          error: 'Not Found',
        });
      }

      return test;
    },
  );

  // GET /api/v1/tests/:id/leaderboard
  fastify.get(
    '/api/v1/tests/:id/leaderboard',
    {
      preHandler: [fastify.authenticate, requirePermission('tests', 'read')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const cacheKey = `test:leaderboard:${id}`;

      return fastify.cache.getOrSet(
        cacheKey,
        async () => {
          const attempts = await fastify.prisma.testAttempt.findMany({
            where: {
              testId: id,
              submittedAt: { not: null },
            },
            include: {
              student: {
                select: {
                  id: true,
                  fullName: true,
                  identifier: true,
                  avatarUrl: true,
                  studentProfile: { select: { rollNumber: true } },
                },
              },
              result: true,
            },
            orderBy: [{ result: { totalScore: 'desc' } }, { durationSeconds: 'asc' }],
            take: 50,
          });

          return attempts.map((a, idx) => ({
            rank: idx + 1,
            attemptId: a.id,
            studentId: a.studentId,
            studentName: a.student.fullName,
            rollNumber: a.student.studentProfile?.rollNumber || a.student.identifier,
            avatarUrl: a.student.avatarUrl,
            totalScore: a.result?.totalScore || 0,
            percentage: a.result?.percentage || 0,
            totalCorrect: a.result?.totalCorrect || 0,
            totalWrong: a.result?.totalWrong || 0,
            durationSeconds: a.durationSeconds,
            submittedAt: a.submittedAt,
          }));
        },
        15,
        [`test:${id}:leaderboard`],
      );
    },
  );

  // GET /api/v1/tests/:id/analytics
  fastify.get(
    '/api/v1/tests/:id/analytics',
    {
      preHandler: [fastify.authenticate, requirePermission('analytics', 'read')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const cacheKey = `test:analytics:${id}`;

      return fastify.cache.getOrSet(
        cacheKey,
        async () => {
          const [test, attempts] = await Promise.all([
            fastify.prisma.test.findUnique({
              where: { id },
              select: { id: true, title: true, totalMarks: true, passMarks: true },
            }),
            fastify.prisma.testAttempt.findMany({
              where: { testId: id, submittedAt: { not: null } },
              include: { result: true },
            }),
          ]);

          if (!test) {
            return reply.status(404).send({
              statusCode: 404,
              message: 'Test not found',
              error: 'Not Found',
            });
          }

          const totalAttempts = attempts.length;
          const validResults = attempts.filter((a) => a.result);
          const passedCount = validResults.filter((a) => a.result?.isPassed).length;
          const scores = validResults.map((a) => a.result!.totalScore);

          const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
          const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;
          const averageScore =
            scores.length > 0 ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)) : 0;

          return {
            testId: id,
            title: test.title,
            totalMarks: test.totalMarks,
            passMarks: test.passMarks,
            totalAttempts,
            passedCount,
            failedCount: totalAttempts - passedCount,
            passPercentage: totalAttempts > 0 ? Number(((passedCount / totalAttempts) * 100).toFixed(1)) : 0,
            highestScore,
            lowestScore,
            averageScore,
          };
        },
        30,
        [`test:${id}:analytics`],
      );
    },
  );

  // GET /api/v1/tests/:id/attempts
  fastify.get(
    '/api/v1/tests/:id/attempts',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;
      const isStudent = user.roleCode === RoleType.STUDENT;

      const where: any = { testId: id };
      if (isStudent) {
        where.studentId = user.userId;
      }

      const attempts = await fastify.prisma.testAttempt.findMany({
        where,
        include: {
          student: {
            select: { id: true, fullName: true, identifier: true, email: true, avatarUrl: true },
          },
          result: true,
        },
        orderBy: { startedAt: 'desc' },
      });

      if (isStudent) {
        return {
          attempts,
          totalAttempts: attempts.length,
          attemptCount: attempts.length,
        };
      }

      const studentMap: Record<string, any> = {};
      for (const a of attempts) {
        const sId = a.studentId;
        if (!studentMap[sId]) {
          studentMap[sId] = {
            student: a.student,
            attemptCount: 0,
            attempts: [],
            bestScore: null,
            latestResult: a.result,
          };
        }
        studentMap[sId].attemptCount++;
        studentMap[sId].attempts.push(a);
        if (a.result?.totalScore !== undefined) {
          if (studentMap[sId].bestScore === null || a.result.totalScore > studentMap[sId].bestScore) {
            studentMap[sId].bestScore = a.result.totalScore;
          }
        }
      }
      const students = Object.values(studentMap);
      return {
        attempts,
        totalAttempts: attempts.length,
        studentCount: students.length,
        students,
      };
    },
  );

  // The runner uses this concise endpoint. It intentionally returns only the
  // currently authenticated student's attempt and saved answers.
  fastify.post('/api/v1/tests/:id/start', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;
    if (user.roleCode !== RoleType.STUDENT) return reply.status(403).send({ statusCode: 403, message: 'Only students can start test attempts' });
    const test = await fastify.prisma.test.findFirst({
      where: { id, status: RecordStatus.ACTIVE, isPublished: true, testStatus: 'LIVE' },
      include: {
        config: true,
        sections: {
          include: {
            questions: {
              select: {
                id: true, questionType: true, contentHtml: true, marksPositive: true,
                marksNegative: true, diagramUrl: true, sortOrder: true,
                options: { select: { id: true, optionLabel: true, contentHtml: true, sortOrder: true }, orderBy: { sortOrder: 'asc' } },
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!test) return reply.status(404).send({ statusCode: 404, message: 'Live published test not found' });
    const now = new Date();
    if (now < test.startDateTime || now > test.endDateTime || (!test.config?.allowLateJoin && now.getTime()>test.startDateTime.getTime()+(test.config?.lateJoinGraceMins??15)*60000)) return reply.status(403).send({ statusCode: 403, message: 'Test is not currently available' });
    let attempt = await fastify.prisma.testAttempt.findFirst({ where: { testId: id, studentId: user.userId, submittedAt: null }, include: { answers: true } });
    const isResume = !!attempt;
    if (!attempt) attempt = await fastify.prisma.testAttempt.create({ data: { testId: id, studentId: user.userId }, include: { answers: true } });
    return reply.status(isResume ? 200 : 201).send({ attemptId: attempt.id, startedAt: attempt.startedAt, effectiveDurationSeconds: test.durationMinutes * 60, existingAnswers: attempt.answers, test, isResume });
  });

  fastify.post('/api/v1/tests/attempts/:attemptId/answer', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { attemptId } = request.params as { attemptId: string };
    const body = z.object({ questionId: z.string(), selectedOptionIds: z.array(z.string()), isMarkedForReview: z.boolean().optional(), timeSpentSeconds: z.coerce.number().int().min(0).optional() }).safeParse(request.body);
    if (!body.success) return reply.status(400).send({ statusCode: 400, message: 'Invalid answer payload', errors: body.error.format() });
    const attempt = await fastify.prisma.testAttempt.findUnique({ where: { id: attemptId }, select: { id: true, studentId: true, submittedAt: true, testId: true, startedAt:true, test: { select: { endDateTime: true, durationMinutes:true } } } });
    if (!attempt) return reply.status(404).send({ statusCode: 404, message: 'Test attempt not found' });
    if (attempt.studentId !== request.user!.userId) return reply.status(403).send({ statusCode: 403, message: 'Unauthorized attempt access' });
    if (attempt.submittedAt) return reply.status(409).send({ statusCode: 409, message: 'Cannot change a submitted attempt' });
    if (Date.now() > Math.min(+attempt.test.endDateTime,+attempt.startedAt+attempt.test.durationMinutes*60000)) return reply.status(409).send({ statusCode: 409, message: 'Test time has expired' });
    const question = await fastify.prisma.question.findFirst({ where: { id: body.data.questionId, section: { testId: attempt.testId } }, select: { id: true, options: { select: { id: true } } } });
    if (!question || body.data.selectedOptionIds.some((optionId) => !question.options.some((option) => option.id === optionId))) return reply.status(400).send({ statusCode: 400, message: 'Question or option does not belong to this test' });
    const answer = await fastify.prisma.attemptAnswer.upsert({ where: { attemptId_questionId: { attemptId, questionId: question.id } }, update: { selectedOptionIds: body.data.selectedOptionIds, isMarkedForReview: body.data.isMarkedForReview ?? false, timeSpentSeconds: body.data.timeSpentSeconds ?? 0 }, create: { attemptId, questionId: question.id, selectedOptionIds: body.data.selectedOptionIds, isMarkedForReview: body.data.isMarkedForReview ?? false, timeSpentSeconds: body.data.timeSpentSeconds ?? 0 } });
    return reply.status(200).send(answer);
  });

  // POST /api/v1/tests/:id/attempts (Start attempt)
  fastify.post(
    '/api/v1/tests/:id/attempts',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;

      if (user.roleCode !== RoleType.STUDENT) {
        return reply.status(403).send({ statusCode: 403, message: 'Only students can start test attempts' });
      }

      const test = await fastify.prisma.test.findFirst({
        where: { id, status: RecordStatus.ACTIVE, isPublished: true, testStatus: 'LIVE' },
        include: {
          config: true,
          sections: {
            include: {
              questions: {
                select: {
                  id: true,
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

      if (!test) {
        return reply.status(404).send({ statusCode: 404, message: 'Live published test not found' });
      }
      if (new Date() < test.startDateTime || new Date() > test.endDateTime || (!test.config?.allowLateJoin && Date.now()>test.startDateTime.getTime()+(test.config?.lateJoinGraceMins??15)*60000)) {
        return reply.status(403).send({ statusCode: 403, message: 'Test is not currently available' });
      }

      // Check for active ongoing attempt
      const activeAttempt = await fastify.prisma.testAttempt.findFirst({
        where: {
          testId: id,
          studentId: user.userId,
          submittedAt: null,
        },
      });

      if (activeAttempt) {
        return {
          attempt: activeAttempt,
          test,
          isResume: true,
        };
      }

      const attempt = await fastify.prisma.testAttempt.create({
        data: {
          testId: id,
          studentId: user.userId,
          startedAt: new Date(),
        },
      });

      return reply.status(201).send({
        attempt,
        test,
        isResume: false,
      });
    },
  );

  // POST /api/v1/tests/attempts/:attemptId/submit (IDEMPOTENT Submission & Server-Side Scoring)
  fastify.post(
    '/api/v1/tests/attempts/:attemptId/submit',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { attemptId } = request.params as { attemptId: string };
      const user = request.user!;
      const { answers: rawAnswers = [], durationSeconds = 0, cheatStrikes = 0 } = (request.body || {}) as {
        answers: Array<{ questionId: string; selectedOptionIds: string[]; timeSpentSeconds?: number }> | Record<string, { selectedOptionIds?: string[]; timeSpentSeconds?: number }>;
        durationSeconds?: number;
        cheatStrikes?: number;
      };
      // The current runner stores answers keyed by question ID, while API
      // callers may submit an array. Accept both representations at the
      // boundary and use one normalized server-side form for scoring.
      let answers = Array.isArray(rawAnswers)
        ? rawAnswers
        : Object.entries(rawAnswers).map(([questionId, answer]) => ({
            questionId,
            selectedOptionIds: answer?.selectedOptionIds || [],
            timeSpentSeconds: answer?.timeSpentSeconds,
          }));

      const attempt = await fastify.prisma.testAttempt.findUnique({
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
          result: true,
          answers: true,
        },
      });

      if (!attempt) {
        return reply.status(404).send({ statusCode: 404, message: 'Test attempt not found' });
      }

      // Zero-Trust Security: Ensure student is the legitimate owner
      if (attempt.studentId !== user.userId && user.roleCode !== RoleType.SUPER_ADMIN && user.roleCode !== RoleType.ADMIN) {
        return reply.status(403).send({ statusCode: 403, message: 'Unauthorized attempt access' });
      }

      // IDEMPOTENCY: If already submitted, return existing computed result immediately
      if (attempt.submittedAt !== null && attempt.result) {
        return {
          success: true,
          isDuplicateSubmission: true,
          result: attempt.result,
          attemptId: attempt.id,
        };
      }

      const deadline=Math.min(+attempt.test.endDateTime,+attempt.startedAt+attempt.test.durationMinutes*60000);
      if(Date.now()>deadline)answers=attempt.answers.map(a=>({questionId:a.questionId,selectedOptionIds:a.selectedOptionIds,timeSpentSeconds:a.timeSpentSeconds}));
      else if(user.roleCode===RoleType.STUDENT&&Date.now()<+attempt.startedAt+((request as any).examlyTest?.config?.submitUnlockDelayMins??0)*60000)return reply.code(403).send({message:'Submission is not unlocked yet'});

      // ── Server-Side Correctness & Scoring Engine ──
      const allQuestions = attempt.test.sections.flatMap((s) => s.questions);
      const validAnswers=z.array(z.object({questionId:z.string(),selectedOptionIds:z.array(z.string()),timeSpentSeconds:z.number().int().min(0).optional()})).safeParse(answers);
      if(!validAnswers.success||new Set(answers.map(a=>a.questionId)).size!==answers.length||answers.some(a=>{const q=allQuestions.find(q=>q.id===a.questionId);return !q||new Set(a.selectedOptionIds).size!==a.selectedOptionIds.length||a.selectedOptionIds.some(id=>!q.options.some(o=>o.id===id));}))return reply.code(400).send({message:'Invalid question or selected options'});
      let totalCorrect = 0;
      let totalWrong = 0;
      let totalUnanswered = 0;
      let totalScore = 0;

      const answerRecords: Array<{
        questionId: string;
        selectedOptionIds: string[];
        timeSpentSeconds: number;
        awardedMarks: number;
      }> = [];

      for (const q of allQuestions) {
        const submitted = answers.find((a) => a.questionId === q.id);
        const correctOptionIds = q.options.filter((o) => o.isCorrect).map((o) => o.id);

        if (!submitted || !submitted.selectedOptionIds || submitted.selectedOptionIds.length === 0) {
          totalUnanswered++;
          answerRecords.push({
            questionId: q.id,
            selectedOptionIds: [],
            timeSpentSeconds: submitted?.timeSpentSeconds || 0,
            awardedMarks: 0,
          });
        } else {
          // Compare submitted option IDs with correct answer key in DB
          const isCorrect =
            submitted.selectedOptionIds.length === correctOptionIds.length &&
            submitted.selectedOptionIds.every((id) => correctOptionIds.includes(id));

          if (isCorrect) {
            totalCorrect++;
            const marks = q.marksPositive ?? 4;
            totalScore += marks;
            answerRecords.push({
              questionId: q.id,
              selectedOptionIds: submitted.selectedOptionIds,
              timeSpentSeconds: submitted.timeSpentSeconds || 0,
              awardedMarks: marks,
            });
          } else {
            totalWrong++;
            const deduction = q.marksNegative ?? 1;
            totalScore -= deduction;
            answerRecords.push({
              questionId: q.id,
              selectedOptionIds: submitted.selectedOptionIds,
              timeSpentSeconds: submitted.timeSpentSeconds || 0,
              awardedMarks: -deduction,
            });
          }
        }
      }

      // Compute final percentages & pass/fail
      const finalScore = Number(totalScore.toFixed(2));
      const totalMarks = attempt.test.totalMarks || (allQuestions.length * 4);
      const percentage = Number(Math.max(0, (finalScore / totalMarks) * 100).toFixed(2));
      const isPassed = finalScore >= (attempt.test.passMarks || 0);

      // Execute atomic transaction for attempt submission & score creation
      let result;
      try {
        result = await fastify.prisma.$transaction(async (tx) => {
        // Submission is authoritative. Replacing the attempt answer set in
        // bulk avoids one remote round-trip per question (which previously
        // exceeded Prisma's interactive transaction timeout on real tests).
        await tx.attemptAnswer.deleteMany({ where: { attemptId: attempt.id } });
        if (answerRecords.length) {
          await tx.attemptAnswer.createMany({
            data: answerRecords.map((answer) => ({ attemptId: attempt.id, ...answer })),
          });
        }

        // 2. Create Test Result
        const testResult = await tx.testResult.create({
          data: {
            attemptId: attempt.id,
            totalScore: finalScore,
            totalCorrect,
            totalWrong,
            totalUnanswered,
            percentage,
            isPassed,
            publishedAt: resultVisible((request as any).examlyTest) ? new Date() : null,
          },
        });

        // 3. Mark Attempt as Submitted
        await tx.testAttempt.update({
          where: { id: attempt.id },
          data: {
            submittedAt: new Date(),
            durationSeconds: Math.max(0,Math.floor((Math.min(Date.now(),deadline)-+attempt.startedAt)/1000)),
            cheatStrikes: Number.isFinite(cheatStrikes)?Math.max(0,Math.floor(cheatStrikes)):0,
          },
        });

        return testResult;
        }, { timeout: 20_000 });
      } catch (error: any) {
        // The unique TestResult(attemptId) constraint is the final arbiter when
        // two submit requests arrive together. Return the completed result to
        // the losing request rather than surfacing an internal server error.
        if (error?.code === 'P2002') {
          const completed = await fastify.prisma.testAttempt.findUnique({ where: { id: attempt.id }, include: { result: true } });
          if (completed?.result) return { success: true, isDuplicateSubmission: true, result: completed.result, attemptId: attempt.id };
        }
        throw error;
      }

      // Invalidate leaderboard & analytics cache tags
      fastify.cache.invalidateTag(`test:${attempt.testId}:leaderboard`);
      fastify.cache.invalidateTag(`test:${attempt.testId}:analytics`);

      return reply.status(200).send({
        success: true,
        result,
        attemptId: attempt.id,
      });
    },
  );

  // GET /api/v1/tests/attempts/:attemptId/result (Zero-Trust Review)
  fastify.get(
    '/api/v1/tests/attempts/:attemptId/result',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { attemptId } = request.params as { attemptId: string };
      const user = request.user!;

      const attempt = await fastify.prisma.testAttempt.findUnique({
        where: { id: attemptId },
        include: {
          test: {
            include: {
              sections: {
                include: {
                  questions: {
                    include: {
                      options: true,
                      solution: true,
                    },
                    orderBy: { sortOrder: 'asc' },
                  },
                },
                orderBy: { sortOrder: 'asc' },
              },
            },
          },
          answers: true,
          result: true,
        },
      });

      if (!attempt || !attempt.result) {
        return reply.status(404).send({ statusCode: 404, message: 'Result not ready or attempt not found' });
      }

      // IDOR Protection: Student can only view their own score
      if (attempt.studentId !== user.userId && user.roleCode !== RoleType.SUPER_ADMIN && user.roleCode !== RoleType.ADMIN && user.roleCode !== RoleType.TEACHER) {
        return reply.status(403).send({ statusCode: 403, message: 'Unauthorized to view this attempt result' });
      }

      return {
        attemptId: attempt.id,
        test: {
          id: attempt.test.id,
          title: attempt.test.title,
          totalMarks: attempt.test.totalMarks,
          passMarks: attempt.test.passMarks,
          sections: attempt.test.sections,
        },
        result: attempt.result,
        answers: attempt.answers,
        durationSeconds: attempt.durationSeconds,
        submittedAt: attempt.submittedAt,
      };
    },
  );

  // GET /api/v1/tests/attempts/:attemptId/review (Complete questions with solution timeline)
  fastify.get(
    '/api/v1/tests/attempts/:attemptId/review',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { attemptId } = request.params as { attemptId: string };
      const user = request.user!;

      const attempt = await fastify.prisma.testAttempt.findUnique({
        where: { id: attemptId },
        include: {
          test: {
            include: {
              sections: {
                include: {
                  questions: {
                    include: { options: true, solution: true },
                    orderBy: { sortOrder: 'asc' },
                  },
                },
                orderBy: { sortOrder: 'asc' },
              },
            },
          },
          answers: true,
          result: true,
        },
      });

      if (!attempt) return reply.status(404).send({ statusCode: 404, message: 'Attempt not found' });
      if (attempt.studentId !== user.userId && user.roleCode !== RoleType.SUPER_ADMIN && user.roleCode !== RoleType.ADMIN && user.roleCode !== RoleType.TEACHER) {
        return reply.status(403).send({ statusCode: 403, message: 'Unauthorized to view this attempt review' });
      }

      const answerMap = new Map((attempt.answers || []).map((a) => [a.questionId, a]));
      const flattenedQuestions = (attempt.test?.sections || []).flatMap((s) =>
        (s.questions || []).map((q) => {
          const ans = answerMap.get(q.id);
          return {
            ...q,
            sectionName: s.name,
            selectedOptionIds: ans?.selectedOptionIds || [],
            isMarkedForReview: ans?.isMarkedForReview || false,
            options: (q.options || []).map((o) => ({
              ...o,
              isSelected: (ans?.selectedOptionIds || []).includes(o.id),
            })),
          };
        }),
      );

      return {
        attemptId: attempt.id,
        test: attempt.test,
        result: attempt.result,
        questions: flattenedQuestions,
        answers: attempt.answers,
        durationSeconds: attempt.durationSeconds,
        submittedAt: attempt.submittedAt,
      };
    },
  );

  // GET /api/v1/tests/:id/answer-key (Calculations, correct key, student selection breakdown)
  fastify.get(
    '/api/v1/tests/:id/answer-key',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { attemptId } = (request.query || {}) as { attemptId?: string };
      const user = request.user!;

      const test = await fastify.prisma.test.findUnique({
        where: { id },
        include: {
          sections: {
            include: {
              questions: {
                include: { options: true, solution: true },
                orderBy: { sortOrder: 'asc' },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
      if (!test) return reply.status(404).send({ statusCode: 404, message: 'Test not found' });

      let attempt: any = null;
      if (attemptId) {
        attempt = await fastify.prisma.testAttempt.findUnique({
          where: { id: attemptId },
          include: { answers: true, result: true },
        });
      } else if (user.roleCode === RoleType.STUDENT) {
        attempt = await fastify.prisma.testAttempt.findFirst({
          where: { testId: id, studentId: user.userId, submittedAt: { not: null } },
          include: { answers: true, result: true },
          orderBy: { submittedAt: 'desc' },
        });
      }

      const answerMap = new Map((attempt?.answers || []).map((a: any) => [a.questionId, a]));
      let qNum = 0;
      const answerKey = (test.sections || []).flatMap((sec) =>
        (sec.questions || []).map((q) => {
          qNum++;
          const ans = answerMap.get(q.id);
          const correctOpts = (q.options || []).filter((o) => o.isCorrect);
          const correctLabels = correctOpts.map((o) => o.optionLabel || '').filter(Boolean).join(', ');
          const userSelectedOpts = (q.options || []).filter((o) => (ans?.selectedOptionIds || []).includes(o.id));
          const userLabels = userSelectedOpts.map((o) => o.optionLabel || '').filter(Boolean).join(', ');

          const hasAns = (ans?.selectedOptionIds || []).length > 0;
          const isCorrect =
            hasAns &&
            correctOpts.length > 0 &&
            correctOpts.length === (ans?.selectedOptionIds || []).length &&
            correctOpts.every((o) => (ans?.selectedOptionIds || []).includes(o.id));
          const isWrong = hasAns && !isCorrect;

          const marksPos = q.marksPositive ?? 4;
          const marksNeg = q.marksNegative ?? 1;

          return {
            questionNumber: qNum,
            questionId: q.id,
            sectionName: sec.name,
            questionText: q.contentHtml?.replace(/<[^>]+>/g, '') || `Question ${qNum}`,
            correctAnswer: correctLabels || '—',
            yourAnswer: userLabels || '—',
            status: isCorrect ? 'CORRECT' : isWrong ? 'WRONG' : 'UNANSWERED',
            marks: isCorrect ? marksPos : 0,
            negative: isWrong ? marksNeg : 0,
            explanation: q.solution?.shortExplanationHtml || q.solution?.stepByStepHtml || '—',
          };
        }),
      );

      return {
        testId: test.id,
        testTitle: test.title,
        answerKey,
        result: attempt?.result || null,
      };
    },
  );

  // GET /api/v1/tests/:id/export/answer-key/pdf
  fastify.get(
    '/api/v1/tests/:id/export/answer-key/pdf',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const test = await fastify.prisma.test.findUnique({
        where: { id },
      });
      const title = (test?.title || 'Examination').replace(/[^a-zA-Z0-9 ]/g, '');
      const pdf = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 260 >>\nstream\nBT\n/F1 16 Tf\n50 780 Td\n(Examly - ${title}) Tj\n/F1 10 Tf\n0 -25 Td\n(Report: Official Answer Key & Calculation Report) Tj\n0 -20 Td\n(Generated on: ${new Date().toLocaleString()}) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000120 00000 n \n0000000210 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n520\n%%EOF\n`;
      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', `attachment; filename="answer-key-${id}.pdf"`);
      return reply.send(Buffer.from(pdf, 'utf-8'));
    },
  );

  // GET /api/v1/tests/:id/export/attempts/pdf
  fastify.get(
    '/api/v1/tests/:id/export/attempts/pdf',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const pdf = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 240 >>\nstream\nBT\n/F1 16 Tf\n50 780 Td\n(Examly Examination Attempts History) Tj\n/F1 10 Tf\n0 -25 Td\n(Test ID: ${id} | Generated: ${new Date().toLocaleString()}) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000120 00000 n \n0000000210 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n500\n%%EOF\n`;
      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', `attachment; filename="attempts-${id}.pdf"`);
      return reply.send(Buffer.from(pdf, 'utf-8'));
    },
  );

  // GET /api/v1/tests/:id/questions/analysis (Question accuracy & difficulty breakdown)
  fastify.get(
    '/api/v1/tests/:id/questions/analysis',
    {
      preHandler: [fastify.authenticate, requirePermission('analytics', 'read')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const questions = await fastify.prisma.question.findMany({
        where: { section: { testId: id } },
        include: {
          attemptAnswers: {
            where: { attempt: { submittedAt: { not: null } } },
          },
          options: { where: { isCorrect: true } },
        },
        orderBy: { sortOrder: 'asc' },
      });

      const analysis = questions.map((q) => {
        const totalAnswers = q.attemptAnswers.length;
        const correctAnswers = q.attemptAnswers.filter((a) => (a.awardedMarks || 0) > 0).length;
        const wrongAnswers = q.attemptAnswers.filter((a) => (a.awardedMarks || 0) < 0).length;
        const unattempted = q.attemptAnswers.filter((a) => a.selectedOptionIds.length === 0).length;
        const accuracyRate = totalAnswers > 0 ? Number(((correctAnswers / totalAnswers) * 100).toFixed(1)) : 0;

        let difficulty = 'EASY';
        if (accuracyRate < 40) difficulty = 'HARD';
        else if (accuracyRate < 70) difficulty = 'MEDIUM';

        return {
          questionId: q.id,
          contentHtml: q.contentHtml,
          totalAnswers,
          correctAnswers,
          wrongAnswers,
          unattempted,
          accuracyRate,
          difficulty,
        };
      });

      return { testId: id, questions: analysis };
    },
  );
};
