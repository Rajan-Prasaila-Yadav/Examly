// apps/api/src/fastify/routes/users.routes.ts
import { FastifyPluginAsync } from 'fastify';
import { rolesRoutes } from './roles.routes';
import { z } from 'zod';
import { requirePermission } from '../plugins/rbac.plugin';
import { RecordStatus, RoleType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const StudentQuerySchema = z.object({
  batchId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

const CreateStudentSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().trim().min(7, 'Phone number must be at least 7 digits'),
  email: z.string().trim().email('Invalid email address').optional().or(z.literal('')).transform((v) => v || undefined),
  rollNumber: z.string().trim().optional(),
  batchId: z.string().optional().or(z.literal('')).transform((v) => v || undefined),
  province: z.string().optional().or(z.literal('')).transform((v) => v || undefined),
  district: z.string().optional().or(z.literal('')).transform((v) => v || undefined),
  municipality: z.string().optional().or(z.literal('')).transform((v) => v || undefined),
  wardNumber: z.string().optional().or(z.literal('')).transform((v) => v || undefined),
  parentPhone: z.string().optional().or(z.literal('')).transform((v) => v || undefined),
  parentName: z.string().optional().or(z.literal('')).transform((v) => v || undefined),
  avatarUrl: z.string().optional().or(z.literal('')).transform((v) => v || undefined),
});

const UpdateStudentSchema = z.object({
  fullName: z.string().trim().min(2).optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().email().optional().or(z.literal('')).transform((v) => v || null),
  rollNumber: z.string().trim().optional(),
  batchId: z.string().nullable().optional().or(z.literal('')).transform((v) => v || null),
  province: z.string().optional().or(z.literal('')).transform((v) => v || null),
  district: z.string().optional().or(z.literal('')).transform((v) => v || null),
  municipality: z.string().optional().or(z.literal('')).transform((v) => v || null),
  wardNumber: z.string().optional().or(z.literal('')).transform((v) => v || null),
  parentPhone: z.string().optional().or(z.literal('')).transform((v) => v || null),
  avatarUrl: z.string().optional().or(z.literal('')).transform((v) => v || null),
  status: z.enum(['ACTIVE', 'BLOCKED', 'DELETED']).optional(),
});

export const usersRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(rolesRoutes);

  // POST /api/v1/users/students — Enroll New Student
  fastify.post(
    '/api/v1/users/students',
    {
      preHandler: [fastify.authenticate, requirePermission('students', 'create')],
    },
    async (request, reply) => {
      const user = request.user!;
      const parseResult = CreateStudentSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          message: parseResult.error.issues.map((e) => e.message).join(', '),
          error: 'Bad Request',
        });
      }
      const body = parseResult.data;

      // Determine Institute ID
      let instituteId = user.instituteId;
      if (!instituteId && body.batchId) {
        const b = await fastify.prisma.batch.findUnique({
          where: { id: body.batchId },
          select: { instituteId: true },
        });
        if (b?.instituteId) instituteId = b.instituteId;
      }
      if (!instituteId) {
        const inst = await fastify.prisma.institute.findFirst({
          where: { status: RecordStatus.ACTIVE },
          select: { id: true },
        });
        if (inst) instituteId = inst.id;
      }

      // Find the STUDENT role
      const studentRole = await fastify.prisma.role.findFirst({
        where: {
          code: RoleType.STUDENT,
          OR: [
            ...(instituteId ? [{ instituteId }] : []),
            { isSystem: true },
            { instituteId: null },
          ],
        },
        orderBy: { isSystem: 'asc' },
      });

      if (!studentRole) {
        return reply.status(500).send({
          statusCode: 500,
          message: 'Student role not found in system. Please initialize roles.',
          error: 'Internal Server Error',
        });
      }

      // Check for phone duplicate
      const existingPhone = await fastify.prisma.user.findFirst({
        where: { phone: body.phone, status: { not: RecordStatus.DELETED } },
        select: { id: true, fullName: true },
      });
      if (existingPhone) {
        return reply.status(409).send({
          statusCode: 409,
          message: `A student with phone number "${body.phone}" already exists (${existingPhone.fullName})`,
          error: 'Conflict',
        });
      }

      // Check for email duplicate
      if (body.email) {
        const existingEmail = await fastify.prisma.user.findFirst({
          where: { email: body.email, status: { not: RecordStatus.DELETED } },
          select: { id: true, fullName: true },
        });
        if (existingEmail) {
          return reply.status(409).send({
            statusCode: 409,
            message: `A student with email "${body.email}" already exists (${existingEmail.fullName})`,
            error: 'Conflict',
          });
        }
      }

      // Generate or ensure unique roll number / identifier
      let finalRollNumber = body.rollNumber?.trim();
      if (!finalRollNumber) {
        finalRollNumber = `RN-${Math.floor(10000 + Math.random() * 90000)}`;
      }

      let identifier = finalRollNumber;
      const existingIdent = await fastify.prisma.user.findUnique({
        where: { identifier },
        select: { id: true },
      });
      if (existingIdent) {
        identifier = `RN-${Math.floor(10000 + Math.random() * 90000)}`;
        finalRollNumber = identifier;
      }

      // Generate a friendly initial password
      const rawPassword = `Pass@${Math.floor(1000 + Math.random() * 9000)}`;
      const passwordHash = await bcrypt.hash(rawPassword, 10);

      // Create user and studentProfile transactionally
      const newStudent = await fastify.prisma.$transaction(async (tx) => {
        return tx.user.create({
          data: {
            fullName: body.fullName,
            phone: body.phone,
            email: body.email || null,
            identifier,
            passwordHash,
            avatarUrl: body.avatarUrl || null,
            roleId: studentRole.id,
            instituteId,
            status: RecordStatus.ACTIVE,
            studentProfile: {
              create: {
                rollNumber: finalRollNumber,
                batchId: body.batchId || null,
                province: body.province || null,
                district: body.district || null,
                municipality: body.municipality || null,
                wardNumber: body.wardNumber || null,
                parentPhone: body.parentPhone || null,
              },
            },
          },
          select: {
            id: true,
            fullName: true,
            identifier: true,
            email: true,
            phone: true,
            avatarUrl: true,
            status: true,
            createdAt: true,
            studentProfile: {
              include: {
                batch: { select: { id: true, name: true, code: true } },
              },
            },
          },
        });
      });

      fastify.cache.invalidateTag('students');

      return reply.status(201).send({
        success: true,
        data: newStudent,
        rawPassword,
        message: 'Student enrolled successfully',
      });
    },
  );

  // PUT /api/v1/users/students/:id — Update Student Profile
  fastify.put(
    '/api/v1/users/students/:id',
    {
      preHandler: [fastify.authenticate, requirePermission('students', 'update')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parseResult = UpdateStudentSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          message: parseResult.error.issues.map((e) => e.message).join(', '),
          error: 'Bad Request',
        });
      }
      const body = parseResult.data;

      const existing = await fastify.prisma.user.findUnique({
        where: { id },
        include: { studentProfile: true },
      });
      if (!existing) {
        return reply.status(404).send({ statusCode: 404, message: 'Student not found', error: 'Not Found' });
      }

      // Check duplicate phone if changed
      if (body.phone && body.phone !== existing.phone) {
        const conflict = await fastify.prisma.user.findFirst({
          where: { phone: body.phone, id: { not: id }, status: { not: RecordStatus.DELETED } },
          select: { id: true },
        });
        if (conflict) {
          return reply.status(409).send({
            statusCode: 409,
            message: `Phone number "${body.phone}" is already in use by another user`,
            error: 'Conflict',
          });
        }
      }

      // Check duplicate email if changed
      if (body.email && body.email !== existing.email) {
        const conflict = await fastify.prisma.user.findFirst({
          where: { email: body.email, id: { not: id }, status: { not: RecordStatus.DELETED } },
          select: { id: true },
        });
        if (conflict) {
          return reply.status(409).send({
            statusCode: 409,
            message: `Email "${body.email}" is already in use by another user`,
            error: 'Conflict',
          });
        }
      }

      const updated = await fastify.prisma.$transaction(async (tx) => {
        const u = await tx.user.update({
          where: { id },
          data: {
            ...(body.fullName ? { fullName: body.fullName } : {}),
            ...(body.phone ? { phone: body.phone } : {}),
            ...(body.email !== undefined ? { email: body.email } : {}),
            ...(body.avatarUrl !== undefined ? { avatarUrl: body.avatarUrl } : {}),
            ...(body.status ? { status: body.status as any } : {}),
            ...(body.rollNumber && body.rollNumber !== existing.identifier ? { identifier: body.rollNumber } : {}),
          },
        });

        if (existing.studentProfile) {
          await tx.studentProfile.update({
            where: { userId: id },
            data: {
              ...(body.rollNumber ? { rollNumber: body.rollNumber } : {}),
              ...(body.batchId !== undefined ? { batchId: body.batchId } : {}),
              ...(body.province !== undefined ? { province: body.province } : {}),
              ...(body.district !== undefined ? { district: body.district } : {}),
              ...(body.municipality !== undefined ? { municipality: body.municipality } : {}),
              ...(body.wardNumber !== undefined ? { wardNumber: body.wardNumber } : {}),
              ...(body.parentPhone !== undefined ? { parentPhone: body.parentPhone } : {}),
            },
          });
        } else {
          await tx.studentProfile.create({
            data: {
              userId: id,
              rollNumber: body.rollNumber || existing.identifier,
              batchId: body.batchId || null,
              province: body.province || null,
              district: body.district || null,
              municipality: body.municipality || null,
              wardNumber: body.wardNumber || null,
              parentPhone: body.parentPhone || null,
            },
          });
        }

        return u;
      });

      fastify.cache.invalidateTag('students');
      fastify.cache.invalidate(`student:360:${id}`);
      fastify.cache.invalidate(`user:${id}`);

      return { success: true, data: updated, message: 'Student updated successfully' };
    },
  );

  // PUT /api/v1/users/students/:id/batch — Quick Assign/Transfer Batch
  fastify.put(
    '/api/v1/users/students/:id/batch',
    {
      preHandler: [fastify.authenticate, requirePermission('students', 'update')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { batchId } = request.body as { batchId?: string | null };

      const student = await fastify.prisma.user.findUnique({
        where: { id },
        include: { studentProfile: true },
      });
      if (!student) {
        return reply.status(404).send({ statusCode: 404, message: 'Student not found', error: 'Not Found' });
      }

      if (student.studentProfile) {
        await fastify.prisma.studentProfile.update({
          where: { userId: id },
          data: { batchId: batchId || null },
        });
      } else {
        await fastify.prisma.studentProfile.create({
          data: {
            userId: id,
            rollNumber: student.identifier,
            batchId: batchId || null,
          },
        });
      }

      fastify.cache.invalidateTag('students');
      fastify.cache.invalidate(`student:360:${id}`);
      fastify.cache.invalidate(`user:${id}`);

      return { success: true, message: 'Batch assignment updated' };
    },
  );

  // PUT /api/v1/users/:id/status — Block / Unblock / Delete User
  fastify.put(
    '/api/v1/users/:id/status',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { status } = request.body as { status: RecordStatus };
      const user = request.user!;

      if (user.roleCode !== RoleType.SUPER_ADMIN && user.roleCode !== RoleType.ADMIN) {
        await requirePermission('students', 'update')(request, reply);
        if (reply.sent) return;
      }

      if (!['ACTIVE', 'BLOCKED', 'DELETED', 'PENDING_VERIFICATION'].includes(status)) {
        return reply.status(400).send({ statusCode: 400, message: 'Invalid status value', error: 'Bad Request' });
      }

      const updated = await fastify.prisma.user.update({
        where: { id },
        data: {
          status,
          ...(status === RecordStatus.DELETED ? { deletedAt: new Date() } : {}),
        },
        select: { id: true, status: true, fullName: true },
      });

      fastify.cache.invalidateTag('students');
      fastify.cache.invalidateTag('teachers');
      fastify.cache.invalidate(`student:360:${id}`);
      fastify.cache.invalidate(`user:${id}`);

      return { success: true, data: updated, message: `User status changed to ${status}` };
    },
  );
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
