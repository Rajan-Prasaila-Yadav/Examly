// apps/api/src/fastify/routes/student-feed.routes.ts
import { FastifyInstance, FastifyPluginAsync } from 'fastify';

export const studentFeedRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // ── 1. AGGREGATED STUDENT HOME FEED ──
  fastify.get('/api/v1/students/home-feed', async (request, reply) => {
    const user = (request as any).user;
    if (!user) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const prisma = fastify.prisma;

    // Get user's enrolled batch
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
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
      take: 2,
    });

    // B. Continue Watching Video (from VideoWatchProgress)
    const continueProgress = await prisma.videoWatchProgress.findFirst({
      where: {
        userId: user.id,
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
    });

    // C. Recent Notes for this batch
    let recentNotes: any[] = [];
    if (batchId) {
      recentNotes = await prisma.note.findMany({
        where: {
          status: 'ACTIVE',
          lesson: {
            subject: {
              batchId,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 4,
        select: {
          id: true,
          title: true,
          fileUrl: true,
          fileSizeBytes: true,
          createdAt: true,
          lesson: {
            select: {
              id: true,
              name: true,
              subject: { select: { id: true, name: true } },
            },
          },
        },
      });
    }

    // D. Today's Classes in Timetable
    const todayStr = now.toLocaleDateString('en-CA');
    let todayClasses: any[] = [];
    if (batchId) {
      todayClasses = await prisma.batchClass.findMany({
        where: {
          batchId,
          date: todayStr,
        },
        orderBy: { startTime: 'asc' },
        include: {
          subject: { select: { id: true, name: true } },
          teacher: { select: { id: true, fullName: true, avatarUrl: true } },
        },
      });
    }

    // E. Student test stats summary
    const testAttempts = await prisma.testAttempt.findMany({
      where: { studentId: user.id },
      include: {
        result: {
          select: {
            totalScore: true,
            percentage: true,
            isPassed: true,
          },
        },
      },
    });

    const completedAttempts = testAttempts.filter((a) => a.result !== null);
    const testsTaken = completedAttempts.length;
    const avgScore = testsTaken > 0
      ? (
          completedAttempts.reduce((acc, curr) => acc + (curr.result?.percentage || 0), 0) /
          testsTaken
        ).toFixed(1)
      : '0.0';

    return {
      success: true,
      data: {
        student: {
          id: user.id,
          fullName: user.fullName,
          avatarUrl: user.avatarUrl,
          batch: studentProfile?.batch || null,
        },
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
  });

  // ── 2. VIDEO WATCH PROGRESS SYNC ──
  fastify.post('/api/v1/videos/:id/progress', async (request, reply) => {
    const user = (request as any).user;
    if (!user) return reply.code(401).send({ error: 'Unauthorized' });

    const { id: videoId } = request.params as { id: string };
    const { progressSeconds, durationSeconds, isCompleted } = request.body as {
      progressSeconds: number;
      durationSeconds: number;
      isCompleted?: boolean;
    };

    const record = await fastify.prisma.videoWatchProgress.upsert({
      where: {
        userId_videoId: {
          userId: user.id,
          videoId,
        },
      },
      update: {
        progressSeconds: Math.floor(progressSeconds || 0),
        durationSeconds: Math.floor(durationSeconds || 0),
        isCompleted: !!isCompleted,
        lastWatchedAt: new Date(),
      },
      create: {
        userId: user.id,
        videoId,
        progressSeconds: Math.floor(progressSeconds || 0),
        durationSeconds: Math.floor(durationSeconds || 0),
        isCompleted: !!isCompleted,
      },
    });

    return { success: true, data: record };
  });

  fastify.get('/api/v1/videos/:id/progress', async (request, reply) => {
    const user = (request as any).user;
    if (!user) return reply.code(401).send({ error: 'Unauthorized' });

    const { id: videoId } = request.params as { id: string };
    const record = await fastify.prisma.videoWatchProgress.findUnique({
      where: {
        userId_videoId: {
          userId: user.id,
          videoId,
        },
      },
    });

    return { success: true, data: record || null };
  });

  // ── 3. PDF NOTE ANNOTATIONS ──
  fastify.get('/api/v1/notes/:id/annotations', async (request, reply) => {
    const user = (request as any).user;
    if (!user) return reply.code(401).send({ error: 'Unauthorized' });

    const { id: noteId } = request.params as { id: string };
    const annotations = await fastify.prisma.pdfAnnotation.findMany({
      where: {
        noteId,
        userId: user.id,
      },
      orderBy: { pageNumber: 'asc' },
    });

    return { success: true, data: annotations };
  });

  fastify.post('/api/v1/notes/:id/annotations', async (request, reply) => {
    const user = (request as any).user;
    if (!user) return reply.code(401).send({ error: 'Unauthorized' });

    const { id: noteId } = request.params as { id: string };
    const { pageNumber, type, color, content, geometryJson } = request.body as {
      pageNumber: number;
      type: string;
      color?: string;
      content?: string;
      geometryJson?: string;
    };

    const annotation = await fastify.prisma.pdfAnnotation.create({
      data: {
        noteId,
        userId: user.id,
        pageNumber: Number(pageNumber) || 1,
        type: type || 'HIGHLIGHT',
        color,
        content,
        geometryJson: typeof geometryJson === 'object' ? JSON.stringify(geometryJson) : geometryJson,
      },
    });

    return { success: true, data: annotation };
  });

  fastify.delete('/api/v1/notes/annotations/:annotationId', async (request, reply) => {
    const user = (request as any).user;
    if (!user) return reply.code(401).send({ error: 'Unauthorized' });

    const { annotationId } = request.params as { annotationId: string };
    await fastify.prisma.pdfAnnotation.deleteMany({
      where: {
        id: annotationId,
        userId: user.id,
      },
    });

    return { success: true, message: 'Annotation removed' };
  });

  // ── 4. STUDENT BOOKMARKS ──
  fastify.get('/api/v1/bookmarks', async (request, reply) => {
    const user = (request as any).user;
    if (!user) return reply.code(401).send({ error: 'Unauthorized' });

    const bookmarks = await fastify.prisma.bookmark.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: bookmarks };
  });

  fastify.post('/api/v1/bookmarks', async (request, reply) => {
    const user = (request as any).user;
    if (!user) return reply.code(401).send({ error: 'Unauthorized' });

    const { targetType, targetId, title, metadataJson } = request.body as {
      targetType: string;
      targetId: string;
      title?: string;
      metadataJson?: any;
    };

    const bookmark = await fastify.prisma.bookmark.upsert({
      where: {
        userId_targetType_targetId: {
          userId: user.id,
          targetType,
          targetId,
        },
      },
      update: {
        title,
        metadataJson: typeof metadataJson === 'object' ? JSON.stringify(metadataJson) : metadataJson,
      },
      create: {
        userId: user.id,
        targetType,
        targetId,
        title,
        metadataJson: typeof metadataJson === 'object' ? JSON.stringify(metadataJson) : metadataJson,
      },
    });

    return { success: true, data: bookmark };
  });

  fastify.delete('/api/v1/bookmarks/:id', async (request, reply) => {
    const user = (request as any).user;
    if (!user) return reply.code(401).send({ error: 'Unauthorized' });

    const { id } = request.params as { id: string };
    await fastify.prisma.bookmark.deleteMany({
      where: { id, userId: user.id },
    });

    return { success: true, message: 'Bookmark removed' };
  });

  // ── 5. STUDENT SUPPORT TICKETS ──
  fastify.get('/api/v1/support', async (request, reply) => {
    const user = (request as any).user;
    if (!user) return reply.code(401).send({ error: 'Unauthorized' });

    const tickets = await fastify.prisma.supportTicket.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: tickets };
  });

  fastify.post('/api/v1/support', async (request, reply) => {
    const user = (request as any).user;
    if (!user) return reply.code(401).send({ error: 'Unauthorized' });

    const { subject, message, priority } = request.body as {
      subject: string;
      message: string;
      priority?: string;
    };

    if (!subject || !message) {
      return reply.code(400).send({ error: 'Subject and message are required' });
    }

    const ticket = await fastify.prisma.supportTicket.create({
      data: {
        userId: user.id,
        subject,
        message,
        priority: priority || 'NORMAL',
      },
    });

    return { success: true, data: ticket };
  });

  // Admin view & reply to support tickets
  fastify.get('/api/v1/support/admin/all', async (request, reply) => {
    const user = (request as any).user;
    if (!user) return reply.code(401).send({ error: 'Unauthorized' });

    const tickets = await fastify.prisma.supportTicket.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return { success: true, data: tickets };
  });

  fastify.put('/api/v1/support/admin/:id/reply', async (request, reply) => {
    const user = (request as any).user;
    if (!user) return reply.code(401).send({ error: 'Unauthorized' });

    const { id } = request.params as { id: string };
    const { reply: replyText, status } = request.body as { reply: string; status?: string };

    const ticket = await fastify.prisma.supportTicket.update({
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
