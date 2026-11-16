// apps/api/src/fastify/routes/jobs.routes.ts
import { FastifyPluginAsync } from 'fastify';
import { requirePermission } from '../plugins/rbac.plugin';

export const jobsRoutes: FastifyPluginAsync = async (fastify) => {
  // Queues are global infrastructure, not tenant-scoped student resources.
  const requireSystemAdmin: typeof fastify.authenticate = async (request, reply) => {
    if (request.user?.roleCode !== 'SUPER_ADMIN') {
      return reply.code(403).send({ message: 'System administrator access required' });
    }
  };
  // GET /api/v1/jobs/:queueName/:jobId (Get live job state & progress)
  fastify.get(
    '/api/v1/jobs/:queueName/:jobId',
    {
      preHandler: [fastify.authenticate, requireSystemAdmin, requirePermission('system', 'read')],
    },
    async (request, reply) => {
      const { queueName, jobId } = request.params as { queueName: string; jobId: string };

      const status = await fastify.getJobStatus(queueName, jobId);
      if (!status) {
        return reply.status(404).send({
          statusCode: 404,
          message: `Job not found in queue "${queueName}"`,
          error: 'Not Found',
        });
      }

      return {
        id: status.id, name: status.name, state: status.state,
        progress: typeof status.progress === 'number' ? status.progress : undefined,
        attemptsMade: status.attemptsMade, timestamp: status.timestamp,
        processedOn: status.processedOn, finishedOn: status.finishedOn,
      };
    },
  );

  // GET /api/v1/jobs/dead-letter (Admin dead-letter failure log)
  fastify.get(
    '/api/v1/jobs/dead-letter',
    {
      preHandler: [fastify.authenticate, requireSystemAdmin, requirePermission('system', 'read')],
    },
    async (request, reply) => {
      const deadLetters = fastify.getDeadLetterJobs();
      return {
        totalDeadLetters: deadLetters.length,
        deadLetters: deadLetters.map(job => ({
          jobId: job.jobId, queueName: job.queueName,
          failedAt: job.failedAt, attemptsMade: job.attemptsMade,
        })),
      };
    },
  );
};
