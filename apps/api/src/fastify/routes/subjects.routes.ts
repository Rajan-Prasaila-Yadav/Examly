// apps/api/src/fastify/routes/subjects.routes.ts
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { requirePermission } from '../plugins/rbac.plugin';
import { RecordStatus, RoleType } from '@prisma/client';

const CreateSubjectSchema = z.object({
  batchId: z.string().min(1),
  name: z.string().min(1).max(100),
  iconUrl: z.string().url().optional().or(z.literal('')),
  sortOrder: z.coerce.number().default(0),
});

const UpdateSubjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  iconUrl: z.string().url().optional().or(z.literal('')),
  sortOrder: z.coerce.number().optional(),
});

const SubjectQuerySchema = z.object({
  batchId: z.string().optional(),
});

export const subjectsRoutes: FastifyPluginAsync = async (fastify) => {
  const assertBatchAccess = async (batchId: string, user: { instituteId?: string | null; roleCode: RoleType }) => {
    const batch = await fastify.prisma.batch.findFirst({
      where: {
        id: batchId,
        status: { not: RecordStatus.DELETED },
        ...(user.instituteId && user.roleCode !== RoleType.SUPER_ADMIN ? { instituteId: user.instituteId } : {}),
      },
      select: { id: true },
    });
    return batch;
  };

  // Compatibility aliases used by the current Next.js pages. Keep the scoped
  // lookup server-side instead of accepting a batch identifier without tenancy
  // validation.
  fastify.get('/api/v1/subjects/batch/:batchId', { preHandler: [fastify.authenticate, requirePermission('subjects', 'read')] }, async (request, reply) => {
    const { batchId } = request.params as { batchId: string };
    const user = request.user!;
    if (!(await assertBatchAccess(batchId, user))) return reply.status(404).send({ statusCode: 404, message: 'Batch not found' });
    return fastify.prisma.subject.findMany({
      where: { batchId, status: user.roleCode === RoleType.STUDENT ? RecordStatus.ACTIVE : { not: RecordStatus.DELETED } },
      include: { _count: { select: { lessons: true, tests: true } } },
      orderBy: { sortOrder: 'asc' },
    });
  });

  fastify.post('/api/v1/subjects/batch/:batchId', { preHandler: [fastify.authenticate, requirePermission('subjects', 'create')] }, async (request, reply) => {
    const { batchId } = request.params as { batchId: string };
    const parsed = CreateSubjectSchema.omit({ batchId: true }).safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ statusCode: 400, message: 'Invalid subject data', errors: parsed.error.format() });
    if (!(await assertBatchAccess(batchId, request.user!))) return reply.status(404).send({ statusCode: 404, message: 'Batch not found' });
    return reply.status(201).send(await fastify.prisma.subject.create({ data: { ...parsed.data, batchId, status: RecordStatus.ACTIVE } }));
  });

  fastify.put('/api/v1/subjects/reorder', { preHandler: [fastify.authenticate, requirePermission('subjects', 'update')] }, async (request, reply) => {
    const parsed = z.object({ ids: z.array(z.string()).min(1) }).safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ statusCode: 400, message: 'Invalid subject order' });
    const subjects = await fastify.prisma.subject.findMany({ where: { id: { in: parsed.data.ids } }, select: { id: true, batchId: true, batch: { select: { instituteId: true } } } });
    if (subjects.length !== parsed.data.ids.length || new Set(subjects.map((s) => s.batchId)).size !== 1 || (request.user!.instituteId && request.user!.roleCode !== RoleType.SUPER_ADMIN && subjects.some((s) => s.batch.instituteId !== request.user!.instituteId))) return reply.status(400).send({ statusCode: 400, message: 'Subjects must belong to one accessible batch' });
    await fastify.prisma.$transaction(parsed.data.ids.map((id, sortOrder) => fastify.prisma.subject.update({ where: { id }, data: { sortOrder } })));
    return { success: true };
  });
  // GET /api/v1/subjects
  fastify.get(
    '/api/v1/subjects',
    {
      preHandler: [fastify.authenticate, requirePermission('subjects', 'read')],
    },
    async (request, reply) => {
      const query = SubjectQuerySchema.parse(request.query);
      const user = request.user!;
      const isStudent = user.roleCode === RoleType.STUDENT;

      const where: any = {
        status: isStudent ? RecordStatus.ACTIVE : { not: RecordStatus.DELETED },
      };

      if (query.batchId) {
        where.batchId = query.batchId;
      }

      if (user.instituteId && user.roleCode !== RoleType.SUPER_ADMIN) {
        where.batch = { instituteId: user.instituteId };
      }
      if (isStudent) {
        const enrollment = await fastify.prisma.studentProfile.findUnique({where:{userId:user.userId},select:{batchId:true}});
        if(query.batchId && query.batchId!==enrollment?.batchId)return reply.code(404).send({message:'Batch not accessible'});
        where.batchId=enrollment?.batchId||'__none__';
        where.batch={instituteId:user.instituteId,status:'ACTIVE'};
      }

      const subjects = await fastify.prisma.subject.findMany({
        where,
        include: {
          lessons: {
            where: {
              status: isStudent ? RecordStatus.ACTIVE : { not: RecordStatus.DELETED },
            },
            include: {
              _count: { select: { videos: true, notes: true, resources: true, tests: true } },
            },
            orderBy: { sortOrder: 'asc' },
          },
          _count: { select: { lessons: true, tests: true } },
        },
        orderBy: { sortOrder: 'asc' },
      });

      return subjects;
    },
  );

  // GET /api/v1/subjects/:id
  fastify.get(
    '/api/v1/subjects/:id',
    {
      preHandler: [fastify.authenticate, requirePermission('subjects', 'read')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;
      const isStudent = user.roleCode === RoleType.STUDENT;

      const subject = await fastify.prisma.subject.findFirst({
        where: {
          id,
          status: isStudent ? RecordStatus.ACTIVE : { not: RecordStatus.DELETED },
        },
        include: {
          batch: true,
          lessons: {
            where: {
              status: isStudent ? RecordStatus.ACTIVE : { not: RecordStatus.DELETED },
            },
            include: {
              videos: {
                where: { status: isStudent ? RecordStatus.ACTIVE : { not: RecordStatus.DELETED } },
                orderBy: { sortOrder: 'asc' },
              },
              notes: {
                where: { status: isStudent ? RecordStatus.ACTIVE : { not: RecordStatus.DELETED } },
                orderBy: { sortOrder: 'asc' },
              },
              resources: { orderBy: { sortOrder: 'asc' } },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });

      if (!subject) {
        return reply.status(404).send({
          statusCode: 404,
          message: 'Subject not found',
          error: 'Not Found',
        });
      }

      return subject;
    },
  );

  // POST /api/v1/subjects
  fastify.post(
    '/api/v1/subjects',
    {
      preHandler: [fastify.authenticate, requirePermission('subjects', 'create')],
    },
    async (request, reply) => {
      const parsed = CreateSubjectSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          statusCode: 400,
          message: 'Invalid subject data',
          errors: parsed.error.format(),
        });
      }

      const data = parsed.data;
      const subject = await fastify.prisma.subject.create({
        data: {
          batchId: data.batchId,
          name: data.name,
          iconUrl: data.iconUrl,
          sortOrder: data.sortOrder,
          status: RecordStatus.ACTIVE,
        },
      });

      return reply.status(201).send(subject);
    },
  );

  // PUT /api/v1/subjects/:id
  fastify.put(
    '/api/v1/subjects/:id',
    {
      preHandler: [fastify.authenticate, requirePermission('subjects', 'update')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = UpdateSubjectSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          statusCode: 400,
          message: 'Invalid subject update data',
          errors: parsed.error.format(),
        });
      }

      const existing = await fastify.prisma.subject.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({
          statusCode: 404,
          message: 'Subject not found',
          error: 'Not Found',
        });
      }

      const updated = await fastify.prisma.subject.update({
        where: { id },
        data: parsed.data,
      });

      return updated;
    },
  );

  fastify.delete('/api/v1/subjects/:id', { preHandler: [fastify.authenticate, requirePermission('subjects', 'delete')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const subject = await fastify.prisma.subject.findFirst({ where: { id, ...(request.user!.instituteId && request.user!.roleCode !== RoleType.SUPER_ADMIN ? { batch: { instituteId: request.user!.instituteId } } : {}) } });
    if (!subject) return reply.status(404).send({ statusCode: 404, message: 'Subject not found' });
    await fastify.prisma.subject.update({ where: { id }, data: { status: RecordStatus.DELETED } });
    return { message: 'Subject deleted successfully' };
  });
};
