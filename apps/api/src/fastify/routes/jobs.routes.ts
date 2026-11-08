// apps/api/src/fastify/routes/jobs.routes.ts
import { FastifyPluginAsync } from 'fastify';
import { requirePermission } from '../plugins/rbac.plugin';

export const jobsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/jobs/:queueName/:jobId (Get live job state & progress)
  fastify.get(
    '/api/v1/jobs/:queueName/:jobId',
    {
      preHandler: [fastify.authenticate],
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

      return status;
    },
  );

  // GET /api/v1/jobs/dead-letter (Admin dead-letter failure log)
  fastify.get(
    '/api/v1/jobs/dead-letter',
    {
      preHandler: [fastify.authenticate, requirePermission('system', 'read')],
    },
    async (request, reply) => {
      const deadLetters = fastify.getDeadLetterJobs();
      return {
        totalDeadLetters: deadLetters.length,
        deadLetters,
      };
    },
  );
};
