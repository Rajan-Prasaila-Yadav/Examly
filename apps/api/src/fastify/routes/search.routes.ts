// apps/api/src/fastify/routes/search.routes.ts
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { RecordStatus, RoleType, TestType, QuestionType } from '@prisma/client';

const GlobalSearchQuerySchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().min(1).max(20).default(5),
});

const FacetedSearchQuerySchema = z.object({
  entity: z.enum(['students', 'teachers', 'videos', 'tests', 'questions', 'comments', 'results']).default('videos'),
  q: z.string().optional(),
  status: z.nativeEnum(RecordStatus).optional(),
  role: z.nativeEnum(RoleType).optional(),
  batchId: z.string().optional(),
  subjectId: z.string().optional(),
  teacherId: z.string().optional(),
  minScore: z.coerce.number().optional(),
  maxScore: z.coerce.number().optional(),
  category: z.nativeEnum(TestType).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'fullName', 'totalScore', 'durationSeconds', 'viewCount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export const searchRoutes: FastifyPluginAsync = async (fastify) => {
  // ── 1. GLOBAL INSTANT SEARCH (Multi-Entity) ──
  fastify.get(
    '/api/v1/search',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const user = request.user!;
      const parsed = GlobalSearchQuerySchema.safeParse(request.query);

      if (!parsed.success) {
        return reply.status(400).send({
          statusCode: 400,
          message: 'Search query must be between 1 and 100 characters',
          errors: parsed.error.format(),
        });
      }

      const { q, limit } = parsed.data;
      const isStudent = user.roleCode === RoleType.STUDENT;
      const isFacultyOrAdmin = user.roleCode === RoleType.TEACHER || user.roleCode === RoleType.ADMIN || user.roleCode === RoleType.SUPER_ADMIN;
      const statusFilter = isStudent ? RecordStatus.ACTIVE : { not: RecordStatus.DELETED };
      const cacheKey = `search:global:${user.instituteId || 'all'}:${user.roleCode}:${q}:${limit}`;

      return fastify.cache.getOrSet(
        cacheKey,
        async () => {
          // Parallel indexed queries across all 9 catalog and user models
          const [batches, subjects, lessons, videos, tests, users, questions] = await Promise.all([
            // 1. Batches / Playlists
            fastify.prisma.batch.findMany({
              where: {
                name: { contains: q, mode: 'insensitive' },
                status: statusFilter,
                ...(user.instituteId && user.roleCode !== RoleType.SUPER_ADMIN ? { instituteId: user.instituteId } : {}),
              },
              select: { id: true, name: true, code: true, imageUrl: true },
              take: limit,
            }),

            // 2. Subjects
            fastify.prisma.subject.findMany({
              where: {
                name: { contains: q, mode: 'insensitive' },
                status: statusFilter,
              },
              select: { id: true, name: true, iconUrl: true, batchId: true },
              take: limit,
            }),

            // 3. Lessons
            fastify.prisma.lesson.findMany({
              where: {
                name: { contains: q, mode: 'insensitive' },
                status: statusFilter,
              },
              select: { id: true, name: true, subjectId: true },
              take: limit,
            }),

            // 4. Videos
            fastify.prisma.video.findMany({
              where: {
                title: { contains: q, mode: 'insensitive' },
                status: statusFilter,
              },
              select: { id: true, title: true, durationSeconds: true, lessonId: true },
              take: limit,
            }),

            // 5. Tests
            fastify.prisma.test.findMany({
              where: {
                title: { contains: q, mode: 'insensitive' },
                status: statusFilter,
                ...(isStudent ? { isPublished: true } : {}),
              },
              select: {
                id: true,
                title: true,
                totalMarks: true,
                durationMinutes: true,
                testStatus: true,
              },
              take: limit,
            }),

            // 6. Users (Faculty or Students - Admin only)
            isFacultyOrAdmin
              ? fastify.prisma.user.findMany({
                  where: {
                    OR: [
                      { fullName: { contains: q, mode: 'insensitive' } },
                      { email: { contains: q, mode: 'insensitive' } },
                      { identifier: { contains: q, mode: 'insensitive' } },
                    ],
                    status: { not: RecordStatus.DELETED },
                  },
                  select: { id: true, fullName: true, email: true, identifier: true, avatarUrl: true },
                  take: limit,
                })
              : Promise.resolve([]),

            // 7. Questions (Admin/Faculty only)
            isFacultyOrAdmin
              ? fastify.prisma.question.findMany({
                  where: {
                    contentHtml: { contains: q, mode: 'insensitive' },
                  },
                  select: { id: true, contentHtml: true, questionType: true, marksPositive: true },
                  take: limit,
                })
              : Promise.resolve([]),
          ]);

          const totalResults =
            batches.length + subjects.length + lessons.length + videos.length + tests.length + users.length + questions.length;

          return {
            query: q,
            totalResults,
            results: {
              batches,
              subjects,
              lessons,
              videos,
              tests,
              users,
              questions,
            },
          };
        },
        30,
        ['search'],
      );
    },
  );

  // ── 2. FACETED FILTER & SORT SEARCH ──
  fastify.get(
    '/api/v1/search/faceted',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const user = request.user!;
      const parsed = FacetedSearchQuerySchema.safeParse(request.query);

      if (!parsed.success) {
        return reply.status(400).send({
          statusCode: 400,
          message: 'Invalid faceted search parameters',
          errors: parsed.error.format(),
        });
      }

      const {
        entity,
        q,
        status,
        role,
        batchId,
        subjectId,
        minScore,
        maxScore,
        category,
        fromDate,
        toDate,
        sortBy,
        sortOrder,
        limit,
        offset,
      } = parsed.data;

      const isStudent = user.roleCode === RoleType.STUDENT;
      const dateFilter =
        fromDate || toDate
          ? {
              ...(fromDate ? { gte: new Date(fromDate) } : {}),
              ...(toDate ? { lte: new Date(toDate) } : {}),
            }
          : undefined;

      const cacheKey = `search:faceted:${entity}:${JSON.stringify(parsed.data)}:${user.userId}`;

      return fastify.cache.getOrSet(
        cacheKey,
        async () => {
          let items: any[] = [];
          let totalCount = 0;

          if (entity === 'students' || entity === 'teachers') {
            const roleFilter = entity === 'students' ? RoleType.STUDENT : RoleType.TEACHER;
            const where: any = {
              status: isStudent ? RecordStatus.ACTIVE : status || { not: RecordStatus.DELETED },
              ...(q
                ? {
                    OR: [
                      { fullName: { contains: q, mode: 'insensitive' } },
                      { email: { contains: q, mode: 'insensitive' } },
                      { identifier: { contains: q, mode: 'insensitive' } },
                    ],
                  }
                : {}),
              ...(role ? { role: { code: role } } : { role: { code: roleFilter } }),
              ...(batchId && entity === 'students' ? { studentProfile: { batchId } } : {}),
              ...(dateFilter ? { createdAt: dateFilter } : {}),
            };

            [items, totalCount] = await Promise.all([
              fastify.prisma.user.findMany({
                where,
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  phone: true,
                  avatarUrl: true,
                  status: true,
                  createdAt: true,
                  studentProfile: { select: { rollNumber: true, batch: { select: { id: true, name: true } } } },
                  teacherProfile: { select: { facultyCode: true, designation: true, specialization: true } },
                },
                orderBy: { [sortBy === 'fullName' ? 'fullName' : 'createdAt']: sortOrder },
                skip: offset,
                take: limit,
              }),
              fastify.prisma.user.count({ where }),
            ]);
          } else if (entity === 'videos') {
            const where: any = {
              status: isStudent ? RecordStatus.ACTIVE : status || { not: RecordStatus.DELETED },
              ...(q ? { title: { contains: q, mode: 'insensitive' } } : {}),
              ...(subjectId ? { lesson: { subjectId } } : {}),
              ...(batchId ? { lesson: { subject: { batchId } } } : {}),
              ...(dateFilter ? { createdAt: dateFilter } : {}),
            };

            [items, totalCount] = await Promise.all([
              fastify.prisma.video.findMany({
                where,
                include: {
                  lesson: { select: { id: true, name: true, subject: { select: { id: true, name: true } } } },
                  _count: { select: { reactions: true, comments: true } },
                },
                orderBy: { [sortBy === 'title' ? 'title' : sortBy === 'viewCount' ? 'viewCount' : 'createdAt']: sortOrder },
                skip: offset,
                take: limit,
              }),
              fastify.prisma.video.count({ where }),
            ]);
          } else if (entity === 'tests') {
            const where: any = {
              status: isStudent ? RecordStatus.ACTIVE : status || { not: RecordStatus.DELETED },
              ...(isStudent ? { isPublished: true } : {}),
              ...(q ? { title: { contains: q, mode: 'insensitive' } } : {}),
              ...(batchId ? { batchId } : {}),
              ...(subjectId ? { subjectId } : {}),
              ...(category ? { testType: category } : {}),
              ...(dateFilter ? { createdAt: dateFilter } : {}),
            };

            [items, totalCount] = await Promise.all([
              fastify.prisma.test.findMany({
                where,
                include: {
                  batch: { select: { id: true, name: true } },
                  subject: { select: { id: true, name: true } },
                  _count: { select: { attempts: true } },
                },
                orderBy: { [sortBy === 'title' ? 'title' : 'createdAt']: sortOrder },
                skip: offset,
                take: limit,
              }),
              fastify.prisma.test.count({ where }),
            ]);
          } else if (entity === 'results') {
            const where: any = {
              ...(isStudent ? { attempt: { studentId: user.userId } } : {}),
              ...(batchId ? { attempt: { test: { batchId } } } : {}),
              ...(minScore !== undefined || maxScore !== undefined
                ? {
                    totalScore: {
                      ...(minScore !== undefined ? { gte: minScore } : {}),
                      ...(maxScore !== undefined ? { lte: maxScore } : {}),
                    },
                  }
                : {}),
              ...(dateFilter ? { publishedAt: dateFilter } : {}),
            };

            [items, totalCount] = await Promise.all([
              fastify.prisma.testResult.findMany({
                where,
                include: {
                  attempt: {
                    select: {
                      id: true,
                      student: { select: { id: true, fullName: true, identifier: true } },
                      test: { select: { id: true, title: true, totalMarks: true } },
                    },
                  },
                },
                orderBy: { [sortBy === 'totalScore' ? 'totalScore' : 'publishedAt']: sortOrder },
                skip: offset,
                take: limit,
              }),
              fastify.prisma.testResult.count({ where }),
            ]);
          }

          return {
            entity,
            totalCount,
            limit,
            offset,
            items,
          };
        },
        20,
      );
    },
  );
};
