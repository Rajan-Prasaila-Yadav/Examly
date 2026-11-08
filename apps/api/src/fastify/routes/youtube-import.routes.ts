// apps/api/src/fastify/routes/youtube-import.routes.ts
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { requirePermission } from '../plugins/rbac.plugin';
import { RecordStatus, VideoProvider } from '@prisma/client';
import { nanoid } from 'nanoid';
import axios from 'axios';

// ── In-Memory Asynchronous Job Store ──
export interface YouTubeImportJob {
  id: string;
  lessonId: string;
  userId: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  total: number;
  imported: number;
  failed: number;
  skipped: number;
  progressPercentage: number;
  errors: Array<{ url: string; reason: string }>;
  importedVideos: Array<{ id: string; title: string; videoUrl: string; durationSeconds: number }>;
  createdAt: number;
  completedAt?: number;
}

const importJobs = new Map<string, YouTubeImportJob>();

// Clean up jobs older than 1 hour periodically
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [id, job] of importJobs.entries()) {
    if (job.createdAt < oneHourAgo) {
      importJobs.delete(id);
    }
  }
}, 10 * 60 * 1000);

const YouTubeImportSchema = z.object({
  urls: z.array(z.string().min(5)).min(1).max(200),
  customTitles: z.record(z.string(), z.string()).optional(),
  isFreePreview: z.boolean().default(false),
  duplicateMode: z.enum(['SKIP', 'ALLOW']).default('SKIP'),
});

/**
 * Extracts 11-character YouTube video ID
 */
function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const regExp =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([^"&?\/\s]{11})/i;
  const match = url.match(regExp);
  return match && match[1] ? match[1] : null;
}

/**
 * Parses ISO 8601 duration (e.g. PT15M33S) into seconds
 */
function parseDuration(durationStr: string): number {
  if (!durationStr) return 0;
  const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Fetches video metadata via YouTube oEmbed / public scraping endpoint
 */
async function fetchMetadata(videoId: string, apiKey?: string): Promise<{ title: string; durationSeconds: number }> {
  try {
    if (apiKey) {
      const res = await axios.get(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`,
        { timeout: 5000 },
      );
      const item = res.data?.items?.[0];
      if (item) {
        return {
          title: item.snippet?.title || `Lecture ${videoId}`,
          durationSeconds: parseDuration(item.contentDetails?.duration || ''),
        };
      }
    }

    // Fallback: YouTube oEmbed
    const oembedRes = await axios.get(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { timeout: 4000 },
    );
    return {
      title: oembedRes.data?.title || `Lecture ${videoId}`,
      durationSeconds: 0,
    };
  } catch (e) {
    return {
      title: `Lecture ${videoId}`,
      durationSeconds: 0,
    };
  }
}

export const youtubeImportRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/v1/lessons/:lessonId/videos/youtube-import/async
  fastify.post(
    '/api/v1/lessons/:lessonId/videos/youtube-import/async',
    {
      preHandler: [fastify.authenticate, requirePermission('lessons', 'update')],
    },
    async (request, reply) => {
      const { lessonId } = request.params as { lessonId: string };
      const user = request.user!;
      const parsed = YouTubeImportSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          statusCode: 400,
          message: 'Invalid YouTube import request',
          errors: parsed.error.format(),
        });
      }

      const { urls, customTitles = {}, isFreePreview, duplicateMode } = parsed.data;

      // Verify lesson exists
      const lesson = await fastify.prisma.lesson.findUnique({
        where: { id: lessonId },
        select: { id: true, name: true },
      });

      if (!lesson) {
        return reply.status(404).send({
          statusCode: 404,
          message: 'Lesson not found',
          error: 'Not Found',
        });
      }

      // Generate background job
      const jobId = `job_yt_${nanoid(10)}`;
      const job: YouTubeImportJob = {
        id: jobId,
        lessonId,
        userId: user.userId,
        status: 'QUEUED',
        total: urls.length,
        imported: 0,
        failed: 0,
        skipped: 0,
        progressPercentage: 0,
        errors: [],
        importedVideos: [],
        createdAt: Date.now(),
      };

      importJobs.set(jobId, job);

      // Trigger background processing asynchronously without blocking HTTP response
      setImmediate(async () => {
        job.status = 'PROCESSING';
        const apiKey = process.env.YOUTUBE_API_KEY;

        // Get highest current sortOrder
        const lastVideo = await fastify.prisma.video.findFirst({
          where: { lessonId },
          orderBy: { sortOrder: 'desc' },
          select: { sortOrder: true },
        });
        let currentSortOrder = (lastVideo?.sortOrder || 0) + 1;

        for (let i = 0; i < urls.length; i++) {
          const rawUrl = urls[i].trim();
          const videoId = extractYouTubeId(rawUrl);

          if (!videoId) {
            job.failed++;
            job.errors.push({ url: rawUrl, reason: 'Invalid or unsupported YouTube URL format' });
            job.progressPercentage = Math.round(((i + 1) / urls.length) * 100);
            continue;
          }

          const normalizedUrl = `https://www.youtube.com/watch?v=${videoId}`;

          // Duplicate detection
          if (duplicateMode === 'SKIP') {
            const existing = await fastify.prisma.video.findFirst({
              where: {
                lessonId,
                videoUrl: { contains: videoId },
                status: { not: RecordStatus.DELETED },
              },
            });

            if (existing) {
              job.skipped++;
              job.progressPercentage = Math.round(((i + 1) / urls.length) * 100);
              continue;
            }
          }

          try {
            // Title override or metadata extraction
            let title: string = (customTitles as Record<string, string>)[rawUrl] || (customTitles as Record<string, string>)[videoId] || '';
            let durationSeconds = 0;

            if (!title) {
              const meta = await fetchMetadata(videoId, apiKey);
              title = meta.title;
              durationSeconds = meta.durationSeconds;
            }

            const created = await fastify.prisma.video.create({
              data: {
                lessonId,
                title: title.trim(),
                videoUrl: normalizedUrl,
                provider: VideoProvider.YOUTUBE,
                durationSeconds: durationSeconds || 0,
                sortOrder: currentSortOrder++,
                isFreePreview: isFreePreview || false,
                status: RecordStatus.ACTIVE,
              },
              select: {
                id: true,
                title: true,
                videoUrl: true,
                durationSeconds: true,
              },
            });

            job.imported++;
            job.importedVideos.push(created);
          } catch (err: any) {
            job.failed++;
            job.errors.push({ url: rawUrl, reason: err.message || 'Database creation error' });
          }

          job.progressPercentage = Math.round(((i + 1) / urls.length) * 100);
        }

        job.status = job.failed === urls.length ? 'FAILED' : 'COMPLETED';
        job.completedAt = Date.now();

        // Invalidate cached lesson hierarchy
        fastify.cache.invalidate(`lesson:${lessonId}`);
        fastify.cache.invalidate(`lesson:detail:${lessonId}`);
      });

      return reply.status(202).send({
        statusCode: 202,
        jobId,
        status: 'QUEUED',
        total: urls.length,
        message: 'YouTube asynchronous import job initiated successfully',
      });
    },
  );

  // GET /api/v1/videos/import-jobs/:jobId (Poll live job progress)
  fastify.get(
    '/api/v1/videos/import-jobs/:jobId',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { jobId } = request.params as { jobId: string };
      const job = importJobs.get(jobId);

      if (!job) {
        return reply.status(404).send({
          statusCode: 404,
          message: 'Import job not found or expired',
          error: 'Not Found',
        });
      }

      return job;
    },
  );

  // POST /api/v1/videos/import-jobs/:jobId/retry (Retry failed URLs)
  fastify.post(
    '/api/v1/videos/import-jobs/:jobId/retry',
    {
      preHandler: [fastify.authenticate, requirePermission('lessons', 'update')],
    },
    async (request, reply) => {
      const { jobId } = request.params as { jobId: string };
      const job = importJobs.get(jobId);

      if (!job) {
        return reply.status(404).send({
          statusCode: 404,
          message: 'Import job not found',
          error: 'Not Found',
        });
      }

      if (job.errors.length === 0) {
        return reply.status(400).send({
          statusCode: 400,
          message: 'No failed URLs to retry in this job',
        });
      }

      const failedUrls = job.errors.map((e) => e.url);
      const newJobId = `job_yt_retry_${nanoid(8)}`;
      const retryJob: YouTubeImportJob = {
        id: newJobId,
        lessonId: job.lessonId,
        userId: request.user!.userId,
        status: 'QUEUED',
        total: failedUrls.length,
        imported: 0,
        failed: 0,
        skipped: 0,
        progressPercentage: 0,
        errors: [],
        importedVideos: [],
        createdAt: Date.now(),
      };

      importJobs.set(newJobId, retryJob);

      setImmediate(async () => {
        retryJob.status = 'PROCESSING';
        const apiKey = process.env.YOUTUBE_API_KEY;

        for (let i = 0; i < failedUrls.length; i++) {
          const rawUrl = failedUrls[i];
          const videoId = extractYouTubeId(rawUrl);

          if (!videoId) {
            retryJob.failed++;
            retryJob.errors.push({ url: rawUrl, reason: 'Invalid or unsupported YouTube URL' });
            continue;
          }

          try {
            const meta = await fetchMetadata(videoId, apiKey);
            const created = await fastify.prisma.video.create({
              data: {
                lessonId: job.lessonId,
                title: meta.title,
                videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
                provider: VideoProvider.YOUTUBE,
                durationSeconds: meta.durationSeconds || 0,
                status: RecordStatus.ACTIVE,
              },
            });
            retryJob.imported++;
            retryJob.importedVideos.push(created);
          } catch (err: any) {
            retryJob.failed++;
            retryJob.errors.push({ url: rawUrl, reason: err.message });
          }

          retryJob.progressPercentage = Math.round(((i + 1) / failedUrls.length) * 100);
        }

        retryJob.status = retryJob.failed === failedUrls.length ? 'FAILED' : 'COMPLETED';
        retryJob.completedAt = Date.now();
      });

      return reply.status(202).send({
        statusCode: 202,
        jobId: newJobId,
        status: 'QUEUED',
        total: failedUrls.length,
        message: 'Retry job initiated successfully',
      });
    },
  );
};
