// apps/api/src/modules/catalog/lessons.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { RecordStatus, VideoProvider } from '@prisma/client';

@Injectable()
export class LessonsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id, status: { not: RecordStatus.DELETED } },
      include: {
        subject: { include: { batch: true } },
        videos: {
          where: { status: { not: RecordStatus.DELETED } },
          include: { _count: { select: { comments: true, reactions: true } } },
          orderBy: { sortOrder: 'asc' },
        },
        notes: {
          where: { status: { not: RecordStatus.DELETED } },
          orderBy: { sortOrder: 'asc' },
        },
        resources: {
          orderBy: { sortOrder: 'asc' },
        },
        tests: {
          where: { status: { not: RecordStatus.DELETED } },
          include: { config: true },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    return lesson;
  }

  async create(subjectId: string, data: { name: string; description?: string; sortOrder?: number }) {
    return this.prisma.lesson.create({
      data: {
        subjectId,
        name: data.name,
        description: data.description,
        sortOrder: data.sortOrder || 0,
        status: RecordStatus.ACTIVE,
      },
    });
  }

  async update(id: string, data: { name?: string; description?: string; sortOrder?: number; status?: RecordStatus }) {
    return this.prisma.lesson.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.lesson.update({
      where: { id },
      data: { status: RecordStatus.DELETED },
    });
  }

  async addVideo(lessonId: string, data: { title: string; videoUrl: string; provider?: VideoProvider; durationSeconds?: number; isFreePreview?: boolean; allowDownload?: boolean }) {
    return this.prisma.video.create({
      data: {
        lessonId,
        title: data.title,
        videoUrl: data.videoUrl,
        provider: data.provider || VideoProvider.YOUTUBE,
        durationSeconds: data.durationSeconds || 0,
        isFreePreview: data.isFreePreview || false,
        allowDownload: data.allowDownload || false,
        status: RecordStatus.ACTIVE,
      },
    });
  }

  async updateVideo(videoId: string, data: { title?: string; videoUrl?: string; durationSeconds?: number; isFreePreview?: boolean; status?: RecordStatus }) {
    return this.prisma.video.update({
      where: { id: videoId },
      data,
    });
  }

  async deleteVideo(videoId: string) {
    return this.prisma.video.update({
      where: { id: videoId },
      data: { status: RecordStatus.DELETED },
    });
  }

  async addNote(lessonId: string, data: { title: string; fileUrl: string; fileSizeBytes?: number }) {
    return this.prisma.note.create({
      data: {
        lessonId,
        title: data.title,
        fileUrl: data.fileUrl,
        fileSizeBytes: data.fileSizeBytes || 0,
        status: RecordStatus.ACTIVE,
      },
    });
  }

  async updateNote(noteId: string, data: { title?: string; fileUrl?: string; fileSizeBytes?: number; status?: RecordStatus }) {
    return this.prisma.note.update({
      where: { id: noteId },
      data,
    });
  }

  async deleteNote(noteId: string) {
    return this.prisma.note.update({
      where: { id: noteId },
      data: { status: RecordStatus.DELETED },
    });
  }

  async addResourceNode(lessonId: string, data: { title: string; isFolder?: boolean; parentId?: string; fileUrl?: string; fileType?: string }) {
    return this.prisma.resourceNode.create({
      data: {
        lessonId,
        title: data.title,
        isFolder: data.isFolder || false,
        parentId: data.parentId || null,
        fileUrl: data.fileUrl,
        fileType: data.fileType,
      },
    });
  }

  async deleteResourceNode(nodeId: string) {
    return this.prisma.resourceNode.delete({
      where: { id: nodeId },
    });
  }
}
