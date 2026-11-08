// apps/api/src/fastify/routes/batches.routes.ts
import { FastifyPluginAsync } from 'fastify';
import { batchWorkspaceRoutes } from './batch-workspace.routes';
import { contentRoutes } from './content.routes';
import { z } from 'zod';
import { requirePermission, hasPermission } from '../plugins/rbac.plugin';
import { RecordStatus, RoleType } from '@prisma/client';
import ExcelJS = require('exceljs');
import PdfPrinter = require('pdfmake');

const CreateBatchSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: z.string().trim().min(2).max(50),
  instituteId: z.string().min(1).optional(),
  description: z.string().trim().max(2000).optional(),
  bannerUrl: z.string().url().optional().or(z.literal('')),
  price: z.number().int().min(0).max(2147483647).optional(),
  priceNpr: z.number().int().min(0).max(2147483647).optional(),
  startDate: z.string().refine(v => !v || !Number.isNaN(Date.parse(v)), 'Enter a valid date').nullable().optional(),
  endDate: z.string().refine(v => !v || !Number.isNaN(Date.parse(v)), 'Enter a valid date').nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  status: z.enum(['ACTIVE', 'HIDDEN']).optional(),
});

const UpdateBatchSchema = CreateBatchSchema.partial();

const BatchQuerySchema = z.object({
  status: z.nativeEnum(RecordStatus).optional(),
  search: z.string().optional(),
  instituteId: z.string().min(1).optional(),
});

function batchWriteError(error: any): never {
  if (error.code === 'P2002') {
    const conflict: any = new Error('This batch code is already in use in this institute');
    conflict.statusCode = 409;
    throw conflict;
  }
  throw error;
}

export const batchesRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(batchWorkspaceRoutes);
  await fastify.register(contentRoutes);
  const accessibleBatch = async (id: string, user: {userId:string;instituteId?:string|null;roleCode:RoleType}) => {
    if (user.roleCode !== RoleType.SUPER_ADMIN && !user.instituteId) return false;
    if (user.roleCode === RoleType.STUDENT) {
      const profile = await fastify.prisma.studentProfile.findUnique({where:{userId:user.userId},select:{batchId:true}});
      if (profile?.batchId !== id) return false;
    }
    return !!await fastify.prisma.batch.findFirst({where:{id,status:user.roleCode===RoleType.STUDENT?RecordStatus.ACTIVE:{not:RecordStatus.DELETED},...(user.roleCode!==RoleType.SUPER_ADMIN?{instituteId:user.instituteId}:{})},select:{id:true}});
  };
  // Metadata is scoped independently of whether an institute already has batches.
  fastify.get('/api/v1/batches/options', {
    preHandler: [fastify.authenticate, requirePermission('batches', 'read')],
  }, async (request) => {
    const user = request.user!;
    const can = async (action:string) => hasPermission(user,'batches',action);
    const institutes = await fastify.prisma.institute.findMany({
      where: { status: RecordStatus.ACTIVE, ...(user.roleCode === RoleType.SUPER_ADMIN ? {} : { id: user.instituteId || '__none__' }) },
      select: { id: true, name: true }, orderBy: { name: 'asc' },
    });
    return { institutes, permissions: { create: await can('create'), update: await can('update'), delete: await can('delete') } };
  });
  fastify.post('/api/v1/batches/export', { preHandler: [fastify.authenticate, requirePermission('batches', 'read')] }, async (request, reply) => {
    const parsed = z.object({ format: z.enum(['xlsx','pdf']), ids: z.array(z.string()).max(2000).optional(), search: z.string().optional(), status: z.nativeEnum(RecordStatus).optional(), instituteId: z.string().optional() }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: 'Invalid export options' });
    const { format, ids, ...filters } = parsed.data;
    const qs = new URLSearchParams(Object.entries(filters).filter(([,v]) => !!v) as [string,string][]);
    // Reuse the authenticated, institute-scoped list. Never trust client-supplied rows.
    const result = await fastify.inject({ method: 'GET', url: `/api/v1/batches?${qs}`, headers: { authorization: request.headers.authorization! } });
    if (result.statusCode !== 200) return reply.code(result.statusCode).send(result.json());
    const rows = result.json().filter((b: any) => !ids || ids.includes(b.id));
    const headings = ['Batch','Code','Status','Subjects','Students','Tests','Fee (NPR)'];
    const values = rows.map((b: any) => [b.name,b.code,b.status,b.subjects.length,b._count.students,b.tests.length,b.priceNpr]);
    reply.header('Content-Disposition', `attachment; filename="Examly-batches.${format}"`).header('Cache-Control','no-store');
    if (format === 'xlsx') {
      const book = new ExcelJS.Workbook(); const sheet = book.addWorksheet('Batches');
      sheet.addRow(headings); sheet.addRows(values); sheet.getRow(1).font = { bold:true, color:{argb:'FF5B4FCF'} };
      sheet.columns.forEach((column,i) => { column.width = i===0 ? 36 : 20; });
      return reply.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').send(Buffer.from(await book.xlsx.writeBuffer()));
    }
    const printer = new PdfPrinter({ Helvetica: {normal:'Helvetica',bold:'Helvetica-Bold',italics:'Helvetica-Oblique',bolditalics:'Helvetica-BoldOblique'} });
    const doc = printer.createPdfKitDocument({ pageOrientation:'landscape', defaultStyle:{font:'Helvetica',fontSize:10}, content:[{text:'Examly | Batches',fontSize:20,bold:true,color:'#5B4FCF',margin:[0,0,0,16]},{table:{headerRows:1,widths:['*',90,65,55,55,50,70],body:[headings.map(text=>({text,bold:true})),...values]},layout:'lightHorizontalLines'}] });
    const bytes = await new Promise<Buffer>((resolve,reject)=>{const chunks:Buffer[]=[];doc.on('data',c=>chunks.push(c));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);doc.end();});
    return reply.type('application/pdf').send(bytes);
  });
  // GET /api/v1/batches (Protected, student-filtered or institute-scoped)
  fastify.get(
    '/api/v1/batches',
    {
      preHandler: [fastify.authenticate, requirePermission('batches', 'read')],
    },
    async (request, reply) => {
      const user = request.user!;
      const parsedQuery = BatchQuerySchema.safeParse(request.query);
      if (!parsedQuery.success) return reply.code(400).send({ message: 'Invalid batch filters' });
      const query = parsedQuery.data;
      if (user.roleCode !== RoleType.SUPER_ADMIN && !user.instituteId) return [];

      // Student enrolled batch optimization
      if (user.roleCode === RoleType.STUDENT) {
        const studentProfile = await fastify.prisma.studentProfile.findUnique({
          where: { userId: user.userId },
          select: { batchId: true },
        });

        const batches = await fastify.prisma.batch.findMany({
          where: {
            ...(studentProfile?.batchId ? { id: studentProfile.batchId } : {}),
            status: RecordStatus.ACTIVE,
            instituteId: user.instituteId,
            ...(query.search ? { OR: [{ name: { contains: query.search, mode: 'insensitive' } }, { code: { contains: query.search, mode: 'insensitive' } }] } : {}),
          },
          include: {
            subjects: {
              where: { status: RecordStatus.ACTIVE },
              include: {
                _count: { select: { lessons: true } },
              },
              orderBy: { sortOrder: 'asc' },
            },
            tests: {
              where: { status: RecordStatus.ACTIVE, isPublished: true },
              select: { id: true, isPublished: true, status: true },
            },
            _count: { select: { students: true, faculty: {where:{user:{status:{not:RecordStatus.DELETED}}}} } },
          },
          orderBy: { sortOrder: 'asc' },
        });
        return batches;
      }

      const where: any = {
        status: query.status || { not: RecordStatus.DELETED },
      };

      if (user.roleCode !== RoleType.SUPER_ADMIN) where.instituteId = user.instituteId;
      else if (query.instituteId) where.instituteId = query.instituteId;
      if (user.roleCode === RoleType.TEACHER) {
        where.status = RecordStatus.ACTIVE;
      }

      if (query.search) {
        where.OR = [
          { name: { contains: query.search, mode: 'insensitive' } },
          { code: { contains: query.search, mode: 'insensitive' } },
        ];
      }

      const batches = await fastify.prisma.batch.findMany({
        where,
        include: {
          institute: { select: { id: true, name: true } },
          subjects: {
            where: { status: { not: RecordStatus.DELETED } },
            include: {
              _count: { select: { lessons: true } },
              lessons: { where: { status: { not: RecordStatus.DELETED } }, select: { _count: { select: { notes: {where:{status:{not:RecordStatus.DELETED}}}, videos: {where:{status:{not:RecordStatus.DELETED}}} } } } },
            },
            orderBy: { sortOrder: 'asc' },
          },
          tests: {
            where: { status: { not: RecordStatus.DELETED } },
            select: { id: true, isPublished: true, status: true },
          },
          _count: { select: { students: { where: { user: { status: { not: RecordStatus.DELETED } } } }, faculty: {where:{user:{status:{not:RecordStatus.DELETED}}}} } },
        },
        orderBy: { sortOrder: 'asc' },
      });

      return batches;
    },
  );

  // GET /api/v1/batches/:id (Optimized without N+1 student loading)
  fastify.get(
    '/api/v1/batches/:id',
    {
      preHandler: [fastify.authenticate, requirePermission('batches', 'read')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;

      const where: any = { id, status: { not: RecordStatus.DELETED } };
      if (user.roleCode !== RoleType.SUPER_ADMIN && !user.instituteId) return reply.code(404).send({ message: 'Batch not found' });
      if (user.roleCode === RoleType.STUDENT) {
        const profile = await fastify.prisma.studentProfile.findUnique({ where: { userId: user.userId }, select: { batchId: true } });
        if (profile?.batchId !== id) return reply.code(404).send({ message: 'Batch not found' });
        where.status = RecordStatus.ACTIVE;
      }
      if (user.instituteId && user.roleCode !== RoleType.SUPER_ADMIN) {
        where.instituteId = user.instituteId;
      }

      const batch = await fastify.prisma.batch.findFirst({
        where,
        include: {
          subjects: {
            where: { status: { not: RecordStatus.DELETED } },
            include: {
              lessons: {
                where: { status: { not: RecordStatus.DELETED } },
                include: {
                  _count: { select: { videos: true, notes: true, resources: true, tests: true } },
                },
                orderBy: { sortOrder: 'asc' },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
          tests: {
            where: { status: { not: RecordStatus.DELETED } },
            select: { id: true, title: true, isPublished: true, testStatus: true },
          },
          _count: { select: { students: true, tests: true } },
        },
      });

      if (!batch) {
        return reply.status(404).send({
          statusCode: 404,
          message: 'Batch not found or inaccessible',
          error: 'Not Found',
        });
      }

      return batch;
    },
  );

  // POST /api/v1/batches (Admin/SuperAdmin)
  fastify.post(
    '/api/v1/batches',
    {
      preHandler: [fastify.authenticate, requirePermission('batches', 'create')],
    },
    async (request, reply) => {
      const parsed = CreateBatchSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          statusCode: 400,
          message: 'Invalid batch creation data',
          errors: parsed.error.format(),
        });
      }

      const user = request.user!;
      const data = parsed.data;
      const instituteId = user.roleCode === RoleType.SUPER_ADMIN ? (data.instituteId || user.instituteId) : user.instituteId;
      if (!instituteId || (user.roleCode !== RoleType.SUPER_ADMIN && data.instituteId && data.instituteId !== instituteId)) return reply.code(400).send({ message: 'Select an accessible institute', field: 'instituteId' });
      const institute = await fastify.prisma.institute.findFirst({ where: { id: instituteId, status: RecordStatus.ACTIVE }, select: { id: true } });
      if (!institute) return reply.code(400).send({ message: 'Institute is unavailable', field: 'instituteId' });
      if (data.startDate && data.endDate && new Date(data.endDate) < new Date(data.startDate)) return reply.code(400).send({ message: 'End date must be on or after start date', field: 'endDate' });
      if (data.price !== undefined && data.priceNpr !== undefined && data.price !== data.priceNpr) return reply.code(400).send({ message: 'Conflicting fee values', field: 'priceNpr' });
      const duplicate = await fastify.prisma.batch.findFirst({ where: { instituteId, code: { equals: data.code, mode: 'insensitive' }, status: { not: RecordStatus.DELETED } }, select: { id: true } });
      if (duplicate) return reply.code(409).send({ message: 'This batch code is already in use in this institute', field: 'code' });

      const batch = await fastify.prisma.batch.create({
        data: {
          name: data.name,
          code: data.code,
          description: data.description,
          imageUrl: data.bannerUrl || null,
          priceNpr: data.priceNpr ?? data.price ?? 0,
          startDate: data.startDate ? new Date(data.startDate) : null,
          endDate: data.endDate ? new Date(data.endDate) : null,
          sortOrder: data.sortOrder,
          instituteId,
          status: data.status || RecordStatus.ACTIVE,
        },
      }).catch(batchWriteError);

      return reply.status(201).send(batch);
    },
  );

  // PUT /api/v1/batches/:id (Admin/SuperAdmin)
  fastify.put(
    '/api/v1/batches/:id',
    {
      preHandler: [fastify.authenticate, requirePermission('batches', 'update')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;

      const parsed = UpdateBatchSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          statusCode: 400,
          message: 'Invalid batch update data',
          errors: parsed.error.format(),
        });
      }

      const existing = await fastify.prisma.batch.findUnique({ where: { id } });
      if (!existing || existing.status === RecordStatus.DELETED || (user.roleCode !== RoleType.SUPER_ADMIN && (!user.instituteId || existing.instituteId !== user.instituteId))) {
        return reply.status(404).send({
          statusCode: 404,
          message: 'Batch not found',
          error: 'Not Found',
        });
      }

      const data = parsed.data;
      if (data.instituteId && data.instituteId !== existing.instituteId) return reply.code(400).send({ message: 'Moving a batch between institutes is not supported', field: 'instituteId' });
      const startDate = data.startDate === undefined ? existing.startDate : data.startDate ? new Date(data.startDate) : null;
      const endDate = data.endDate === undefined ? existing.endDate : data.endDate ? new Date(data.endDate) : null;
      if (startDate && endDate && endDate < startDate) return reply.code(400).send({ message: 'End date must be on or after start date', field: 'endDate' });
      if (data.price !== undefined && data.priceNpr !== undefined && data.price !== data.priceNpr) return reply.code(400).send({ message: 'Conflicting fee values', field: 'priceNpr' });
      if (data.code) {
        const duplicate = await fastify.prisma.batch.findFirst({ where: { instituteId: existing.instituteId, id: { not: id }, code: { equals: data.code, mode: 'insensitive' }, status: { not: RecordStatus.DELETED } }, select: { id: true } });
        if (duplicate) return reply.code(409).send({ message: 'This batch code is already in use in this institute', field: 'code' });
      }
      const updated = await fastify.prisma.batch.update({
        where: { id },
        data: {
          name: data.name,
          code: data.code,
          description: data.description,
          imageUrl: data.bannerUrl !== undefined ? data.bannerUrl : undefined,
          priceNpr: data.priceNpr ?? data.price,
          startDate,
          endDate,
          sortOrder: data.sortOrder,
          status: data.status,
        },
      }).catch(batchWriteError);

      return updated;
    },
  );

  // DELETE /api/v1/batches/:id (Soft delete)
  fastify.delete(
    '/api/v1/batches/:id',
    {
      preHandler: [fastify.authenticate, requirePermission('batches', 'delete')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;

      const existing = await fastify.prisma.batch.findUnique({ where: { id } });
      if (!existing || (user.roleCode !== RoleType.SUPER_ADMIN && (!user.instituteId || existing.instituteId !== user.instituteId))) {
        return reply.status(404).send({
          statusCode: 404,
          message: 'Batch not found',
          error: 'Not Found',
        });
      }

      await fastify.prisma.batch.update({
        where: { id },
        data: { status: RecordStatus.DELETED, deletedAt: new Date() },
      });

      return { message: 'Batch deleted successfully' };
    },
  );

  // GET /api/v1/batches/:id/students
  fastify.get(
    '/api/v1/batches/:id/students',
    {
      preHandler: [fastify.authenticate, requirePermission('batches', 'read')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;

      if (user.roleCode === RoleType.STUDENT || !await accessibleBatch(id,user)) return reply.code(404).send({message:'Batch not found or inaccessible'});
      const profiles = await fastify.prisma.studentProfile.findMany({
        where: {
          batchId: id,
          user: {
            status: { not: RecordStatus.DELETED },
            ...(user.instituteId && user.roleCode !== RoleType.SUPER_ADMIN ? { instituteId: user.instituteId } : {}),
          },
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              identifier: true,
              avatarUrl: true,
              status: true,
              createdAt: true,
            },
          },
        },
      });

      return profiles.map((p) => ({
        ...p.user,
        studentProfile: {
          id: p.id,
          batchId: p.batchId,
          rollNumber: p.rollNumber,
          province: p.province,
          district: p.district,
          municipality: p.municipality,
          wardNumber: p.wardNumber,
          parentPhone: p.parentPhone,
        },
      }));
    },
  );

  // GET /api/v1/batches/:id/teachers
  fastify.get(
    '/api/v1/batches/:id/teachers',
    {
      preHandler: [fastify.authenticate, requirePermission('batches', 'read')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;

      // Find subjects in this batch and their faculty teachers
      if (!await accessibleBatch(id,user)) return reply.code(404).send({message:'Batch not found or inaccessible'});
      const batch = await fastify.prisma.batch.findUnique({
        where: { id },
        select: { instituteId: true },
      });

      if (!batch) {
        return reply.status(404).send({ statusCode: 404, message: 'Batch not found' });
      }

      // Only teachers explicitly assigned to this batch.
      const teachers = await fastify.prisma.user.findMany({
        where: {
          role: { code: RoleType.TEACHER },
          batchFaculty: { some: { batchId: id } },
          status: { not: RecordStatus.DELETED },
          ...(batch.instituteId ? { instituteId: batch.instituteId } : {}),
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          identifier: true,
          avatarUrl: true,
          status: true,
        },
      });

      return teachers;
    },
  );

  // GET /api/v1/batches/:id/tests
  fastify.get(
    '/api/v1/batches/:id/tests',
    {
      preHandler: [fastify.authenticate, requirePermission('tests', 'read')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;
      const isStudent = user.roleCode === RoleType.STUDENT;
      if (!await accessibleBatch(id,user)) return reply.code(404).send({message:'Batch not found or inaccessible'});

      const tests = await fastify.prisma.test.findMany({
        where: {
          batchId: id,
          status: isStudent ? RecordStatus.ACTIVE : { not: RecordStatus.DELETED },
          ...(isStudent ? { isPublished: true } : {}),
        },
        select: {
          id: true,
          title: true,
          description: true,
          durationMinutes: true,
          totalMarks: true,
          passMarks: true,
          startDateTime: true,
          endDateTime: true,
          isPublished: true,
          testStatus: true,
          _count: { select: { sections: true, attempts: true } },
        },
        orderBy: { startDateTime: 'desc' },
      });

      return tests;
    },
  );
};

