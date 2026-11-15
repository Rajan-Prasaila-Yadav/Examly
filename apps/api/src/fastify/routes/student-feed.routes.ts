// apps/api/src/fastify/routes/student-feed.routes.ts
import { FastifyInstance, FastifyPluginAsync } from 'fastify';

export const studentFeedRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // ── 1. AGGREGATED STUDENT HOME FEED ──
  fastify.get(
    '/api/v1/students/home-feed',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = request.user!.userId;
      const prisma = fastify.prisma as any;

      // Get user's enrolled batch
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId },
        include: {
          batch: {
            select: {
              id: true,
              name: true,
              code: true,
              imageUrl: true,
              status: true,
              subjects: {
                where: { status: 'ACTIVE' },
                select: {
                  id: true,
                  name: true,
                  iconUrl: true,
                  _count: { select: { lessons: true } },
                },
              },
            },
          },
        },
      });

      const batchId = studentProfile?.batchId;

      // A. Live or Upcoming Tests for this batch / global
      const now = new Date();
      const liveTests = await prisma.test.findMany({
        where: {
          isPublished: true,
          status: 'ACTIVE',
          testStatus: 'LIVE',
          ...(batchId ? { batchId } : {}),
          startDateTime: { lte: now },
          endDateTime: { gte: now },
        },
        select: {
          id: true,
          title: true,
          durationMinutes: true,
          startDateTime: true,
          endDateTime: true,
          totalMarks: true,
          batch: { select: { name: true, code: true } },
        },
        take: 5,
        orderBy: { startDateTime: 'asc' },
      });

      // B. Continue Watching Video
      const continueProgress = await prisma.videoWatchProgress.findFirst({
        where: {
          userId,
          isCompleted: false,
        },
        orderBy: { lastWatchedAt: 'desc' },
        include: {
          video: {
            select: {
              id: true,
              title: true,
              durationSeconds: true,
              videoUrl: true,
              lessonId: true,
              lesson: {
                select: {
                  name: true,
                  subject: { select: { name: true } },
                },
              },
            },
          },
        },
      });

      // C. Recent Notes & Handouts
      const recentNotes = await prisma.note.findMany({
        where: {
          lesson: {
            subject: batchId ? { batchId } : undefined,
          },
        },
        select: {
          id: true,
          title: true,
          fileUrl: true,
          lesson: {
            select: {
              name: true,
              subject: { select: { name: true } },
            },
          },
          createdAt: true,
        },
        take: 6,
        orderBy: { createdAt: 'desc' },
      });

      // D. Today's Scheduled Classes
      const todayClasses = await prisma.batchClass.findMany({
        where: {
          ...(batchId ? { batchId } : {}),
        },
        select: {
          id: true,
          topic: true,
          date: true,
          startTime: true,
          endTime: true,
          status: true,
          teacher: { select: { fullName: true } },
          subject: { select: { name: true } },
        },
        take: 5,
        orderBy: { date: 'asc' },
      });

      // E. Quick Stats (Tests attempted, Average score)
      const attempts = await prisma.testAttempt.findMany({
        where: {
          studentId: userId,
          submittedAt: { not: null },
        },
        select: {
          result: {
            select: {
              totalScore: true,
              percentage: true,
            },
          },
        },
      });

      const testsTaken = attempts.length;
      let totalPct = 0;
      attempts.forEach((att: any) => {
        totalPct += Number(att.result?.percentage || 0);
      });
      const avgScore = testsTaken > 0 ? Math.round(totalPct / testsTaken) : 0;

      return {
        success: true,
        data: {
          enrolledBatch: studentProfile?.batch || null,
          liveTests,
          continueWatching: continueProgress
            ? {
                videoId: continueProgress.videoId,
                progressSeconds: continueProgress.progressSeconds,
                durationSeconds: continueProgress.durationSeconds,
                lastWatchedAt: continueProgress.lastWatchedAt,
                video: continueProgress.video,
              }
            : null,
          recentNotes,
          todayClasses,
          stats: {
            testsTaken,
            averagePercentage: avgScore,
          },
        },
      };
    }
  );

  // ── 2. PDF NOTE ANNOTATIONS ──
  fastify.get(
    '/api/v1/notes/:id/annotations',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = request.user!.userId;
      const { id: noteId } = request.params as { id: string };

      const annotations = await (fastify.prisma as any).pdfAnnotation.findMany({
        where: {
          noteId,
          userId,
        },
        orderBy: { pageNumber: 'asc' },
      });

      return { success: true, data: annotations };
    }
  );

  fastify.post(
    '/api/v1/notes/:id/annotations',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = request.user!.userId;
      const { id: noteId } = request.params as { id: string };
      const { pageNumber, type, color, content, geometryJson } = request.body as {
        pageNumber: number;
        type: string;
        color?: string;
        content?: string;
        geometryJson?: string;
      };

      const annotation = await (fastify.prisma as any).pdfAnnotation.create({
        data: {
          noteId,
          userId,
          pageNumber: Number(pageNumber) || 1,
          type: type || 'HIGHLIGHT',
          color,
          content,
          geometryJson: typeof geometryJson === 'object' ? JSON.stringify(geometryJson) : geometryJson,
        },
      });

      return { success: true, data: annotation };
    }
  );

  fastify.delete(
    '/api/v1/notes/annotations/:annotationId',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = request.user!.userId;
      const { annotationId } = request.params as { annotationId: string };

      await (fastify.prisma as any).pdfAnnotation.deleteMany({
        where: {
          id: annotationId,
          userId,
        },
      });

      return { success: true, message: 'Annotation removed' };
    }
  );

  // ── 3. STUDENT BOOKMARKS ──
  fastify.get('/api/v1/bookmarks', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const userId = request.user!.userId;
    const bookmarks = await (fastify.prisma as any).bookmark.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: bookmarks };
  });

  fastify.post('/api/v1/bookmarks', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const userId = request.user!.userId;
    const { targetType, targetId, title, metadataJson } = request.body as {
      targetType: string;
      targetId: string;
      title?: string;
      metadataJson?: any;
    };

    const bookmark = await (fastify.prisma as any).bookmark.upsert({
      where: {
        userId_targetType_targetId: {
          userId,
          targetType,
          targetId,
        },
      },
      update: {
        title,
        metadataJson: typeof metadataJson === 'object' ? JSON.stringify(metadataJson) : metadataJson,
      },
      create: {
        userId,
        targetType,
        targetId,
        title,
        metadataJson: typeof metadataJson === 'object' ? JSON.stringify(metadataJson) : metadataJson,
      },
    });

    return { success: true, data: bookmark };
  });

  fastify.delete('/api/v1/bookmarks/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const userId = request.user!.userId;
    const { id } = request.params as { id: string };

    await (fastify.prisma as any).bookmark.deleteMany({
      where: { id, userId },
    });

    return { success: true, message: 'Bookmark removed' };
  });

  // ── 4. STUDENT SUPPORT TICKETS ──
  fastify.get('/api/v1/support', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const userId = request.user!.userId;
    const tickets = await (fastify.prisma as any).supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: tickets };
  });

  fastify.post('/api/v1/support', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const userId = request.user!.userId;
    const { subject, message, priority } = request.body as {
      subject: string;
      message: string;
      priority?: string;
    };

    if (!subject || !message) {
      return reply.code(400).send({ error: 'Subject and message are required' });
    }

    const ticket = await (fastify.prisma as any).supportTicket.create({
      data: {
        userId,
        subject,
        message,
        priority: priority || 'NORMAL',
      },
    });

    return { success: true, data: ticket };
  });

  // Admin view & reply to support tickets
  fastify.get('/api/v1/support/admin/all', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const tickets = await (fastify.prisma as any).supportTicket.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return { success: true, data: tickets };
  });

  fastify.put('/api/v1/support/admin/:id/reply', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { reply: replyText, status } = request.body as { reply: string; status?: string };

    const ticket = await (fastify.prisma as any).supportTicket.update({
      where: { id },
      data: {
        reply: replyText,
        repliedAt: new Date(),
        status: status || 'RESOLVED',
      },
    });

    return { success: true, data: ticket };
  });
};
