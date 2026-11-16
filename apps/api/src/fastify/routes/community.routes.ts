// apps/api/src/fastify/routes/community.routes.ts
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { ReactionType, RoleType } from '@prisma/client';

const CreatePostSchema = z.object({
  title: z.string().min(1).max(200),
  contentHtml: z.string().min(1).max(20000),
  isPinned: z.boolean().default(false),
  batchId: z.string().optional(),
  poll: z
    .object({
      question: z.string().min(1).max(300),
      options: z.array(z.string().min(1).max(100)).min(2).max(6),
    })
    .optional(),
});

const ReactSchema = z.object({
  reactionType: z.nativeEnum(ReactionType).default(ReactionType.LIKE),
});

const VotePollSchema = z.object({
  optionId: z.string().min(1),
});

const CreateCommentSchema = z.object({
  content: z.string().min(1).max(2000),
  parentId: z.string().optional(),
});

export const communityRoutes: FastifyPluginAsync = async (fastify) => {
  const studentBatch = async (user: any) => {
    if (user.roleCode !== RoleType.STUDENT) return null;
    const profile = await fastify.prisma.studentProfile.findUnique({
      where: { userId: user.userId },
      include: { batch: { select: { id: true, status: true, instituteId: true } } },
    });
    return profile?.batchId && profile.batch?.status === 'ACTIVE' && profile.batch.instituteId === user.instituteId ? profile.batch : null;
  };
  const postScope = async (user: any) => {
    if (user.roleCode === RoleType.SUPER_ADMIN) return {};
    if (!user.instituteId) return { id: '__none__' };
    if (user.roleCode !== RoleType.STUDENT) return { instituteId: user.instituteId };
    const batch = await studentBatch(user);
    return batch ? { instituteId: user.instituteId, OR: [{ batchId: null }, { batchId: batch.id }] } : { id: '__none__' };
  };
  const findVisiblePost = async (id: string, user: any, select: any = { id: true }) =>
    fastify.prisma.communityPost.findFirst({ where: { id, ...(await postScope(user)) }, select });

  // GET /api/v1/community/feed
  fastify.get(
    '/api/v1/community/feed',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const user = request.user!;

      const where = await postScope(user);

      const posts = await fastify.prisma.communityPost.findMany({
        where,
        include: {
          author: {
            select: { id: true, fullName: true, avatarUrl: true, identifier: true },
          },
          poll: {
            include: {
              options: {
                include: {
                  _count: { select: { votes: true } },
                },
                orderBy: { sortOrder: 'asc' },
              },
              votes: {
                where: { userId: user.userId },
                select: { optionId: true },
              },
            },
          },
          reactions: {
            select: { id: true, userId: true, reactionType: true },
          },
          _count: { select: { comments: true } },
        },
        orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
        take: 50,
      });

      return posts;
    },
  );

  // POST /api/v1/community/posts
  fastify.post(
    '/api/v1/community/posts',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const user = request.user!;
      const body = CreatePostSchema.parse(request.body);

      // Only Teachers and Admins can pin posts or post announcements by default
      const isPrivileged = ([RoleType.SUPER_ADMIN, RoleType.ADMIN, RoleType.TEACHER] as RoleType[]).includes(
        user.roleCode,
      );

      const instituteId =
        user.instituteId ||
        (await fastify.prisma.institute.findFirst({ select: { id: true } }))?.id;

      if (!instituteId) {
        return reply.status(400).send({ statusCode: 400, message: 'Institute context required' });
      }
      const enrolledBatch = await studentBatch(user);
      if (user.roleCode === RoleType.STUDENT && !enrolledBatch) {
        return reply.status(403).send({ statusCode: 403, message: 'An active batch enrollment is required to post' });
      }
      let batchId = body.batchId || null;
      if (user.roleCode === RoleType.STUDENT) batchId = enrolledBatch!.id;
      if (batchId) {
        const batch = await fastify.prisma.batch.findFirst({ where: { id: batchId, instituteId, status: 'ACTIVE' }, select: { id: true } });
        if (!batch) return reply.status(404).send({ statusCode: 404, message: 'Batch not found' });
      }

      const post = await fastify.prisma.communityPost.create({
        data: {
          title: body.title,
          contentHtml: body.contentHtml,
          isPinned: isPrivileged ? body.isPinned : false,
          batchId,
          authorId: user.userId,
          instituteId,
          ...(body.poll
            ? {
                poll: {
                  create: {
                    question: body.poll.question,
                    options: {
                      create: body.poll.options.map((opt, idx) => ({
                        optionText: opt,
                        sortOrder: idx,
                      })),
                    },
                  },
                },
              }
            : {}),
        },
        include: {
          author: {
            select: { id: true, fullName: true, avatarUrl: true, identifier: true },
          },
          poll: {
            include: {
              options: {
                include: { _count: { select: { votes: true } } },
              },
            },
          },
          reactions: true,
          _count: { select: { comments: true } },
        },
      });

      return reply.status(201).send(post);
    },
  );

  // POST /api/v1/community/posts/:id/react
  fastify.post(
    '/api/v1/community/posts/:id/react',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;
      const body = ReactSchema.parse(request.body);

      // Check if post exists
      const post = await findVisiblePost(id, user);

      if (!post) {
        return reply.status(404).send({ statusCode: 404, message: 'Post not found' });
      }

      // Check existing reaction
      const existing = await fastify.prisma.postReaction.findUnique({
        where: {
          postId_userId: { postId: id, userId: user.userId },
        },
      });

      if (existing) {
        if (existing.reactionType === body.reactionType) {
          // Toggle off
          await fastify.prisma.postReaction.delete({
            where: { id: existing.id },
          });
          return { message: 'Reaction removed', reactionType: null };
        } else {
          // Update type
          const updated = await fastify.prisma.postReaction.update({
            where: { id: existing.id },
            data: { reactionType: body.reactionType },
          });
          return { message: 'Reaction updated', reactionType: updated.reactionType };
        }
      }

      // Create new reaction
      const created = await fastify.prisma.postReaction.create({
        data: {
          postId: id,
          userId: user.userId,
          reactionType: body.reactionType,
        },
      });

      return { message: 'Reaction added', reactionType: created.reactionType };
    },
  );

  // POST /api/v1/community/polls/:pollId/vote
  fastify.post(
    '/api/v1/community/polls/:pollId/vote',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { pollId } = request.params as { pollId: string };
      const user = request.user!;
      const body = VotePollSchema.parse(request.body);

      const poll = await fastify.prisma.batchPoll.findUnique({ where: { id: pollId }, select: { postId: true } });
      if (!poll || !await findVisiblePost(poll.postId, user)) return reply.status(404).send({ statusCode: 404, message: 'Poll not found' });
      // Verify option belongs to poll
      const option = await fastify.prisma.pollOption.findFirst({
        where: { id: body.optionId, pollId },
      });

      if (!option) {
        return reply.status(404).send({ statusCode: 404, message: 'Poll option not found' });
      }

      // Upsert single vote per user
      const existingVote = await fastify.prisma.pollVote.findFirst({
        where: { pollId, userId: user.userId },
      });

      if (existingVote) {
        if (existingVote.optionId === body.optionId) {
          return { message: 'Already voted for this option', optionId: body.optionId };
        }
        await fastify.prisma.pollVote.delete({
          where: { id: existingVote.id },
        });
      }

      await fastify.prisma.pollVote.create({
        data: {
          pollId,
          optionId: body.optionId,
          userId: user.userId,
        },
      });

      return { message: 'Vote recorded', optionId: body.optionId };
    },
  );

  // GET /api/v1/community/posts/:id/comments
  fastify.get(
    '/api/v1/community/posts/:id/comments',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      if (!await findVisiblePost(id, request.user!)) return reply.status(404).send({ statusCode: 404, message: 'Post not found' });

      const comments = await fastify.prisma.postComment.findMany({
        where: { postId: id, parentId: null },
        include: {
          user: {
            select: { id: true, fullName: true, avatarUrl: true, identifier: true },
          },
          replies: {
            include: {
              user: {
                select: { id: true, fullName: true, avatarUrl: true, identifier: true },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'asc' }],
      });

      return comments;
    },
  );

  // POST /api/v1/community/posts/:id/comments
  fastify.post(
    '/api/v1/community/posts/:id/comments',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;
      const body = CreateCommentSchema.parse(request.body);

      const post = await findVisiblePost(id, user, { id: true, allowComments: true });

      if (!post) {
        return reply.status(404).send({ statusCode: 404, message: 'Post not found' });
      }

      if (!post.allowComments) {
        return reply.status(400).send({ statusCode: 400, message: 'Comments are disabled on this post' });
      }
      if (body.parentId && !await fastify.prisma.postComment.findFirst({ where: { id: body.parentId, postId: id } })) {
        return reply.status(400).send({ statusCode: 400, message: 'Reply target does not belong to this post' });
      }

      const comment = await fastify.prisma.postComment.create({
        data: {
          postId: id,
          userId: user.userId,
          content: body.content,
          parentId: body.parentId || null,
        },
        include: {
          user: {
            select: { id: true, fullName: true, avatarUrl: true, identifier: true },
          },
        },
      });

      return reply.status(201).send(comment);
    },
  );
};
