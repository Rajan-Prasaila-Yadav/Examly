// apps/api/src/fastify/routes/dashboard.routes.ts
import { FastifyPluginAsync } from 'fastify';
import { requirePermission } from '../plugins/rbac.plugin';
import { RecordStatus, RoleType } from '@prisma/client';

export const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/dashboard/student
  fastify.get(
    '/api/v1/dashboard/student',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const user = request.user!;
      const cacheKey = `dash:student:${user.userId}`;

      return fastify.cache.getOrSet(
        cacheKey,
        async () => {
          const studentProfile = await fastify.prisma.studentProfile.findUnique({
            where: { userId: user.userId },
            include: {
              batch: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  status: true,
                  startDate: true,
                  endDate: true,
                  _count: { select: { subjects: true, tests: true } },
                },
              },
            },
          });

          // Check if enrolled batch is active
          const isBatchActive = studentProfile?.batch && studentProfile.batch.status === RecordStatus.ACTIVE;
          const activeBatchId = isBatchActive ? studentProfile!.batchId : null;
          const activeBatch = isBatchActive ? studentProfile!.batch : null;

          const today = new Date().toISOString().slice(0, 10);

          const [recentAttempts, upcomingTests, completedTestsCount, todayClasses] =
            await Promise.all([
              fastify.prisma.testAttempt.findMany({
                where: { studentId: user.userId, submittedAt: { not: null } },
                include: {
                  test: { select: { id: true, title: true, totalMarks: true, passMarks: true } },
                  result: true,
                },
                orderBy: { submittedAt: 'desc' },
                take: 5,
              }),
              activeBatchId
                ? fastify.prisma.test.findMany({
                    where: {
                      batchId: activeBatchId,
                      status: RecordStatus.ACTIVE,
                      isPublished: true,
                      testStatus: { in: ['LIVE', 'SCHEDULED'] },
                    },
                    select: {
                      id: true,
                      title: true,
                      durationMinutes: true,
                      totalMarks: true,
                      startDateTime: true,
                      endDateTime: true,
                      testStatus: true,
                    },
                    orderBy: { startDateTime: 'asc' },
                    take: 5,
                  })
                : Promise.resolve([]),
              fastify.prisma.testAttempt.count({
                where: { studentId: user.userId, submittedAt: { not: null } },
              }),
              activeBatchId
                ? fastify.prisma.batchClass.findMany({
                    where: {
                      batchId: activeBatchId,
                      date: today,
                      status: { not: 'Cancelled' },
                    },
                    include: {
                      subject: { select: { id: true, name: true } },
                      teacher: { select: { id: true, fullName: true } },
                    },
                    orderBy: { startTime: 'asc' },
                  })
                : Promise.resolve([]),
            ]);

          const scores = recentAttempts
            .filter((a) => a.result)
            .map((a) => a.result!.percentage);
          const averageAccuracy =
            scores.length > 0
              ? Number((scores.reduce((s, v) => s + v, 0) / scores.length).toFixed(1))
              : 0;

          return {
            studentProfile: {
              ...studentProfile,
              batch: activeBatch,
            },
            isEnrolled: !!activeBatchId,
            summary: {
              completedTestsCount,
              averageAccuracy,
              totalEnrolledSubjects: activeBatch?._count?.subjects || 0,
              totalBatchTests: activeBatch?._count?.tests || 0,
            },
            recentAttempts,
            upcomingTests,
            todayClasses,
          };
        },
        30, // 30s TTL
        [`user:${user.userId}`],
      );
    },
  );

  // GET /api/v1/dashboard/admin
  fastify.get(
    '/api/v1/dashboard/admin',
    {
      preHandler: [fastify.authenticate, requirePermission('analytics', 'read')],
    },
    async (request, reply) => {
      const user = request.user!;
      const cacheKey = `dash:admin:${user.instituteId || 'global'}`;

      return fastify.cache.getOrSet(
        cacheKey,
        async () => {
          const whereTenant = user.instituteId ? { instituteId: user.instituteId } : {};

          const [
            totalStudents,
            totalTeachers,
            totalBatches,
            totalTests,
            liveTestsCount,
            recentAttempts,
          ] = await Promise.all([
            fastify.prisma.user.count({
              where: { ...whereTenant, role: { code: RoleType.STUDENT }, status: RecordStatus.ACTIVE },
            }),
            fastify.prisma.user.count({
              where: { ...whereTenant, role: { code: RoleType.TEACHER }, status: RecordStatus.ACTIVE },
            }),
            fastify.prisma.batch.count({
              where: { ...whereTenant, status: RecordStatus.ACTIVE },
            }),
            fastify.prisma.test.count({
              where: { ...whereTenant, status: RecordStatus.ACTIVE },
            }),
            fastify.prisma.test.count({
              where: { ...whereTenant, testStatus: 'LIVE', isPublished: true },
            }),
            fastify.prisma.testAttempt.findMany({
              where: { submittedAt: { not: null } },
              include: {
                student: { select: { id: true, fullName: true, identifier: true } },
                test: { select: { id: true, title: true } },
                result: true,
              },
              orderBy: { submittedAt: 'desc' },
              take: 10,
            }),
          ]);

          return {
            stats: {
              totalStudents,
              totalTeachers,
              totalBatches,
              totalTests,
              liveTestsCount,
            },
            recentActivity: recentAttempts,
          };
        },
        30,
        [`institute:${user.instituteId || 'global'}`],
      );
    },
  );
};
