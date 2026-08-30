// apps/api/src/modules/catalog/batches.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RecordStatus } from '@prisma/client';

@Injectable()
export class BatchesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(instituteId?: string, roleCode?: string, studentBatchId?: string) {
    // If student, filter by enrolled batch
    if (roleCode === 'STUDENT' && studentBatchId) {
      return this.prisma.batch.findMany({
        where: {
          id: studentBatchId,
          status: RecordStatus.ACTIVE,
        },
        include: {
          subjects: {
            where: { status: RecordStatus.ACTIVE },
            include: {
              _count: { select: { lessons: true, tests: true } },
            },
          },
          _count: { select: { students: true, tests: true } },
        },
        orderBy: { sortOrder: 'asc' },
      });
    }

    const where: any = {
      status: { not: RecordStatus.DELETED },
    };

    if (instituteId) {
      where.instituteId = instituteId;
    }

    return this.prisma.batch.findMany({
      where,
      include: {
        subjects: {
          where: { status: { not: RecordStatus.DELETED } },
          include: {
            _count: { select: { lessons: true, tests: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
        _count: { select: { students: true, tests: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(id: string, instituteId?: string) {
    const where: any = { id, status: { not: RecordStatus.DELETED } };
    if (instituteId) {
      where.instituteId = instituteId;
    }

    const batch = await this.prisma.batch.findFirst({
      where,
      include: {
        subjects: {
          where: { status: { not: RecordStatus.DELETED } },
          include: {
            lessons: {
              where: { status: { not: RecordStatus.DELETED } },
              include: {
                _count: { select: { videos: true, notes: true, tests: true } },
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        students: {
          include: {
            user: true,
          },
        },
        tests: {
          where: { status: { not: RecordStatus.DELETED } },
        },
        _count: { select: { students: true, tests: true } },
      },
    });

    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    return batch;
  }

  async create(instituteId: string | undefined, data: any) {
    let targetInstituteId = instituteId;
    if (!targetInstituteId) {
      const defaultInst = await this.prisma.institute.findFirst({
        orderBy: { createdAt: 'asc' },
      });
      targetInstituteId = defaultInst?.id;
    }

    if (!targetInstituteId) {
      const newInst = await this.prisma.institute.create({
        data: {
          name: 'Examly Institute',
          slug: 'examly-main',
        },
      });
      targetInstituteId = newInst.id;
    }

    return this.prisma.batch.create({
      data: {
        instituteId: targetInstituteId,
        name: data.name,
        code: data.code,
        description: data.description,
        imageUrl: data.imageUrl,
        priceNpr: data.priceNpr ? Number(data.priceNpr) : 0,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        status: data.status || RecordStatus.ACTIVE,
      },
    });
  }

  async update(id: string, instituteId: string | undefined, data: any) {
    await this.findOne(id, instituteId);
    return this.prisma.batch.update({
      where: { id },
      data: {
        name: data.name,
        code: data.code,
        description: data.description,
        imageUrl: data.imageUrl,
        priceNpr: data.priceNpr !== undefined ? Number(data.priceNpr) : undefined,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        status: data.status,
      },
    });
  }

  async delete(id: string, instituteId: string | undefined) {
    await this.findOne(id, instituteId);
    return this.prisma.batch.update({
      where: { id },
      data: { status: RecordStatus.DELETED, deletedAt: new Date() },
    });
  }

  async getStudents(batchId: string) {
    const users = await this.prisma.user.findMany({
      where: {
        studentProfile: { batchId },
        status: { not: RecordStatus.DELETED },
      },
      include: {
        studentProfile: {
          include: { batch: { select: { id: true, name: true, code: true } } },
        },
        _count: { select: { testAttempts: true } },
      },
      orderBy: { fullName: 'asc' },
    });

    if (users.length === 0) {
      const profiles = await this.prisma.studentProfile.findMany({
        where: { batchId },
        include: {
          user: true,
          batch: { select: { id: true, name: true, code: true } },
        },
      });

      return profiles
        .filter((p) => p.user && p.user.status !== RecordStatus.DELETED)
        .map((p) => ({
          ...p.user,
          studentProfile: p,
          _count: { testAttempts: 0 },
        }));
    }

    return users;
  }

  async enrollStudents(batchId: string, studentIds: string[]) {
    await this.prisma.studentProfile.updateMany({
      where: {
        OR: [
          { userId: { in: studentIds } },
          { id: { in: studentIds } },
        ],
      },
      data: { batchId },
    });
    return { success: true, count: studentIds.length };
  }

  async removeStudent(batchId: string, studentId: string) {
    await this.prisma.studentProfile.updateMany({
      where: {
        OR: [
          { userId: studentId },
          { id: studentId },
        ],
        batchId,
      },
      data: { batchId: null },
    });
    return { success: true, message: 'Student unassigned from batch' };
  }

  async getTeachers(batchId: string) {
    return this.prisma.user.findMany({
      where: {
        OR: [
          { role: { code: 'TEACHER' } },
          { teacherProfile: { isNot: null } },
        ],
        status: { not: RecordStatus.DELETED },
      },
      include: {
        teacherProfile: true,
      },
      orderBy: { fullName: 'asc' },
    });
  }

  async getBatchTests(batchId: string) {
    return this.prisma.test.findMany({
      where: {
        batchId,
        status: { not: RecordStatus.DELETED },
      },
      include: {
        config: true,
        _count: { select: { sections: true, attempts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
