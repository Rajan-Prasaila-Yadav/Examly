// apps/api/src/modules/catalog/notes.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RecordStatus } from '@prisma/client';

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  async findByLesson(lessonId: string) {
    return this.prisma.note.findMany({
      where: { lessonId, status: RecordStatus.ACTIVE },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(id: string) {
    const note = await this.prisma.note.findUnique({
      where: { id },
      include: { lesson: true },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    return note;
  }

  async create(lessonId: string, body: any) {
    const { title, fileUrl, fileSizeBytes, sortOrder } = body;

    // Verify lesson exists
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    return this.prisma.note.create({
      data: {
        lessonId,
        title,
        fileUrl,
        fileSizeBytes: fileSizeBytes || 0,
        sortOrder: sortOrder || 0,
        status: RecordStatus.ACTIVE,
      },
    });
  }

  async update(id: string, body: any) {
    const { title, fileUrl, fileSizeBytes, sortOrder, status } = body;

    return this.prisma.note.update({
      where: { id },
      data: {
        title,
        fileUrl,
        fileSizeBytes,
        sortOrder,
        status,
      },
    });
  }

  async delete(id: string) {
    // Soft delete
    return this.prisma.note.update({
      where: { id },
      data: { status: RecordStatus.DELETED },
    });
  }

  async reorder(ids: string[]) {
    if (!Array.isArray(ids) || ids.length === 0) return { success: true };
    const updates = ids.map((id, index) =>
      this.prisma.note.update({
        where: { id },
        data: { sortOrder: index },
      }),
    );
    await this.prisma.$transaction(updates);
    return { success: true, count: ids.length };
  }
}
