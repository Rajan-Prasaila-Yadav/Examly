// apps/api/src/fastify/routes/lessons.routes.ts
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { requirePermission } from '../plugins/rbac.plugin';
import { RecordStatus, RoleType } from '@prisma/client';

const CreateLessonSchema = z.object({
  subjectId: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  sortOrder: z.coerce.number().default(0),
});

const UpdateLessonSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  sortOrder: z.coerce.number().optional(),
  status: z.nativeEnum(RecordStatus).optional(),
});

export const lessonsRoutes: FastifyPluginAsync = async (fastify) => {
  // The page routes create lessons beneath a subject.  This alias keeps that
  // relationship in the URL while still applying the same input validation.
  fastify.post(
    '/api/v1/lessons/subject/:subjectId',
    { preHandler: [fastify.authenticate, requirePermission('lessons', 'create')] },
    async (request, reply) => {
      const { subjectId } = request.params as { subjectId: string };
      const parsed = CreateLessonSchema.omit({ subjectId: true }).safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ statusCode: 400, message: 'Invalid lesson data', errors: parsed.error.format() });
      const user = request.user!;
      const subject = await fastify.prisma.subject.findFirst({
        where: { id: subjectId, ...(user.instituteId && user.roleCode !== RoleType.SUPER_ADMIN ? { batch: { instituteId: user.instituteId } } : {}) },
        select: { id: true },
      });
      if (!subject) return reply.status(404).send({ statusCode: 404, message: 'Subject not found' });
      return reply.status(201).send(await fastify.prisma.lesson.create({ data: { ...parsed.data, subjectId, status: RecordStatus.ACTIVE } }));
    },
  );

  fastify.put(
    '/api/v1/lessons/reorder',
    { preHandler: [fastify.authenticate, requirePermission('lessons', 'update')] },
    async (request, reply) => {
      const parsed = z.object({ ids: z.array(z.string()).min(1) }).safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ statusCode: 400, message: 'Invalid lesson order' });
      const lessons = await fastify.prisma.lesson.findMany({
        where: { id: { in: parsed.data.ids } },
        select: { id: true, subjectId: true, subject: { select: { batch: { select: { instituteId: true } } } } },
      });
      const user = request.user!;
      if (lessons.length !== parsed.data.ids.length || new Set(lessons.map((lesson) => lesson.subjectId)).size !== 1 || (user.instituteId && user.roleCode !== RoleType.SUPER_ADMIN && lessons.some((lesson) => lesson.subject.batch.instituteId !== user.instituteId))) {
        return reply.status(400).send({ statusCode: 400, message: 'Lessons must belong to one accessible subject' });
      }
      await fastify.prisma.$transaction(parsed.data.ids.map((id, sortOrder) => fastify.prisma.lesson.update({ where: { id }, data: { sortOrder } })));
      return { success: true };
    },
  );

  const videoInput = z.object({ title: z.string().min(1).max(250), videoUrl: z.string().url(), durationSeconds: z.coerce.number().int().min(0).optional(), isFreePreview: z.boolean().optional() });
  const noteInput = z.object({ title: z.string().min(1).max(250), fileUrl: z.string().url(), fileSizeBytes: z.coerce.number().int().min(0).optional() });
  const resourceInput = z.object({ title: z.string().min(1).max(250), isFolder: z.boolean().optional(), parentId: z.string().nullable().optional(), fileUrl: z.string().url().optional(), fileType: z.string().max(100).optional() });

  // These routes are the concrete contracts used by the lesson editor. They
  // deliberately persist through Prisma rather than returning client-only UI
  // state.
  fastify.post('/api/v1/lessons/:lessonId/videos', { preHandler: [fastify.authenticate, requirePermission('videos', 'create')] }, async (request, reply) => {
    const parsed = videoInput.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ statusCode: 400, message: 'Invalid video data', errors: parsed.error.format() });
    const { lessonId } = request.params as { lessonId: string };
    const lesson = await fastify.prisma.lesson.findUnique({ where: { id: lessonId }, select: { id: true } });
    if (!lesson) return reply.status(404).send({ statusCode: 404, message: 'Lesson not found' });
    const sortOrder = await fastify.prisma.video.count({ where: { lessonId } });
    return reply.status(201).send(await fastify.prisma.video.create({ data: { lessonId, ...parsed.data, durationSeconds: parsed.data.durationSeconds ?? 0, isFreePreview: parsed.data.isFreePreview ?? false, sortOrder, status: RecordStatus.ACTIVE } }));
  });
  fastify.put('/api/v1/lessons/videos/:id', { preHandler: [fastify.authenticate, requirePermission('videos', 'update')] }, async (request, reply) => {
    const parsed = videoInput.partial().safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ statusCode: 400, message: 'Invalid video data', errors: parsed.error.format() });
    const { id } = request.params as { id: string };
    const video = await fastify.prisma.video.findUnique({ where: { id } });
    if (!video) return reply.status(404).send({ statusCode: 404, message: 'Video not found' });
    return fastify.prisma.video.update({ where: { id }, data: parsed.data });
  });
  fastify.delete('/api/v1/lessons/videos/:id', { preHandler: [fastify.authenticate, requirePermission('videos', 'delete')] }, async (request, reply) => {
    const { id } = request.params as { id: string }; const video = await fastify.prisma.video.findUnique({ where: { id } });
    if (!video) return reply.status(404).send({ statusCode: 404, message: 'Video not found' });
    await fastify.prisma.video.update({ where: { id }, data: { status: RecordStatus.DELETED } }); return { success: true };
  });
  fastify.post('/api/v1/lessons/:lessonId/notes', { preHandler: [fastify.authenticate, requirePermission('notes', 'create')] }, async (request, reply) => {
    const parsed = noteInput.safeParse(request.body); if (!parsed.success) return reply.status(400).send({ statusCode: 400, message: 'Invalid note data', errors: parsed.error.format() });
    const { lessonId } = request.params as { lessonId: string }; if (!await fastify.prisma.lesson.findUnique({ where: { id: lessonId }, select: { id: true } })) return reply.status(404).send({ statusCode: 404, message: 'Lesson not found' });
    const sortOrder = await fastify.prisma.note.count({ where: { lessonId } }); return reply.status(201).send(await fastify.prisma.note.create({ data: { lessonId, ...parsed.data, fileSizeBytes: parsed.data.fileSizeBytes ?? 0, sortOrder, status: RecordStatus.ACTIVE } }));
  });
  fastify.put('/api/v1/lessons/notes/:id', { preHandler: [fastify.authenticate, requirePermission('notes', 'update')] }, async (request, reply) => {
    const parsed = noteInput.partial().safeParse(request.body); if (!parsed.success) return reply.status(400).send({ statusCode: 400, message: 'Invalid note data' }); const { id } = request.params as { id: string };
    if (!await fastify.prisma.note.findUnique({ where: { id }, select: { id: true } })) return reply.status(404).send({ statusCode: 404, message: 'Note not found' }); return fastify.prisma.note.update({ where: { id }, data: parsed.data });
  });
  fastify.delete('/api/v1/lessons/notes/:id', { preHandler: [fastify.authenticate, requirePermission('notes', 'delete')] }, async (request, reply) => {
    const { id } = request.params as { id: string }; if (!await fastify.prisma.note.findUnique({ where: { id }, select: { id: true } })) return reply.status(404).send({ statusCode: 404, message: 'Note not found' }); await fastify.prisma.note.update({ where: { id }, data: { status: RecordStatus.DELETED } }); return { success: true };
  });
  fastify.post('/api/v1/lessons/:lessonId/resources', { preHandler: [fastify.authenticate, requirePermission('resources', 'create')] }, async (request, reply) => {
    const parsed = resourceInput.safeParse(request.body); if (!parsed.success || (!parsed.data.isFolder && !parsed.data.fileUrl)) return reply.status(400).send({ statusCode: 400, message: 'Invalid resource data' }); const { lessonId } = request.params as { lessonId: string };
    if (!await fastify.prisma.lesson.findUnique({ where: { id: lessonId }, select: { id: true } })) return reply.status(404).send({ statusCode: 404, message: 'Lesson not found' }); const sortOrder = await fastify.prisma.resourceNode.count({ where: { lessonId, parentId: parsed.data.parentId ?? null } }); return reply.status(201).send(await fastify.prisma.resourceNode.create({ data: { lessonId, ...parsed.data, parentId: parsed.data.parentId ?? null, isFolder: parsed.data.isFolder ?? false, sortOrder } }));
  });
  fastify.delete('/api/v1/lessons/resources/:id', { preHandler: [fastify.authenticate, requirePermission('resources', 'delete')] }, async (request, reply) => {
    const { id } = request.params as { id: string }; if (!await fastify.prisma.resourceNode.findUnique({ where: { id }, select: { id: true } })) return reply.status(404).send({ statusCode: 404, message: 'Resource not found' }); await fastify.prisma.resourceNode.delete({ where: { id } }); return { success: true };
  });

  // GET /api/v1/lessons/:id (Optimized Hierarchy)
  fastify.get(
    '/api/v1/lessons/:id',
    {
      preHandler: [fastify.authenticate, requirePermission('lessons', 'read')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;
      const isStudent = user.roleCode === RoleType.STUDENT;
      const cacheKey = `lesson:detail:${id}:${isStudent}`;

      const lesson = await fastify.cache.getOrSet(
        cacheKey,
        async () => {
          return fastify.prisma.lesson.findFirst({
            where: {
              id,
              status: isStudent ? RecordStatus.ACTIVE : { not: RecordStatus.DELETED },
            },
            include: {
              subject: {
                include: {
                  batch: { select: { id: true, name: true, code: true } },
                  lessons: {
                    where: {
                      status: isStudent ? RecordStatus.ACTIVE : { not: RecordStatus.DELETED },
                    },
                    select: {
                      id: true,
                      name: true,
                      sortOrder: true,
                      _count: { select: { videos: true, notes: true, resources: true, tests: true } },
                    },
                    orderBy: { sortOrder: 'asc' },
                  },
                },
              },
              videos: {
                where: {
                  status: isStudent ? RecordStatus.ACTIVE : { not: RecordStatus.DELETED },
                },
                include: { _count: { select: { comments: true, reactions: true } } },
                orderBy: { sortOrder: 'asc' },
              },
              notes: {
                where: {
                  status: isStudent ? RecordStatus.ACTIVE : { not: RecordStatus.DELETED },
                },
                orderBy: { sortOrder: 'asc' },
              },
              resources: {
                orderBy: { sortOrder: 'asc' },
              },
              tests: {
                where: {
                  status: isStudent ? RecordStatus.ACTIVE : { not: RecordStatus.DELETED },
                  ...(isStudent ? { isPublished: true } : {}),
                },
                select: {
                  id: true,
                  title: true,
                  totalMarks: true,
                  passMarks: true,
                  durationMinutes: true,
                  isPublished: true,
                  testStatus: true,
                },
                orderBy: { createdAt: 'desc' },
              },
            },
          });
        },
        30,
        [`lesson:${id}`],
      );

      if (!lesson) {
        return reply.status(404).send({
          statusCode: 404,
          message: 'Lesson not found',
          error: 'Not Found',
        });
      }

      return lesson;
    },
  );

  // POST /api/v1/lessons
  fastify.post(
    '/api/v1/lessons',
    {
      preHandler: [fastify.authenticate, requirePermission('lessons', 'create')],
    },
    async (request, reply) => {
      const parsed = CreateLessonSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          statusCode: 400,
          message: 'Invalid lesson data',
          errors: parsed.error.format(),
        });
      }

      const data = parsed.data;
      const lesson = await fastify.prisma.lesson.create({
        data: {
          subjectId: data.subjectId,
          name: data.name,
          description: data.description,
          sortOrder: data.sortOrder,
          status: RecordStatus.ACTIVE,
        },
      });

      return reply.status(201).send(lesson);
    },
  );

  // PUT /api/v1/lessons/:id
  fastify.put(
    '/api/v1/lessons/:id',
    {
      preHandler: [fastify.authenticate, requirePermission('lessons', 'update')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = UpdateLessonSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          statusCode: 400,
          message: 'Invalid lesson update data',
          errors: parsed.error.format(),
        });
      }

      const existing = await fastify.prisma.lesson.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({
          statusCode: 404,
          message: 'Lesson not found',
          error: 'Not Found',
        });
      }

      const updated = await fastify.prisma.lesson.update({
        where: { id },
        data: parsed.data,
      });

      return updated;
    },
  );

  // DELETE /api/v1/lessons/:id
  fastify.delete(
    '/api/v1/lessons/:id',
    {
      preHandler: [fastify.authenticate, requirePermission('lessons', 'delete')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const existing = await fastify.prisma.lesson.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({
          statusCode: 404,
          message: 'Lesson not found',
          error: 'Not Found',
        });
      }

      await fastify.prisma.lesson.update({
        where: { id },
        data: { status: RecordStatus.DELETED },
      });

      return { message: 'Lesson deleted successfully' };
    },
  );
};
