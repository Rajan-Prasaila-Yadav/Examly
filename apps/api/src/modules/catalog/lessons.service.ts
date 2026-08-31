import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RecordStatus, VideoProvider } from '@prisma/client';
import { VideoGateway } from './video.gateway';

@Injectable()
export class LessonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly videoGateway: VideoGateway,
  ) {}

  async findOne(id: string, userRole?: string) {
    const isStudent = userRole === 'STUDENT';
    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id,
        status: isStudent ? RecordStatus.ACTIVE : { not: RecordStatus.DELETED },
      },
      include: {
        subject: {
          include: {
            batch: true,
            lessons: {
              where: {
                status: isStudent ? RecordStatus.ACTIVE : { not: RecordStatus.DELETED },
              },
              select: {
                id: true,
                name: true,
                sortOrder: true,
                _count: { select: { videos: true, notes: true, resources: true, tests: true } },
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
        videos: {
          where: {
            status: isStudent ? RecordStatus.ACTIVE : { not: RecordStatus.DELETED },
          },
          include: { _count: { select: { comments: true, reactions: true } } },
          orderBy: { sortOrder: 'asc' },
        },
        notes: {
          where: {
            status: isStudent ? RecordStatus.ACTIVE : { not: RecordStatus.DELETED },
          },
          orderBy: { sortOrder: 'asc' },
        },
        resources: {
          orderBy: { sortOrder: 'asc' },
        },
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

    const userIds = reactions.map((r) => r.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        fullName: true,
        avatarUrl: true,
        role: { select: { code: true, name: true } },
      },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const counts: Record<string, number> = {
      LIKE: 0,
      HELPFUL: 0,
      BRAVO: 0,
      LOVE: 0,
      CELEBRATE: 0,
    };

    const usersByReaction: Record<string, Array<{ id: string; fullName: string; avatarUrl?: string | null; role?: any }>> = {
      LIKE: [],
      HELPFUL: [],
      BRAVO: [],
      LOVE: [],
      CELEBRATE: [],
    };

    let userReaction: string | null = null;

    for (const r of reactions) {
      counts[r.reactionType] = (counts[r.reactionType] || 0) + 1;
      const u = userMap.get(r.userId);
      if (u) {
        if (!usersByReaction[r.reactionType]) {
          usersByReaction[r.reactionType] = [];
        }
        usersByReaction[r.reactionType].push(u);
      }
      if (userId && r.userId === userId) {
        userReaction = r.reactionType;
      }
    }

    return {
      total: reactions.length,
      counts,
      usersByReaction,
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

    const updatedReactions = await this.getVideoReactions(videoId, userId);
    this.videoGateway.broadcastVideoReaction(videoId, updatedReactions);
    return updatedReactions;
  }

  async getVideoComments(videoId: string, currentUserId?: string) {
    const comments = await this.prisma.videoComment.findMany({
      where: { videoId },
      include: {
        reactions: true,
        replies: {
          include: {
            reactions: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });

    // Collect all user IDs
    const userIds = new Set<string>();
    for (const c of comments) {
      userIds.add(c.userId);
      for (const cr of c.reactions || []) {
        userIds.add(cr.userId);
      }
      for (const r of c.replies) {
        userIds.add(r.userId);
        for (const rr of r.reactions || []) {
          userIds.add(rr.userId);
        }
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

    const formatReactions = (reactions: any[]) => {
      const counts: Record<string, number> = { LIKE: 0, LOVE: 0, HELPFUL: 0, BRAVO: 0, CELEBRATE: 0 };
      const usersByReaction: Record<string, any[]> = { LIKE: [], LOVE: [], HELPFUL: [], BRAVO: [], CELEBRATE: [] };
      let userReaction: string | null = null;

      for (const r of reactions || []) {
        counts[r.reactionType] = (counts[r.reactionType] || 0) + 1;
        const u = userMap.get(r.userId);
        if (u) {
          if (!usersByReaction[r.reactionType]) usersByReaction[r.reactionType] = [];
          usersByReaction[r.reactionType].push(u);
        }
        if (currentUserId && r.userId === currentUserId) {
          userReaction = r.reactionType;
        }
      }

      return { total: (reactions || []).length, counts, usersByReaction, userReaction };
    };

    // Format top-level comments and replies with author profiles & reaction stats
    const topLevel = comments
      .filter((c) => !c.parentId)
      .map((c) => ({
        ...c,
        author: userMap.get(c.userId) || { fullName: 'User', role: { code: 'STUDENT', name: 'Student' } },
        reactionsData: formatReactions(c.reactions),
        replies: (c.replies || []).map((r) => ({
          ...r,
          author: userMap.get(r.userId) || { fullName: 'User', role: { code: 'STUDENT', name: 'Student' } },
          reactionsData: formatReactions(r.reactions),
        })),
      }));

    return topLevel;
  }

  async toggleCommentReaction(commentId: string, userId: string, reactionType: any) {
    const existing = await this.prisma.commentReaction.findUnique({
      where: { commentId_userId: { commentId, userId } },
    });

    if (existing) {
      if (existing.reactionType === reactionType) {
        await this.prisma.commentReaction.delete({
          where: { id: existing.id },
        });
      } else {
        await this.prisma.commentReaction.update({
          where: { id: existing.id },
          data: { reactionType },
        });
      }
    } else {
      await this.prisma.commentReaction.create({
        data: {
          commentId,
          userId,
          reactionType,
        },
      });
    }

    const comment = await this.prisma.videoComment.findUnique({
      where: { id: commentId },
      include: { reactions: true },
    });

    if (comment?.videoId) {
      const userIds = comment.reactions.map((r) => r.userId);
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
          role: { select: { code: true, name: true } },
        },
      });
      const userMap = new Map(users.map((u) => [u.id, u]));

      const counts: Record<string, number> = { LIKE: 0, LOVE: 0, HELPFUL: 0, BRAVO: 0, CELEBRATE: 0 };
      const usersByReaction: Record<string, any[]> = { LIKE: [], LOVE: [], HELPFUL: [], BRAVO: [], CELEBRATE: [] };

      for (const r of comment.reactions) {
        counts[r.reactionType] = (counts[r.reactionType] || 0) + 1;
        const u = userMap.get(r.userId);
        if (u) {
          if (!usersByReaction[r.reactionType]) usersByReaction[r.reactionType] = [];
          usersByReaction[r.reactionType].push(u);
        }
      }

      const reactionPayload = {
        commentId,
        parentId: comment.parentId,
        counts,
        usersByReaction,
        total: comment.reactions.length,
      };

      this.videoGateway.broadcastCommentChange(comment.videoId, 'REACTION', reactionPayload);
    }

    return { success: true };
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

    const result = {
      ...comment,
      author,
      replies: [],
      reactionsData: { counts: {}, usersByReaction: {}, userReaction: null, total: 0 },
    };

    this.videoGateway.broadcastCommentChange(videoId, 'CREATE', result);
    return result;
  }

  async updateVideoComment(commentId: string, userId: string, content: string, roleCode?: string) {
    const comment = await this.prisma.videoComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId && roleCode !== 'SUPER_ADMIN' && roleCode !== 'ADMIN') {
      throw new ForbiddenException('Unauthorized to edit this comment');
    }

    const updated = await this.prisma.videoComment.update({
      where: { id: commentId },
      data: { content },
    });

    this.videoGateway.broadcastCommentChange(comment.videoId, 'UPDATE', updated);
    return updated;
  }

  async deleteVideoComment(commentId: string, userId: string, roleCode?: string) {
    const comment = await this.prisma.videoComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId && roleCode !== 'SUPER_ADMIN' && roleCode !== 'ADMIN') {
      throw new ForbiddenException('Unauthorized to delete this comment');
    }

    await this.prisma.videoComment.delete({
      where: { id: commentId },
    });

    this.videoGateway.broadcastCommentChange(comment.videoId, 'DELETE', {
      commentId,
      parentId: comment.parentId,
    });

    return { success: true };
  }

  async reorderLessons(ids: string[]) {
    if (!Array.isArray(ids) || ids.length === 0) return { success: true };
    const updates = ids.map((id, index) =>
      this.prisma.lesson.update({
        where: { id },
        data: { sortOrder: index },
      }),
    );
    await this.prisma.$transaction(updates);
    return { success: true, count: ids.length };
  }

  async reorderVideos(ids: string[]) {
    if (!Array.isArray(ids) || ids.length === 0) return { success: true };
    const updates = ids.map((id, index) =>
      this.prisma.video.update({
        where: { id },
        data: { sortOrder: index },
      }),
    );
    await this.prisma.$transaction(updates);
    return { success: true, count: ids.length };
  }

  async reorderNotes(ids: string[]) {
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

  async reorderResources(ids: string[]) {
    if (!Array.isArray(ids) || ids.length === 0) return { success: true };
    const updates = ids.map((id, index) =>
      this.prisma.resourceNode.update({
        where: { id },
        data: { sortOrder: index },
      }),
    );
    await this.prisma.$transaction(updates);
    return { success: true, count: ids.length };
  }

  async addVideosBulk(
    lessonId: string,
    videos: Array<{
      title: string;
      videoUrl: string;
      durationSeconds?: number;
      isFreePreview?: boolean;
    }>,
  ) {
    if (!Array.isArray(videos) || videos.length === 0) {
      return { success: true, count: 0, videos: [] };
    }

    const currentCount = await this.prisma.video.count({
      where: { lessonId },
    });

    const createOps = videos.map((v, idx) =>
      this.prisma.video.create({
        data: {
          lessonId,
          title: v.title?.trim() || `Video ${idx + 1}`,
          videoUrl: v.videoUrl?.trim(),
          durationSeconds: v.durationSeconds || 1800,
          isFreePreview: !!v.isFreePreview,
          sortOrder: currentCount + idx,
        },
      }),
    );

    const created = await this.prisma.$transaction(createOps);
    return { success: true, count: created.length, videos: created };
  }

  async getYouTubeMetadata(url: string) {
    if (!url) return { isValid: false, message: 'Please provide a video URL' };
    const videoIdMatch = url.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([^"&?\/\s]{11})/i,
    );
    const videoId = videoIdMatch ? videoIdMatch[1] : null;
    if (!videoId) {
      return { isValid: false, message: 'Invalid or incomplete YouTube video link.' };
    }

    let title = '';
    let durationSeconds = 0;
    let authorName = '';
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    let isUnavailable = false;

    // 1. Fetch oEmbed for clean title and author
    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      );
      if (oembedRes.ok) {
        const data: any = await oembedRes.json();
        title = data.title || '';
        authorName = data.author_name || '';
      } else if (oembedRes.status === 404 || oembedRes.status === 401) {
        isUnavailable = true;
      }
    } catch (e) {
      // ignore
    }

    // 2. Fetch watch page to extract exact duration
    try {
      const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      if (pageRes.ok) {
        const html = await pageRes.text();

        if (html.includes('Video unavailable') || html.includes('This video is private')) {
          isUnavailable = true;
        }

        const approxMatch = html.match(/"approxDurationMs"\s*:\s*"(\d+)"/);
        const lengthMatch = html.match(/"lengthSeconds"\s*:\s*"(\d+)"/);

        if (approxMatch && approxMatch[1]) {
          durationSeconds = Math.round(parseInt(approxMatch[1], 10) / 1000);
        } else if (lengthMatch && lengthMatch[1]) {
          durationSeconds = parseInt(lengthMatch[1], 10);
        }

        if (!title) {
          const titleMatch = html.match(/<title>(.*?)<\/title>/);
          if (titleMatch && titleMatch[1]) {
            title = titleMatch[1].replace(' - YouTube', '').trim();
          }
        }
      }
    } catch (e) {
      // ignore
    }

    if (isUnavailable && !title) {
      return {
        isValid: false,
        videoId,
        message: 'This YouTube video is unavailable, private, or has been removed.',
      };
    }

    const hrs = Math.floor(durationSeconds / 3600);
    const mins = Math.floor((durationSeconds % 3600) / 60);
    const secs = durationSeconds % 60;

    const formattedDuration =
      hrs > 0
        ? `${hrs} hr ${mins} min ${secs} sec`
        : `${mins} min ${secs} sec`;

    const formattedTimecode =
      hrs > 0
        ? `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        : `${mins}:${secs.toString().padStart(2, '0')}`;

    return {
      isValid: true,
      videoId,
      title,
      authorName,
      durationSeconds,
      durationMinutes: Math.ceil(durationSeconds / 60) || 45,
      hours: hrs,
      minutes: mins,
      seconds: secs,
      formattedDuration,
      formattedTimecode,
      thumbnailUrl,
    };
  }

  async getPlaylistMetadata(urlOrId: string) {
    if (!urlOrId) {
      return { success: false, error: 'Please enter a YouTube playlist link or ID.' };
    }

    let playlistId = urlOrId.trim();
    const listMatch = playlistId.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    if (listMatch) {
      playlistId = listMatch[1];
    }

    try {
      const pageRes = await fetch(`https://www.youtube.com/playlist?list=${playlistId}`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      const html = await pageRes.text();
      const keyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
      const apiKey = keyMatch ? keyMatch[1] : 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';

      const res = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${apiKey}&prettyPrint=false`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: {
            client: {
              clientName: 'WEB',
              clientVersion: '2.20240101.00.00',
              hl: 'en',
              gl: 'US',
            },
          },
          browseId: `VL${playlistId}`,
        }),
      });
      const data = await res.json();

      if (data.alerts && data.alerts.some((a: any) => a.alertRenderer?.type === 'ERROR')) {
        const errText =
          data.alerts[0]?.alertRenderer?.text?.runs?.[0]?.text ||
          'This YouTube playlist does not exist or is private.';
        return { success: false, error: errText };
      }

      function findLockups(obj: any, found: any[] = []) {
        if (!obj || typeof obj !== 'object') return found;
        if (obj.lockupViewModel) found.push({ type: 'lockup', data: obj.lockupViewModel });
        if (obj.playlistVideoRenderer) found.push({ type: 'legacy', data: obj.playlistVideoRenderer });
        for (const k of Object.keys(obj)) findLockups(obj[k], found);
        return found;
      }

      const rawList = findLockups(data);
      const videos: any[] = [];
      const seenIds = new Set<string>();

      for (const item of rawList) {
        if (item.type === 'legacy') {
          const v = item.data;
          if (!v.videoId || seenIds.has(v.videoId)) continue;
          seenIds.add(v.videoId);
          const title = v.title?.runs?.[0]?.text || v.title?.simpleText || '';
          const durationFormatted = v.lengthText?.simpleText || '30:00';
          const durationSeconds = parseInt(v.lengthSeconds || '0', 10);
          videos.push({
            videoId: v.videoId,
            title,
            videoUrl: `https://www.youtube.com/watch?v=${v.videoId}`,
            durationFormatted,
            durationMinutes: Math.ceil(durationSeconds / 60) || 30,
            durationSeconds: durationSeconds || 1800,
            thumbnailUrl: `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`,
          });
        } else {
          const v = item.data;
          let videoId = '';
          const buttons =
            v.contentImage?.thumbnailViewModel?.overlays?.flatMap(
              (o: any) => o.thumbnailHoverOverlayToggleActionsViewModel?.buttons || [],
            ) || [];
          for (const btn of buttons) {
            const vid =
              btn.toggleButtonViewModel?.defaultButtonViewModel?.buttonViewModel?.onTap?.innertubeCommand
                ?.signalServiceEndpoint?.actions?.[0]?.addToPlaylistCommand?.videoId;
            if (vid) {
              videoId = vid;
              break;
            }
          }
          if (!videoId) {
            videoId = v.rendererContext?.commandContext?.onTap?.innertubeCommand?.watchEndpoint?.videoId;
          }
          if (!videoId || seenIds.has(videoId)) continue;
          seenIds.add(videoId);

          const title = v.metadata?.lockupMetadataViewModel?.title?.content || '';

          let durationFormatted = '';
          const overlays = v.contentImage?.thumbnailViewModel?.overlays || [];
          for (const ov of overlays) {
            const badgeText =
              ov.thumbnailBadgeViewModel?.text ||
              ov.thumbnailOverlayTimeStatusRenderer?.text?.content ||
              ov.thumbnailOverlayTimeStatusRenderer?.text?.simpleText;
            if (badgeText && badgeText !== 'Now playing') {
              durationFormatted = badgeText;
              break;
            }
          }

          let durationSeconds = 1800;
          let durationMinutes = 30;
          if (durationFormatted) {
            const parts = durationFormatted.split(':').map(Number);
            if (parts.length === 2) {
              durationSeconds = parts[0] * 60 + parts[1];
              durationMinutes = Math.ceil(parts[0] + parts[1] / 60);
            } else if (parts.length === 3) {
              durationSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
              durationMinutes = Math.ceil(parts[0] * 60 + parts[1] + parts[2] / 60);
            }
          }

          videos.push({
            videoId,
            title,
            videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
            durationFormatted: durationFormatted || '30:00',
            durationMinutes,
            durationSeconds,
            thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          });
        }
      }

      const playlistTitle =
        data.header?.playlistHeaderRenderer?.title?.simpleText ||
        data.metadata?.playlistMetadataRenderer?.title ||
        data.microformat?.microformatDataRenderer?.title ||
        'YouTube Playlist';

      if (videos.length === 0) {
        return {
          success: false,
          error: 'No videos found in this playlist. Please verify the playlist link is public.',
        };
      }

      return {
        success: true,
        playlistId,
        playlistTitle,
        totalVideos: videos.length,
        videos,
      };
    } catch (e: any) {
      return {
        success: false,
        error: e.message || 'Failed to fetch playlist details. Please check the playlist URL.',
      };
    }
  }
}

