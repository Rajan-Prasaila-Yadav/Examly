// apps/api/src/fastify/plugins/queue.plugin.ts
import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';

export interface QueueJobPayload {
  type: string;
  payload: any;
  userId: string;
  createdAt: number;
}

export interface DeadLetterRecord {
  jobId: string;
  queueName: string;
  payload: any;
  failedReason: string;
  stackTrace?: string;
  failedAt: number;
  attemptsMade: number;
}

const deadLetterStore: DeadLetterRecord[] = [];

declare module 'fastify' {
  interface FastifyInstance {
    queues: {
      youtubeImportQueue: Queue;
      exportQueue: Queue;
      notificationsQueue: Queue;
      analyticsQueue: Queue;
    };
    getJobStatus: (queueName: string, jobId: string) => Promise<any>;
    getDeadLetterJobs: () => DeadLetterRecord[];
  }
}

const queuePlugin: FastifyPluginAsync = async (fastify) => {
  const redisUrl = process.env.REDIS_URL;
  const isRedisConfigured = !!redisUrl;

  const defaultJobOptions = {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 2000,
    },
    removeOnComplete: { count: 500, age: 3600 },
    removeOnFail: { count: 1000, age: 86400 },
  };

  let redisConnection: IORedis | null = null;
  let isConnected = false;

  if (isRedisConfigured) {
    try {
      redisConnection = new IORedis(redisUrl!, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        lazyConnect: true,
        connectTimeout: 5000,
        retryStrategy: () => null, // Do not spam reconnects if offline
      });

      // Catch error events to prevent unhandled event crashes in node
      redisConnection.on('error', (err) => {
        fastify.log.warn({ msg: err.message }, 'Redis connection warning');
      });

      await redisConnection.connect();
      isConnected = true;
    } catch (e: any) {
      isConnected = false;
      fastify.log.warn({ err: e.message }, 'Redis unreachable, fallback to standalone mock queue');
    }
  } else {
    fastify.log.info('REDIS_URL not configured. Background queues operating in standalone mock mode.');
  }

  // Define BullMQ Queues or Standalone Mock Queues
  let youtubeImportQueue: any;
  let exportQueue: any;
  let notificationsQueue: any;
  let analyticsQueue: any;

  if (isConnected && redisConnection) {
    youtubeImportQueue = new Queue('youtube-imports', {
      connection: redisConnection,
      defaultJobOptions,
    });

    exportQueue = new Queue('data-exports', {
      connection: redisConnection,
      defaultJobOptions,
    });

    notificationsQueue = new Queue('notifications', {
      connection: redisConnection,
      defaultJobOptions,
    });

    analyticsQueue = new Queue('analytics-aggregation', {
      connection: redisConnection,
      defaultJobOptions,
    });

    for (const q of [youtubeImportQueue, exportQueue, notificationsQueue, analyticsQueue]) {
      q.on('error', (err: any) => {
        fastify.log.warn({ queue: q.name, err: err.message }, 'Queue error');
      });
    }
  } else {
    const createMockQueue = (name: string) => ({
      name,
      add: async (jobName: string, data: any) => {
        fastify.log.info({ queue: name, jobName }, 'Standalone mock queue: job accepted');
        return { id: `mock_${Date.now()}`, name: jobName, data };
      },
      getJob: async () => null,
      close: async () => { },
      on: () => { },
    });

    youtubeImportQueue = createMockQueue('youtube-imports');
    exportQueue = createMockQueue('data-exports');
    notificationsQueue = createMockQueue('notifications');
    analyticsQueue = createMockQueue('analytics-aggregation');
  }

  // Define BullMQ Workers if connected
  const workers: Worker[] = [];

  if (isConnected && redisConnection) {
    const importWorker = new Worker(
      'youtube-imports',
      async (job: Job) => {
        await job.updateProgress(10);
        // Process YouTube Import payload
        await job.updateProgress(100);
        return { success: true, processedAt: Date.now() };
      },
      { connection: redisConnection },
    );

    const exportWorker = new Worker(
      'data-exports',
      async (job: Job) => {
        await job.updateProgress(20);
        // Process Export payload
        await job.updateProgress(100);
        return { success: true, processedAt: Date.now() };
      },
      { connection: redisConnection },
    );

    const { Resend } = await import('resend');
    const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

    const notifWorker = new Worker(
      'notifications',
      async (job: Job) => {
        const { to, subject, html, text, correlationId, type } = job.data;
        const fromAddress = process.env.MAIL_FROM_ADDRESS || 'Examly <onboarding@resend.dev>';
        const startTime = Date.now();

        if (!resendClient) {
          fastify.log.warn(
            { correlationId, event: 'NOTIFICATION_SKIPPED_NO_RESEND_KEY', status: 'FAILED' },
            'Resend API key not configured, skipped email dispatch',
          );
          return {
            status: 'FAILED',
            reason: 'RESEND_NOT_CONFIGURED',
            failureCode: 'MISSING_API_KEY',
            durationMs: Date.now() - startTime,
            timestamp: Date.now(),
          };
        }

        try {
          const res = await resendClient.emails.send({
            from: fromAddress,
            to: Array.isArray(to) ? to : [to],
            subject,
            html,
            text,
          });

          if (res.error) {
            const errorMsg = res.error.message || 'Unknown Resend Error';
            const statusCode = (res.error as any).statusCode || 500;
            const isSandboxError =
              errorMsg.includes('only send testing emails to your own email address') ||
              errorMsg.includes('verify a domain at resend.com/domains');

            fastify.log.error(
              {
                correlationId,
                event: 'NOTIFICATION_PROVIDER_REJECTED',
                statusCode,
                isSandboxError,
                error: errorMsg,
                durationMs: Date.now() - startTime,
              },
              'Resend provider returned rejection error',
            );

            // If it is a permanent sandbox or validation failure, do not retry indefinitely
            if (statusCode === 403 || statusCode === 422 || statusCode === 401 || isSandboxError) {
              const permanentError = new Error(`PROVIDER_REJECTED [${statusCode}]: ${errorMsg}`);
              (permanentError as any).isPermanent = true;
              (permanentError as any).failureCode = isSandboxError ? 'SANDBOX_DOMAIN_RESTRICTION' : 'VALIDATION_ERROR';
              throw permanentError;
            }

            throw new Error(`PROVIDER_ERROR [${statusCode}]: ${errorMsg}`);
          }

          const providerMessageId = res.data?.id;
          fastify.log.info(
            {
              correlationId,
              event: 'NOTIFICATION_PROVIDER_ACCEPTED',
              status: 'PROVIDER_ACCEPTED',
              provider: 'resend',
              providerMessageId,
              durationMs: Date.now() - startTime,
            },
            'Resend accepted email for transmission',
          );

          return {
            status: 'PROVIDER_ACCEPTED',
            provider: 'resend',
            providerMessageId,
            durationMs: Date.now() - startTime,
            timestamp: Date.now(),
          };
        } catch (err: any) {
          const durationMs = Date.now() - startTime;
          fastify.log.error(
            {
              correlationId,
              event: 'NOTIFICATION_JOB_FAILED',
              status: 'FAILED',
              error: err.message,
              attempt: job.attemptsMade + 1,
              durationMs,
            },
            'Notification job failed during dispatch',
          );

          // If permanent error, update job options so BullMQ won't retry fruitlessly
          if (err.isPermanent) {
            job.opts.attempts = job.attemptsMade + 1;
          }

          throw err;
        }
      },
      { connection: redisConnection },
    );

    // Dead Letter Failure Listener
    const handleJobFailure = (worker: Worker, queueName: string) => {
      worker.on('failed', (job, err) => {
        if (job && job.attemptsMade >= (job.opts.attempts || 3)) {
          deadLetterStore.unshift({
            jobId: job.id || 'unknown',
            queueName,
            payload: job.data,
            failedReason: err.message,
            stackTrace: err.stack,
            failedAt: Date.now(),
            attemptsMade: job.attemptsMade,
          });

          if (deadLetterStore.length > 500) {
            deadLetterStore.pop();
          }
        }
      });
    };

    handleJobFailure(importWorker, 'youtube-imports');
    handleJobFailure(exportWorker, 'data-exports');
    handleJobFailure(notifWorker, 'notifications');

    workers.push(importWorker, exportWorker, notifWorker);
  }

  // Decorate Fastify Instance
  fastify.decorate('queues', {
    youtubeImportQueue,
    exportQueue,
    notificationsQueue,
    analyticsQueue,
  });

  fastify.decorate('getJobStatus', async (queueName: string, jobId: string) => {
    let queue: Queue | null = null;
    if (queueName === 'youtube-imports') queue = youtubeImportQueue;
    else if (queueName === 'data-exports') queue = exportQueue;
    else if (queueName === 'notifications') queue = notificationsQueue;
    else if (queueName === 'analytics') queue = analyticsQueue;

    if (!queue) return null;

    try {
      const job = await queue.getJob(jobId);
      if (!job) return null;

      const state = await job.getState();
      const progress = job.progress;
      return {
        id: job.id,
        name: job.name,
        state,
        progress,
        data: job.data,
        returnvalue: job.returnvalue,
        failedReason: job.failedReason,
        attemptsMade: job.attemptsMade,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
      };
    } catch (e) {
      return null;
    }
  });

  fastify.decorate('getDeadLetterJobs', () => deadLetterStore);

  // Graceful Shutdown
  fastify.addHook('onClose', async () => {
    for (const w of workers) {
      await w.close();
    }
    await youtubeImportQueue.close();
    await exportQueue.close();
    await notificationsQueue.close();
    await analyticsQueue.close();
    if (redisConnection && isConnected) {
      redisConnection.disconnect();
    }
  });
};

export default fp(queuePlugin, {
  name: 'queue-plugin',
  dependencies: ['prisma-plugin'],
});
