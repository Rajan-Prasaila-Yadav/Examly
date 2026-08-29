// apps/api/src/modules/catalog/batches.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
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
      },
    });

    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    return batch;
  }

  async create(instituteId: string, data: any) {
    return this.prisma.batch.create({
      data: {
        instituteId,
        name: data.name,
        code: data.code,
        description: data.description,
        imageUrl: data.imageUrl,
        priceNpr: data.priceNpr || 0,
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
      data,
    });
  }

  async delete(id: string, instituteId: string | undefined) {
    await this.findOne(id, instituteId);
    return this.prisma.batch.update({
      where: { id },
      data: { status: RecordStatus.DELETED, deletedAt: new Date() },
    });
  }
}
