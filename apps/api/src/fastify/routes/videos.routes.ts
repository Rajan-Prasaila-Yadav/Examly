// apps/api/src/fastify/routes/videos.routes.ts
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { RecordStatus, ReactionType } from '@prisma/client';

const CreateCommentSchema = z.object({
  content: z.string().min(1).max(2000),
  parentId: z.string().optional(),
});

const ToggleReactionSchema = z.object({
  reactionType: z.nativeEnum(ReactionType).default(ReactionType.LIKE),
});

export const videosRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/videos/:id
  fastify.get(
    '/api/v1/videos/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;

      const cacheKey = `video:detail:${id}`;

      const video = await fastify.cache.getOrSet(
        cacheKey,
        async () => {
          return fastify.prisma.video.findFirst({
            where: { id, status: { not: RecordStatus.DELETED } },
            include: {
              lesson: {
                select: {
                  id: true,
                  name: true,
                  subject: {
                    select: {
                      id: true,
                      name: true,
                      batch: { select: { id: true, name: true, code: true } },
                    },
                  },
                },
              },
              _count: { select: { comments: true, reactions: true } },
            },
          });
        },
        60,
        [`video:${id}`],
      );

      if (!video) {
        return reply.status(404).send({
          statusCode: 404,
          message: 'Video not found',
          error: 'Not Found',
        });
      }

      // Check user's own reaction state asynchronously
      const userReaction = await fastify.prisma.videoReaction.findUnique({
        where: { videoId_userId: { videoId: id, userId: user.userId } },
      });

      return {
        ...video,
        hasReacted: !!userReaction,
        userReactionType: userReaction?.reactionType || null,
      };
    },
  );

  // GET /api/v1/videos/:id/comments
  fastify.get(
    '/api/v1/videos/:id/comments',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const cacheKey = `video:comments:${id}`;

      return fastify.cache.getOrSet(
        cacheKey,
        async () => {
          return fastify.prisma.videoComment.findMany({
            where: { videoId: id, parentId: null }, // Top-level comments
            include: {
              replies: {
                include: {
                  reactions: { select: { id: true, userId: true, reactionType: true } },
                  _count: { select: { reactions: true } },
                },
                orderBy: { createdAt: 'asc' },
              },
              reactions: { select: { id: true, userId: true, reactionType: true } },
              _count: { select: { replies: true, reactions: true } },
            },
            orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
          });
        },
        15,
        [`video:${id}:comments`],
      );
    },
  );

  // POST /api/v1/videos/:id/comments
  fastify.post(
    '/api/v1/videos/:id/comments',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;
      const parsed = CreateCommentSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          statusCode: 400,
          message: 'Invalid comment content',
          errors: parsed.error.format(),
        });
      }

      const comment = await fastify.prisma.videoComment.create({
        data: {
          videoId: id,
          userId: user.userId,
          parentId: parsed.data.parentId,
          content: parsed.data.content,
        },
      });

      // Invalidate comment cache
      fastify.cache.invalidateTag(`video:${id}:comments`);
      fastify.cache.invalidate(`video:detail:${id}`);

      return reply.status(201).send(comment);
    },
  );

  // GET /api/v1/videos/:id/reactions
  fastify.get(
    '/api/v1/videos/:id/reactions',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;

      const reactions = await fastify.prisma.videoReaction.findMany({
        where: { videoId: id },
      });

      const counts: Record<string, number> = {
        LIKE: 0,
        LOVE: 0,
        HELPFUL: 0,
        BRAVO: 0,
        CELEBRATE: 0,
      };

      let userReaction: string | null = null;

      for (const r of reactions) {
        counts[r.reactionType] = (counts[r.reactionType] || 0) + 1;
        if (r.userId === user.userId) {
          userReaction = r.reactionType;
        }
      }

      return {
        counts,
        userReaction,
        total: reactions.length,
      };
    },
  );

  // POST /api/v1/videos/:id/reactions
  fastify.post(
    '/api/v1/videos/:id/reactions',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;
      const parsed = ToggleReactionSchema.safeParse(request.body || {});
      const reactionType = parsed.success ? parsed.data.reactionType : ReactionType.LIKE;

      const existing = await fastify.prisma.videoReaction.findUnique({
        where: { videoId_userId: { videoId: id, userId: user.userId } },
      });

      let hasReacted = false;
      if (existing) {
        if (existing.reactionType === reactionType) {
          // Toggle off (remove)
          await fastify.prisma.videoReaction.delete({ where: { id: existing.id } });
          hasReacted = false;
        } else {
          // Update reaction type
          await fastify.prisma.videoReaction.update({
            where: { id: existing.id },
            data: { reactionType },
          });
          hasReacted = true;
        }
      } else {
        await fastify.prisma.videoReaction.create({
          data: {
            videoId: id,
            userId: user.userId,
            reactionType,
          },
        });
        hasReacted = true;
      }

      fastify.cache.invalidate(`video:detail:${id}`);
      return { success: true, hasReacted };
    },
  );

  // PUT /api/v1/comments/:commentId (Edit comment)
  fastify.put(
    '/api/v1/comments/:commentId',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { commentId } = request.params as { commentId: string };
      const user = request.user!;
      const { content } = request.body as { content?: string };

      if (!content || !content.trim()) {
        return reply.status(400).send({ statusCode: 400, message: 'Content is required' });
      }

      const comment = await fastify.prisma.videoComment.findUnique({ where: { id: commentId } });
      if (!comment) {
        return reply.status(404).send({ statusCode: 404, message: 'Comment not found' });
      }

      // Check authorization (Author or Admin)
      if (comment.userId !== user.userId && user.roleCode !== 'SUPER_ADMIN' && user.roleCode !== 'ADMIN') {
        return reply.status(403).send({ statusCode: 403, message: 'Unauthorized to edit this comment' });
      }

      const updated = await fastify.prisma.videoComment.update({
        where: { id: commentId },
        data: { content: content.trim() },
      });

      fastify.cache.invalidateTag(`video:${comment.videoId}:comments`);
      return updated;
    },
  );

  // DELETE /api/v1/comments/:commentId (Soft delete comment)
  fastify.delete(
    '/api/v1/comments/:commentId',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { commentId } = request.params as { commentId: string };
      const user = request.user!;

      const comment = await fastify.prisma.videoComment.findUnique({ where: { id: commentId } });
      if (!comment) {
        return reply.status(404).send({ statusCode: 404, message: 'Comment not found' });
      }

      if (comment.userId !== user.userId && user.roleCode !== 'SUPER_ADMIN' && user.roleCode !== 'ADMIN') {
        return reply.status(403).send({ statusCode: 403, message: 'Unauthorized to delete this comment' });
      }

      // Soft delete content
      const updated = await fastify.prisma.videoComment.update({
        where: { id: commentId },
        data: { content: '[This comment has been deleted by user/moderator]' },
      });

      fastify.cache.invalidateTag(`video:${comment.videoId}:comments`);
      return { success: true, message: 'Comment deleted', comment: updated };
    },
  );

  // POST /api/v1/comments/:commentId/pin (Pin / unpin comment)
  fastify.post(
    '/api/v1/comments/:commentId/pin',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { commentId } = request.params as { commentId: string };
      const user = request.user!;

      if (user.roleCode !== 'SUPER_ADMIN' && user.roleCode !== 'ADMIN' && user.roleCode !== 'TEACHER') {
        return reply.status(403).send({ statusCode: 403, message: 'Only faculty and admins can pin comments' });
      }

      const comment = await fastify.prisma.videoComment.findUnique({ where: { id: commentId } });
      if (!comment) {
        return reply.status(404).send({ statusCode: 404, message: 'Comment not found' });
      }

      const updated = await fastify.prisma.videoComment.update({
        where: { id: commentId },
        data: { isPinned: !comment.isPinned },
      });

      fastify.cache.invalidateTag(`video:${comment.videoId}:comments`);
      return { success: true, isPinned: updated.isPinned };
    },
  );

  // POST /api/v1/comments/:commentId/reactions (React to comment)
  fastify.post(
    '/api/v1/comments/:commentId/reactions',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { commentId } = request.params as { commentId: string };
      const user = request.user!;
      const { reactionType = 'LIKE' } = (request.body || {}) as { reactionType?: string };

      const existing = await fastify.prisma.commentReaction.findUnique({
        where: { commentId_userId: { commentId, userId: user.userId } },
      });

      let hasReacted = false;
      if (existing) {
        if (existing.reactionType === reactionType) {
          await fastify.prisma.commentReaction.delete({ where: { id: existing.id } });
          hasReacted = false;
        } else {
          await fastify.prisma.commentReaction.update({
            where: { id: existing.id },
            data: { reactionType: reactionType as any },
          });
          hasReacted = true;
        }
      } else {
        await fastify.prisma.commentReaction.create({
          data: {
            commentId,
            userId: user.userId,
            reactionType: reactionType as any,
          },
        });
        hasReacted = true;
      }

      const comment = await fastify.prisma.videoComment.findUnique({ where: { id: commentId } });
      if (comment) {
        fastify.cache.invalidateTag(`video:${comment.videoId}:comments`);
      }

      return { success: true, hasReacted };
    },
  );

  // POST /api/v1/videos/:id/progress (Throttled watch progress sync)
  fastify.post(
    '/api/v1/videos/:id/progress',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;
      const { progressSeconds = 0, durationSeconds = 0 } = (request.body || {}) as {
        progressSeconds?: number;
        durationSeconds?: number;
      };

      const isCompleted = durationSeconds > 0 ? progressSeconds / durationSeconds >= 0.9 : false;

      const progress = await (fastify.prisma as any).videoWatchProgress.upsert({
        where: {
          userId_videoId: {
            userId: user.userId,
            videoId: id,
          },
        },
        update: {
          progressSeconds: Math.floor(progressSeconds),
          durationSeconds: Math.floor(durationSeconds),
          isCompleted: isCompleted,
          lastWatchedAt: new Date(),
        },
        create: {
          userId: user.userId,
          videoId: id,
          progressSeconds: Math.floor(progressSeconds),
          durationSeconds: Math.floor(durationSeconds),
          isCompleted: isCompleted,
          lastWatchedAt: new Date(),
        },
      });

      fastify.cache.invalidate(`user:history:${user.userId}`);
      return { success: true, progress };
    },
  );

  // GET /api/v1/videos/history (User's continue watching & history feed)
  fastify.get(
    '/api/v1/videos/history',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const user = request.user!;
      const cacheKey = `user:history:${user.userId}`;

      return fastify.cache.getOrSet(
        cacheKey,
        async () => {
          return (fastify.prisma as any).videoWatchProgress.findMany({
            where: { userId: user.userId },
            include: {
              video: {
                select: {
                  id: true,
                  title: true,
                  durationSeconds: true,
                  videoUrl: true,
                  provider: true,
                  lesson: {
                    select: {
                      id: true,
                      name: true,
                      subject: { select: { id: true, name: true } },
                    },
                  },
                },
              },
            },
            orderBy: { lastWatchedAt: 'desc' },
            take: 20,
          });
        },
        30,
      );
    },
  );

  // GET /api/v1/videos/:id/recommendations (Deterministic recommendation engine)
  fastify.get(
    '/api/v1/videos/:id/recommendations',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const cacheKey = `video:recommendations:${id}`;

      return fastify.cache.getOrSet(
        cacheKey,
        async () => {
          const current = await fastify.prisma.video.findUnique({
            where: { id },
            select: { id: true, lessonId: true, sortOrder: true, lesson: { select: { subjectId: true } } },
          });

          if (!current) return [];

          // 1. Next playlist item in same lesson
          const nextInLesson = await fastify.prisma.video.findMany({
            where: {
              lessonId: current.lessonId,
              sortOrder: { gt: current.sortOrder },
              status: 'ACTIVE',
            },
            orderBy: { sortOrder: 'asc' },
            take: 3,
            include: {
              lesson: { select: { id: true, name: true, subject: { select: { name: true } } } },
              _count: { select: { reactions: true, comments: true } },
            },
          });

          // 2. Same subject videos (popular/relevant)
          const sameSubject = await fastify.prisma.video.findMany({
            where: {
              lesson: { subjectId: current.lesson.subjectId },
              id: { notIn: [current.id, ...nextInLesson.map((v) => v.id)] },
              status: 'ACTIVE',
            },
            orderBy: [{ viewCount: 'desc' }, { createdAt: 'desc' }],
            take: 5,
            include: {
              lesson: { select: { id: true, name: true, subject: { select: { name: true } } } },
              _count: { select: { reactions: true, comments: true } },
            },
          });

          return [...nextInLesson, ...sameSubject];
        },
        60,
      );
    },
  );
};
