// apps/api/src/modules/catalog/subjects.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RecordStatus } from '@prisma/client';

@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByBatch(batchId: string, userRole?: string) {
    const isStudent = userRole === 'STUDENT';
    return this.prisma.subject.findMany({
      where: {
        batchId,
        status: isStudent ? RecordStatus.ACTIVE : { not: RecordStatus.DELETED },
      },
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
  }

  async findOne(id: string, userRole?: string) {
    const isStudent = userRole === 'STUDENT';
    const subject = await this.prisma.subject.findFirst({
      where: {
        id,
        status: isStudent ? RecordStatus.ACTIVE : { not: RecordStatus.DELETED },
      },
      include: {
        batch: true,
        tests: {
          where: {
            status: isStudent ? RecordStatus.ACTIVE : { not: RecordStatus.DELETED },
            ...(isStudent ? { isPublished: true } : {}),
          },
          include: {
            config: true,
            _count: { select: { sections: true, attempts: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
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
            tests: {
              where: {
                status: isStudent ? RecordStatus.ACTIVE : { not: RecordStatus.DELETED },
                ...(isStudent ? { isPublished: true } : {}),
              },
              include: {
                config: true,
                _count: { select: { sections: true, attempts: true } },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    return subject;
  }

  async create(batchId: string, data: { name: string; iconUrl?: string; sortOrder?: number }) {
    return this.prisma.subject.create({
      data: {
        batchId,
        name: data.name,
        iconUrl: data.iconUrl,
        sortOrder: data.sortOrder || 0,
        status: RecordStatus.ACTIVE,
      },
    });
  }

  async update(id: string, data: { name?: string; iconUrl?: string; sortOrder?: number; status?: RecordStatus }) {
    return this.prisma.subject.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.subject.update({
      where: { id },
      data: { status: RecordStatus.DELETED },
    });
  }

  async getSubjectTests(subjectId: string) {
    return this.prisma.test.findMany({
      where: {
        subjectId,
        status: { not: RecordStatus.DELETED },
      },
      include: {
        config: true,
        _count: { select: { sections: true, attempts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async reorder(ids: string[]) {
    if (!Array.isArray(ids) || ids.length === 0) return { success: true };
    const updates = ids.map((id, index) =>
      this.prisma.subject.update({
        where: { id },
        data: { sortOrder: index },
      }),
    );
    await this.prisma.$transaction(updates);
    return { success: true, count: ids.length };
  }
}
