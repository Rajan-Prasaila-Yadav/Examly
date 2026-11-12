// apps/api/src/fastify/server.ts
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import compress from '@fastify/compress';
import prismaPlugin from './plugins/prisma.plugin';
import authPlugin from './plugins/auth.plugin';
import cachePlugin from './plugins/cache.plugin';
import queuePlugin from './plugins/queue.plugin';
import { authRoutes } from './routes/auth.routes';
import { systemRoutes } from './routes/system.routes';
import { storageRoutes } from './routes/storage.routes';
import { batchesRoutes } from './routes/batches.routes';
import { subjectsRoutes } from './routes/subjects.routes';
import { lessonsRoutes } from './routes/lessons.routes';
import { dashboardRoutes } from './routes/dashboard.routes';
import { usersRoutes } from './routes/users.routes';
import { videosRoutes } from './routes/videos.routes';
import { testsRoutes } from './routes/tests.routes';
import { searchRoutes } from './routes/search.routes';
import { youtubeImportRoutes } from './routes/youtube-import.routes';
import { exportsRoutes } from './routes/exports.routes';
import { jobsRoutes } from './routes/jobs.routes';
import { communityRoutes } from './routes/community.routes';
import {installRoutePolicy} from './plugins/route-policy';

export async function createFastifyApp(): Promise<FastifyInstance> {
  const configuredOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  // Local development remains convenient, but production must explicitly name
  // the browser origins that are allowed to send credentialed requests.
  const allowedOrigins = configuredOrigins.length
    ? configuredOrigins
    : process.env.NODE_ENV === 'production'
      ? false
      : ['http://localhost:3000', 'http://127.0.0.1:3000'];

  const fastify = Fastify({
    logger: process.env.NODE_ENV === 'development' ? { level: 'info' } : { level: 'warn' },
    bodyLimit: 25 * 1024 * 1024, // 25MB
    trustProxy: true,
  });

  // Support empty JSON bodies gracefully (e.g. DELETE requests)
  fastify.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
    const text = typeof body === 'string' ? body : (body as any)?.toString('utf8') || '';
    if (!text || text.trim() === '') {
      done(null, {});
      return;
    }
    try {
      done(null, JSON.parse(text));
    } catch (err: any) {
      done(err, undefined);
    }
  });

  // 1. Security Headers via Helmet
  await fastify.register(helmet, {
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  });

  // 2. CORS
  await fastify.register(cors, {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  });

  // 3. Response Compression (Gzip & Deflate)
  await fastify.register(compress, {
    global: true,
    threshold: 1024, // Compress responses > 1KB
  });

  // 4. Rate Limiting (Global default 300 req/min, burst safe)
  await fastify.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
    allowList: ['127.0.0.1'],
  });

  // 5. Response Time & Server-Timing Telemetry
  fastify.addHook('onRequest', async (request) => {
    request.startTime = performance.now();
  });

  fastify.addHook('onSend', async (request, reply, payload) => {
    if (request.startTime) {
      const durationMs = performance.now() - request.startTime;
      reply.header('X-Response-Time', `${durationMs.toFixed(2)}ms`);
      reply.header('Server-Timing', `total;dur=${durationMs.toFixed(2)}`);
    }
    // Phase 3 per-request layer timing telemetry
    if (request.userCacheHit !== undefined) {
      reply.header('X-Auth-Cache', request.userCacheHit ? 'HIT' : 'MISS');
    }
    if (request.authDurationMs !== undefined) {
      reply.header('X-Auth-Time', `${request.authDurationMs.toFixed(2)}ms`);
    }
    if (request.rbacCacheHit !== undefined) {
      reply.header('X-RBAC-Cache', request.rbacCacheHit ? 'HIT' : 'MISS');
    }
    if (request.rbacDurationMs !== undefined) {
      reply.header('X-RBAC-Time', `${request.rbacDurationMs.toFixed(2)}ms`);
    }
    return payload;
  });


  // 6. Core Infrastructure Plugins
  await fastify.register(prismaPlugin);
  await fastify.register(cachePlugin);
  await fastify.register(queuePlugin);
  await fastify.register(authPlugin);
  installRoutePolicy(fastify);

  // 7. Migrated & Optimized High-Performance Route Plugins
  await fastify.register(authRoutes);
  await fastify.register(systemRoutes);
  await fastify.register(storageRoutes);
  await fastify.register(batchesRoutes);
  await fastify.register(subjectsRoutes);
  await fastify.register(lessonsRoutes);
  await fastify.register(dashboardRoutes);
  await fastify.register(usersRoutes);
  await fastify.register(videosRoutes);
  await fastify.register(testsRoutes);
  await fastify.register(searchRoutes);
  await fastify.register(youtubeImportRoutes);
  await fastify.register(exportsRoutes);
  await fastify.register(jobsRoutes);
  await fastify.register(communityRoutes);

  // 8. Global Error Handler
  fastify.setErrorHandler((error: any, request, reply) => {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal server error';

    reply.status(statusCode).send({
      statusCode,
      message,
      error: error.name || 'Error',
      ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {}),
    });
  });

  return fastify;
}
