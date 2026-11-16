import { contentAccess } from './content-access';
import { hasPermission, requirePermission } from '../plugins/rbac.plugin';
// apps/api/src/fastify/routes/student-feed.routes.ts
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { resultVisible } from './test-access';

export const studentFeedRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const access = contentAccess(fastify.prisma);
  const bookmarkSchema = z.object({
    targetType: z.enum(['NOTE', 'VIDEO', 'LESSON', 'QUESTION']),
    targetId: z.string().trim().min(1).max(200),
    title: z.string().trim().max(300).optional(),
    metadataJson: z.preprocess(value => value && typeof value === 'object' ? JSON.stringify(value) : value, z.string().max(10000).optional()),
  });
  const supportTicketSchema = z.object({
    subject: z.string().trim().min(1).max(200),
    message: z.string().trim().min(1).max(10_000),
    priority: z.enum(['LOW', 'NORMAL', 'HIGH']).default('NORMAL'),
  });
  const checkBookmark = async (type: string, id: string, user: any) => {
    const resource = ({ NOTE: 'notes', VIDEO: 'videos', LESSON: 'lessons', QUESTION: 'tests' } as Record<string, string>)[type];
    if (!resource || !hasPermission(user, resource, 'read')) throw Object.assign(new Error('Content unavailable'), { statusCode: 403 });
    if (type === 'NOTE') return access.noteAccess(id, user);
    if (type === 'VIDEO') return access.videoAccess(id, user);
    if (type === 'LESSON') return access.lessonAccess(id, user);
    const question = await fastify.prisma.question.findFirst({ where: { id }, select: { section: { select: { test: true } } } });
    const test = question?.section.test;
    if (!test || test.status === 'DELETED' || (user.roleCode !== 'SUPER_ADMIN' && test.instituteId !== user.instituteId)) throw Object.assign(new Error('Content unavailable'), { statusCode: 404 });
    if (user.roleCode === 'STUDENT') {
      const profile = await fastify.prisma.studentProfile.findUnique({ where: { userId: user.userId }, include: { batch: true } });
      if (test.status !== 'ACTIVE' || !test.isPublished || !profile?.batchId || profile.batch?.status !== 'ACTIVE' || profile.batch.instituteId !== user.instituteId) throw Object.assign(new Error('Content unavailable'), { statusCode: 404 });
      // A published library test must still be part of the student's copied
      // curriculum. Bookmarks must not become a route to another batch's
      // question or answer material.
      if (test.batchId !== profile?.batchId) {
        const match = await fastify.prisma.subject.findFirst({ where: { batchId: profile?.batchId || '__none__', OR: [
          { id: test.subjectId || '__none__' },
          { copiedFromId: test.subjectId || '__none__' },
          { lessons: { some: { OR: [{ id: test.lessonId || '__none__' }, { copiedFromId: test.lessonId || '__none__' }] } } },
        ] } });
        if (!match) throw Object.assign(new Error('Content unavailable'), { statusCode: 404 });
      }
    }
  };
  const supportAdmin = async (request: any, reply: any) => {
    if (!['ADMIN', 'SUPER_ADMIN'].includes(request.user.roleCode)) return reply.code(403).send({ message: 'Administrator access required' });
    if (request.user.roleCode !== 'SUPER_ADMIN' && !request.user.instituteId) return reply.code(403).send({ message: 'Institute required' });
  };
  const supportStudent = async (request: any, reply: any) => {
    if (request.user.roleCode !== 'STUDENT') return reply.code(403).send({ message: 'Student access required' });
  };
  const supportScope = async (user: any) => user.roleCode === 'SUPER_ADMIN' ? {} : {
    userId: { in: (await fastify.prisma.user.findMany({ where: { instituteId: user.instituteId }, select: { id: true } })).map(user => user.id) },
  };
  // ── 1. AGGREGATED STUDENT HOME FEED ──
  fastify.get(
    '/api/v1/students/home-feed',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = request.user!.userId;
      const roleCode = request.user!.roleCode;
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
              instituteId: true,
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

      let batch = studentProfile?.batch;
      const emptyFeed = { success: true, data: {
        enrolledBatch: null, liveTests: [], continueWatching: null, recentNotes: [], todayClasses: [],
        stats: { testsTaken: 0, averagePercentage: 0 },
      } };
      // Student content always follows their active, same-institute enrollment.
      // Preview is available only to administrators, never as student enrollment.
      if (roleCode === 'STUDENT') {
        if (!request.user!.instituteId || !batch || batch.status !== 'ACTIVE' || batch.instituteId !== request.user!.instituteId) return emptyFeed;
      } else if (!['ADMIN', 'SUPER_ADMIN'].includes(roleCode) || (roleCode !== 'SUPER_ADMIN' && !request.user!.instituteId)) {
        return reply.code(403).send({ message: 'Student or administrator access required' });
      }
      if (roleCode !== 'SUPER_ADMIN' && batch?.instituteId !== request.user!.instituteId) batch = null;
      if (!batch || batch.status !== 'ACTIVE') {
        const queryBatchId = (request.query as any)?.batchId;
        batch = await prisma.batch.findFirst({
          where: {
            ...(queryBatchId ? { id: queryBatchId } : {}),
            status: 'ACTIVE',
            ...(roleCode === 'SUPER_ADMIN' ? {} : request.user!.instituteId ? { instituteId: request.user!.instituteId } : {}),
          },
          select: {
            id: true,
            name: true,
            code: true,
            imageUrl: true,
            status: true,
            instituteId: true,
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
        });
      }

      const batchId = batch?.id || null;
      const instituteId = batch?.instituteId || request.user!.instituteId;
      if (!batchId) {
        return {
          success: true,
          data: {
            enrolledBatch: null,
            liveTests: [],
            continueWatching: null,
            recentNotes: [],
            todayClasses: [],
            stats: { testsTaken: 0, averagePercentage: 0 },
          },
        };
      }
      const lessonScope = {
        status: 'ACTIVE',
        subject: {
          status: 'ACTIVE',
          batchId,
          batch: { status: 'ACTIVE', ...(instituteId ? { instituteId } : {}) },
        },
      };

      // A. Live or Scheduled Tests for this batch
      const now = new Date();
      let liveTests = await prisma.test.findMany({
        where: {
          isPublished: true,
          status: 'ACTIVE',
          testStatus: 'LIVE',
          ...(instituteId ? { instituteId } : {}),
          batchId,
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
          testStatus: true,
          batch: { select: { name: true, code: true } },
          sections: {
            include: {
              questions: { select: { id: true } }
            }
          }
        },
        take: 5,
        orderBy: { startDateTime: 'asc' },
      });

      if (!liveTests.length) {
        liveTests = await prisma.test.findMany({
          where: {
            isPublished: true,
            status: 'ACTIVE',
            ...(instituteId ? { instituteId } : {}),
            batchId,
          },
          select: {
            id: true,
            title: true,
            durationMinutes: true,
            startDateTime: true,
            endDateTime: true,
            totalMarks: true,
            testStatus: true,
            batch: { select: { name: true, code: true } },
            sections: {
              include: {
                questions: { select: { id: true } }
              }
            }
          },
          take: 5,
          orderBy: { startDateTime: 'asc' },
        });
      }

      const formattedLiveTests = liveTests.map((t: any) => {
        const qCount = t.sections?.reduce((sum: number, sec: any) => sum + (sec.questions?.length || 0), 0) || t.totalQuestions || 20;
        const durMin = t.durationMinutes || 60;
        const sDate = t.startDateTime ? new Date(t.startDateTime) : now;
        const isToday = sDate.toDateString() === now.toDateString();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const isTomorrow = sDate.toDateString() === tomorrow.toDateString();
        const badge = t.testStatus === 'LIVE' ? 'LIVE NOW' : isToday ? 'TODAY' : isTomorrow ? 'TOMORROW' : 'UPCOMING';
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const formattedDate = `${sDate.getDate()} ${months[sDate.getMonth()]} • ${sDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
        return {
          id: t.id,
          title: t.title,
          durationMinutes: durMin,
          questionsCount: qCount,
          startDateTime: t.startDateTime,
          endDateTime: t.endDateTime,
          totalMarks: t.totalMarks,
          testStatus: t.testStatus,
          badge,
          formattedDate,
        };
      });

      // B. Continue Watching Video
      const continueProgress = await prisma.videoWatchProgress.findFirst({
        where: {
          userId,
          isCompleted: false,
          video: { status: 'ACTIVE', lesson: lessonScope },
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

      let continueWatching = continueProgress;
      if (!continueWatching) {
        const firstVideo = await prisma.video.findFirst({
          where: { status: 'ACTIVE', lesson: lessonScope },
          orderBy: { sortOrder: 'asc' },
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
        });
        if (firstVideo) {
          continueWatching = {
            video: firstVideo,
            watchedSeconds: 0,
            isCompleted: false,
            lastWatchedAt: new Date(),
          };
        }
      }

      // C. Recent Notes & Handouts
      const recentNotes = await prisma.note.findMany({
        where: {
          status: 'ACTIVE',
          lesson: lessonScope,
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
      // Calendar day in Nepal (UTC+05:45), format as YYYY-MM-DD string
      const offset = 345 * 60 * 1000;
      const todayStr = new Date(now.getTime() + offset).toISOString().split('T')[0];
      const todayClasses = await prisma.batchClass.findMany({
        where: {
          batchId,
          date: todayStr,
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

      // E. Quick Stats (Tests attempted, Average score, Streak)
      const attempts = await prisma.testAttempt.findMany({
        where: {
          studentId: userId,
          submittedAt: { not: null },
        },
        select: {
          submittedAt: true,
          test: { include: { config: true } },
          result: {
            select: {
              totalScore: true,
              percentage: true,
              publishedAt: true,
            },
          },
        },
      });

      const testsTaken = attempts.length;
      const released = attempts.filter((att: any) => att.result && resultVisible(att.test, !!att.result.publishedAt));
      const avgScore = released.length ? Math.round(released.reduce((sum: number, att: any) => sum + Number(att.result.percentage), 0) / released.length) : 0;

      // Real streak calculation
      const recentWatchDates = await prisma.videoWatchProgress.findMany({
        where: { userId },
        select: { lastWatchedAt: true },
        take: 30,
        orderBy: { lastWatchedAt: 'desc' },
      });
      const dates = new Set<string>();
      attempts.forEach((a: any) => a.submittedAt && dates.add(new Date(a.submittedAt).toISOString().split('T')[0]));
      recentWatchDates.forEach((w: any) => w.lastWatchedAt && dates.add(new Date(w.lastWatchedAt).toISOString().split('T')[0]));
      dates.add(new Date().toISOString().split('T')[0]); // Active today

      let streakDays = 0;
      let checkDate = new Date();
      while (true) {
        const dStr = checkDate.toISOString().split('T')[0];
        if (dates.has(dStr)) {
          streakDays++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      const durSec = continueWatching?.video?.durationSeconds || (continueWatching as any)?.durationSeconds || 1800;
      const progSec = (continueWatching as any)?.progressSeconds || (continueWatching as any)?.watchedSeconds || 0;
      const pct = durSec > 0 ? Math.min(100, Math.round((progSec / durSec) * 100)) : 0;
      const minsLeft = durSec > 0 ? Math.max(1, Math.round((durSec - progSec) / 60)) : 18;

      return {
        success: true,
        data: {
          enrolledBatch: studentProfile?.batch || batch || null,
          liveTests: formattedLiveTests,
          continueWatching: continueWatching
            ? {
                videoId: continueWatching.video?.id || (continueWatching as any).videoId,
                progressSeconds: progSec,
                durationSeconds: durSec,
                percentage: pct,
                minutesLeft: minsLeft,
                lastWatchedAt: continueWatching.lastWatchedAt,
                video: continueWatching.video,
              }
            : null,
          recentNotes,
          todayClasses,
          stats: {
            testsTaken,
            averagePercentage: avgScore,
            streakDays,
          },
        },
      };
    }
  );

  // ── 2. PDF NOTE ANNOTATIONS ──
  fastify.get(
    '/api/v1/notes/:id/annotations',
    { preHandler: [fastify.authenticate, requirePermission('notes', 'read')] },
    async (request, reply) => {
      const userId = request.user!.userId;
      const { id: noteId } = request.params as { id: string };
      await access.noteAccess(noteId, request.user);

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
    { preHandler: [fastify.authenticate, requirePermission('notes', 'read')] },
    async (request, reply) => {
      const userId = request.user!.userId;
      const { id: noteId } = request.params as { id: string };
      await access.noteAccess(noteId, request.user);
      const parsed = z.object({
        pageNumber: z.number().int().positive(),
        type: z.enum(['HIGHLIGHT', 'DRAWING', 'STICKY', 'TEXT']),
        color: z.string().max(40).optional(), content: z.string().max(10000).optional(),
        geometryJson: z.preprocess(value => value && typeof value === 'object' ? JSON.stringify(value) : value, z.string().max(100000).optional()),
      }).safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ message: 'Invalid annotation' });
      const { pageNumber, type, color, content, geometryJson } = parsed.data;

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
    { preHandler: [fastify.authenticate, requirePermission('notes', 'read')] },
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

    const visible = [];
    for (const bookmark of bookmarks) {
      try { await checkBookmark(bookmark.targetType, bookmark.targetId, request.user); visible.push(bookmark); }
      catch (error: any) { if (![403, 404].includes(error.statusCode)) throw error; }
    }
    return { success: true, data: visible };
  });

  fastify.post('/api/v1/bookmarks', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const userId = request.user!.userId;
    const parsed = bookmarkSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: 'Invalid bookmark' });
    const { targetType, targetId, title, metadataJson } = parsed.data;
    await checkBookmark(targetType, targetId, request.user);

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
  fastify.get('/api/v1/support', { preHandler: [fastify.authenticate, supportStudent] }, async (request, reply) => {
    const userId = request.user!.userId;
    const tickets = await (fastify.prisma as any).supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: tickets };
  });

  fastify.post('/api/v1/support', { preHandler: [fastify.authenticate, supportStudent], config: { rateLimit: { max: 10, timeWindow: '1 hour' } } }, async (request, reply) => {
    const userId = request.user!.userId;
    const parsed = supportTicketSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: 'Enter a subject, message, and valid priority' });
    const { subject, message, priority } = parsed.data;

    const ticket = await (fastify.prisma as any).supportTicket.create({
      data: {
        userId,
        subject,
        message,
        priority,
      },
    });

    return { success: true, data: ticket };
  });

  // Admin view & reply to support tickets
  fastify.get('/api/v1/support/admin/all', { preHandler: [fastify.authenticate, supportAdmin] }, async (request, reply) => {
    const tickets = await (fastify.prisma as any).supportTicket.findMany({
      where: await supportScope(request.user),
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return { success: true, data: tickets };
  });

  fastify.put('/api/v1/support/admin/:id/reply', { preHandler: [fastify.authenticate, supportAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = z.object({ reply: z.string().trim().min(1).max(10000), status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']).default('RESOLVED') }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: 'A reply and valid ticket status are required' });
    const { reply: replyText, status } = parsed.data;
    const updated = await fastify.prisma.supportTicket.updateMany({
      where: { id, ...await supportScope(request.user) },
      data: {
        reply: replyText,
        repliedAt: new Date(),
        status: status || 'RESOLVED',
      },
    });

    if (!updated.count) return reply.code(404).send({ message: 'Ticket not found' });
    return { success: true };
  });
};
