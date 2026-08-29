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

  async getLessonTests(lessonId: string) {
    return this.prisma.test.findMany({
      where: {
        lessonId,
        status: { not: RecordStatus.DELETED },
      },
      include: {
        config: true,
        _count: { select: { sections: true, attempts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ──────────────────────────────────────────────
  // Real Video Reactions & Doubt Forum
  // ──────────────────────────────────────────────

  async getVideoReactions(videoId: string, userId?: string) {
    const reactions = await this.prisma.videoReaction.findMany({
      where: { videoId },
    });

    const counts: Record<string, number> = {
      LIKE: 0,
      HELPFUL: 0,
      BRAVO: 0,
      LOVE: 0,
      CELEBRATE: 0,
    };

    let userReaction: string | null = null;

    for (const r of reactions) {
      counts[r.reactionType] = (counts[r.reactionType] || 0) + 1;
      if (userId && r.userId === userId) {
        userReaction = r.reactionType;
      }
    }

    return {
      total: reactions.length,
      counts,
      userReaction,
    };
  }

  async toggleVideoReaction(videoId: string, userId: string, reactionType: any) {
    const existing = await this.prisma.videoReaction.findUnique({
      where: { videoId_userId: { videoId, userId } },
    });

    if (existing) {
      if (existing.reactionType === reactionType) {
        await this.prisma.videoReaction.delete({
          where: { id: existing.id },
        });
      } else {
        await this.prisma.videoReaction.update({
          where: { id: existing.id },
          data: { reactionType },
        });
      }
    } else {
      await this.prisma.videoReaction.create({
        data: {
          videoId,
          userId,
          reactionType,
        },
      });
    }

    return this.getVideoReactions(videoId, userId);
  }

  async getVideoComments(videoId: string) {
    const comments = await this.prisma.videoComment.findMany({
      where: { videoId },
      include: {
        replies: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });

    // Collect all user IDs
    const userIds = new Set<string>();
    for (const c of comments) {
      userIds.add(c.userId);
      for (const r of c.replies) {
        userIds.add(r.userId);
      }
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: Array.from(userIds) } },
      select: {
        id: true,
        fullName: true,
        identifier: true,
        avatarUrl: true,
        role: { select: { code: true, name: true } },
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    // Format top-level comments and replies with author profiles
    const topLevel = comments
      .filter((c) => !c.parentId)
      .map((c) => ({
        ...c,
        author: userMap.get(c.userId) || { fullName: 'User', role: { code: 'STUDENT', name: 'Student' } },
        replies: (c.replies || []).map((r) => ({
          ...r,
          author: userMap.get(r.userId) || { fullName: 'User', role: { code: 'STUDENT', name: 'Student' } },
        })),
      }));

    return topLevel;
  }

  async addVideoComment(videoId: string, userId: string, content: string, parentId?: string) {
    const comment = await this.prisma.videoComment.create({
      data: {
        videoId,
        userId,
        content,
        parentId: parentId || null,
      },
    });

    const author = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        identifier: true,
        avatarUrl: true,
        role: { select: { code: true, name: true } },
      },
    });

    return {
      ...comment,
      author,
      replies: [],
    };
  }

  async deleteVideoComment(commentId: string, userId: string, roleCode?: string) {
    const comment = await this.prisma.videoComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId && roleCode !== 'SUPER_ADMIN' && roleCode !== 'ADMIN') {
      throw new NotFoundException('Unauthorized to delete this comment');
    }

    return this.prisma.videoComment.delete({
      where: { id: commentId },
    });
  }
}
