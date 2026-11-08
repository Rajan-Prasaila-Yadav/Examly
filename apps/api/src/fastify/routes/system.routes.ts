// apps/api/src/fastify/routes/system.routes.ts
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { requirePermission, getRbacCacheStats } from '../plugins/rbac.plugin';


const AuditLogsQuerySchema = z.object({
  action: z.string().optional(),
  resourceType: z.string().optional(),
  userId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export const systemRoutes: FastifyPluginAsync = async (fastify) => {
  // Public Root, Health & Liveness Endpoints
  fastify.get('/', async () => {
    return {
      name: 'Examly High-Performance Fastify API Engine',
      status: 'ok',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      health: '/api/v1/health',
    };
  });

  fastify.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      engine: 'Fastify Modular Engine',
    };
  });

  fastify.get('/api/v1/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      engine: 'Fastify Modular Engine',
    };
  });

  // Deep Readiness Probe for Kubernetes / Cloud Load Balancers
  fastify.get('/api/v1/ready', async (request, reply) => {
    try {
      // 1. Check PostgreSQL Database Connection
      await fastify.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ready',
        database: 'connected',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      };
    } catch (err: any) {
      return reply.status(503).send({
        status: 'unready',
        database: 'disconnected',
        error: err.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Liveness Probe
  fastify.get('/api/v1/live', async () => {
    return {
      status: 'alive',
      uptime: process.uptime(),
      memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      timestamp: new Date().toISOString(),
    };
  });

  // Phase 3 Performance Observability — RBAC Cache Stats
  // Read-only, no auth required. Exposes cache hit/miss counts for benchmarking.
  // DO NOT expose in production without auth guard.
  fastify.get('/api/v1/perf/rbac-stats', async () => {
    const mem = process.memoryUsage();
    return {
      rbac: getRbacCacheStats(),
      memory: {
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
        rssMb: Math.round(mem.rss / 1024 / 1024),
        externalMb: Math.round(mem.external / 1024 / 1024),
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  });



  // Protected Audit Logs Route
  fastify.get(
    '/api/v1/system/audit/logs',
    {
      preHandler: [fastify.authenticate, requirePermission('settings', 'manage')],
    },
    async (request, reply) => {
      const query = AuditLogsQuerySchema.parse(request.query);
      const user = request.user!;

      const where: any = {};
      if (user.instituteId) where.instituteId = user.instituteId;
      if (query.action) where.action = query.action;
      if (query.resourceType) where.resourceType = query.resourceType;
      if (query.userId) where.userId = query.userId;

      const [logs, total] = await Promise.all([
        fastify.prisma.auditLog.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                identifier: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: query.limit,
          skip: query.offset,
        }),
        fastify.prisma.auditLog.count({ where }),
      ]);

      return {
        logs,
        total,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + query.limit < total,
      };
    },
  );

  // Protected Audit Summary Route
  fastify.get(
    '/api/v1/system/audit/summary',
    {
      preHandler: [fastify.authenticate, requirePermission('settings', 'manage')],
    },
    async (request, reply) => {
      const user = request.user!;
      const where = user.instituteId ? { instituteId: user.instituteId } : {};

      const [totalLogs, actionCounts, resourceCounts, recentActivity] = await Promise.all([
        fastify.prisma.auditLog.count({ where }),
        fastify.prisma.auditLog.groupBy({
          by: ['action'],
          where,
          _count: { action: true },
          orderBy: { _count: { action: 'desc' } },
          take: 10,
        }),
        fastify.prisma.auditLog.groupBy({
          by: ['resourceType'],
          where,
          _count: { resourceType: true },
          orderBy: { _count: { resourceType: 'desc' } },
          take: 10,
        }),
        fastify.prisma.auditLog.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ]);

      return {
        totalLogs,
        topActions: actionCounts.map((a) => ({
          action: a.action,
          count: a._count.action,
        })),
        topResources: resourceCounts.map((r) => ({
          resourceType: r.resourceType,
          count: r._count.resourceType,
        })),
        recentActivity,
      };
    },
  );
};
