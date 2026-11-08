// apps/api/src/fastify/routes/users.routes.ts
import { FastifyPluginAsync } from 'fastify';
import {rolesRoutes} from './roles.routes';
import { z } from 'zod';
import { requirePermission } from '../plugins/rbac.plugin';
import { RecordStatus, RoleType } from '@prisma/client';

const StudentQuerySchema = z.object({
  batchId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

export const usersRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(rolesRoutes);
  // GET /api/v1/users/students
  fastify.get(
    '/api/v1/users/students',
    {
      preHandler: [fastify.authenticate, requirePermission('students', 'read')],
    },
    async (request, reply) => {
      const user = request.user!;
      const query = StudentQuerySchema.parse(request.query);
      const skip = (query.page - 1) * query.limit;

      const where: any = {
        role: { code: RoleType.STUDENT },
        status: { not: RecordStatus.DELETED },
      };

      if (user.instituteId && user.roleCode !== RoleType.SUPER_ADMIN) {
        where.instituteId = user.instituteId;
      }

      if (query.batchId) {
        where.studentProfile = { batchId: query.batchId };
      }

      if (query.search) {
        where.OR = [
          { fullName: { contains: query.search, mode: 'insensitive' } },
          { identifier: { contains: query.search, mode: 'insensitive' } },
          { phone: { contains: query.search } },
        ];
      }

      const cacheKey = `students:list:${user.instituteId || 'all'}:${query.batchId || 'all'}:${query.search || 'none'}:${query.page}:${query.limit}`;

      return fastify.cache.getOrSet(
        cacheKey,
        async () => {
          const [students, total] = await Promise.all([
            fastify.prisma.user.findMany({
              where,
              select: {
                id: true,
                fullName: true,
                identifier: true,
                email: true,
                phone: true,
                avatarUrl: true,
                status: true,
                lastLoginAt: true,
                createdAt: true,
                studentProfile: {
                  select: {
                    id: true,
                    rollNumber: true,
                    batchId: true,
                    province: true,
                    district: true,
                    municipality: true,
                    wardNumber: true,
                    parentPhone: true,
                    batch: { select: { id: true, name: true, code: true, status: true } },
                  },
                },
                _count: { select: { testAttempts: true } },
              },
              orderBy: { createdAt: 'desc' },
              skip,
              take: query.limit,
            }),
            fastify.prisma.user.count({ where }),
          ]);

          return {
            data: students,
            meta: {
              page: query.page,
              limit: query.limit,
              total,
              totalPages: Math.ceil(total / query.limit),
            },
          };
        },
        15, // 15s TTL
        ['students'],
      );
    },
  );

  // GET /api/v1/users/students/:id/360
  fastify.get(
    '/api/v1/users/students/:id/360',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;

      // Access control:
      // - Self-access is always allowed (student viewing their own profile)
      // - SUPER_ADMIN and ADMIN have global/institute access
      // - Other roles (Teacher/Employee) must have 'students.read' permission
      const isSelf = id === 'me' || id === user.userId;
      if (!isSelf && user.roleCode !== RoleType.SUPER_ADMIN && user.roleCode !== RoleType.ADMIN) {
        await requirePermission('students', 'read')(request, reply);
        if (reply.sent) return;
      }

      const targetId = id === 'me' ? user.userId : id;
      const cacheKey = `student:360:${targetId}`;

      return fastify.cache.getOrSet(
        cacheKey,
        async () => {
          let student = await fastify.prisma.user.findUnique({
            where: { id: targetId },
            select: {
              id: true,
              fullName: true,
              identifier: true,
              email: true,
              phone: true,
              avatarUrl: true,
              status: true,
              createdAt: true,
              lastLoginAt: true,
              studentProfile: {
                include: {
                  batch: { select: { id: true, name: true, code: true } },
                },
              },
              testAttempts: {
                include: {
                  test: { select: { id: true, title: true, totalMarks: true, passMarks: true } },
                  result: true,
                },
                orderBy: { startedAt: 'desc' },
                take: 50,
              },
            },
          });

          if (!student) {
            // Check if targetId is studentProfile.id
            const profile = await fastify.prisma.studentProfile.findUnique({
              where: { id: targetId },
              select: { userId: true },
            });
            if (profile) {
              student = await fastify.prisma.user.findUnique({
                where: { id: profile.userId },
                select: {
                  id: true,
                  fullName: true,
                  identifier: true,
                  email: true,
                  phone: true,
                  avatarUrl: true,
                  status: true,
                  createdAt: true,
                  lastLoginAt: true,
                  studentProfile: {
                    include: {
                      batch: { select: { id: true, name: true, code: true } },
                    },
                  },
                  testAttempts: {
                    include: {
                      test: { select: { id: true, title: true, totalMarks: true, passMarks: true } },
                      result: true,
                    },
                    orderBy: { startedAt: 'desc' },
                    take: 50,
                  },
                },
              });
            }
          }

          if (!student) {
            return reply.status(404).send({
              statusCode: 404,
              message: 'Student not found',
              error: 'Not Found',
            });
          }

          const formattedAttempts = (student.testAttempts || []).map((att) => ({
            id: att.id,
            testId: att.testId,
            studentId: att.studentId,
            attemptNumber: att.attemptNumber,
            startedAt: att.startedAt,
            submittedAt: att.submittedAt,
            durationSeconds: att.durationSeconds,
            test: att.test,
            testTitle: att.test?.title || 'Examination Test',
            totalMarks: att.test?.totalMarks ?? 200,
            score: att.result?.totalScore ?? 0,
            percentage: att.result?.percentage ?? 0,
            isPassed: att.result?.isPassed ?? (att.result?.percentage ? att.result.percentage >= 50 : false),
            status: att.submittedAt ? (att.result?.isPassed ? 'PASSED' : 'FAILED') : 'IN_PROGRESS',
            result: att.result,
          }));

          const attemptsWithResult = student.testAttempts.filter((a) => a.result);
          const totalAttempts = attemptsWithResult.length;
          const passedAttempts = attemptsWithResult.filter((a) => a.result?.isPassed).length;
          const avgScore =
            totalAttempts > 0
              ? Number(
                  (
                    attemptsWithResult.reduce((sum, a) => sum + (a.result?.percentage || 0), 0) / totalAttempts
                  ).toFixed(1),
                )
              : 0;
          const bestPercentage =
            totalAttempts > 0
              ? Math.max(...attemptsWithResult.map((a) => a.result?.percentage || 0))
              : 0;

          const metrics = {
            totalAttempts: student.testAttempts.length,
            completedAttempts: totalAttempts,
            passedAttempts,
            passedCount: passedAttempts,
            failedAttempts: totalAttempts - passedAttempts,
            failedCount: totalAttempts - passedAttempts,
            passRate: totalAttempts > 0 ? Number(((passedAttempts / totalAttempts) * 100).toFixed(1)) : 0,
            avgPercentage: avgScore,
            avgScore,
            bestPercentage,
          };

          return {
            user: student,
            student: {
              ...student,
              testAttempts: formattedAttempts,
            },
            studentProfile: student.studentProfile,
            metrics,
            analytics: metrics,
            recentAttempts: formattedAttempts,
            attempts: formattedAttempts,
          };
        },
        30,
        [`user:${targetId}`],
      );
    },
  );

  // GET /api/v1/users/teachers
  fastify.get(
    '/api/v1/users/teachers',
    {
      preHandler: [fastify.authenticate, requirePermission('teachers', 'read')],
    },
    async (request, reply) => {
      const user = request.user!;
      const where: any = {
        role: { code: RoleType.TEACHER },
        status: { not: RecordStatus.DELETED },
      };

      if (user.instituteId && user.roleCode !== RoleType.SUPER_ADMIN) {
        where.instituteId = user.instituteId;
      }

      return fastify.cache.getOrSet(
        `teachers:list:${user.instituteId || 'all'}`,
        async () => {
          return fastify.prisma.user.findMany({
            where,
            select: {
              id: true,
              fullName: true,
              identifier: true,
              email: true,
              phone: true,
              avatarUrl: true,
              status: true,
              teacherProfile: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          });
        },
        60,
        ['teachers'],
      );
    },
  );

  // GET /api/v1/users/teachers/:id/360
  fastify.get(
    '/api/v1/users/teachers/:id/360',
    {
      preHandler: [fastify.authenticate, requirePermission('teachers', 'read')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;

      const teacher = await fastify.prisma.user.findFirst({
        where: {
          id,
          role: { code: RoleType.TEACHER },
          status: { not: RecordStatus.DELETED },
          ...(user.instituteId && user.roleCode !== RoleType.SUPER_ADMIN ? { instituteId: user.instituteId } : {}),
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          identifier: true,
          avatarUrl: true,
          status: true,
          createdAt: true,
          teacherProfile: true,
        },
      });

      if (!teacher) {
        return reply.status(404).send({ statusCode: 404, message: 'Teacher not found' });
      }

      return {
        user: teacher,
        subjectsCount: 0,
        lessonsCount: 0,
        testsCreatedCount: 0,
      };
    },
  );

};
