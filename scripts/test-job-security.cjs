// Isolated fixtures: no live database, Redis writes, or email delivery.
const { test } = require('node:test');
const assert = require('node:assert/strict');
process.env.TS_NODE_PROJECT = require('node:path').join(__dirname, '../apps/api/tsconfig.json');
require('ts-node/register/transpile-only');
const Fastify = require('fastify');
const { jobsRoutes } = require('../apps/api/src/fastify/routes/jobs.routes.ts');
const { authRoutes } = require('../apps/api/src/fastify/routes/auth.routes.ts');

test('global job diagnostics reject tenant roles before reading jobs', async () => {
  for (const roleCode of ['STUDENT', 'TEACHER', 'ADMIN']) {
    const app = Fastify();
    app.decorate('authenticate', async req => { req.user = { roleCode, permissions: ['*.*'] }; });
    app.decorate('getJobStatus', async () => { assert.fail('Unauthorized queue lookup'); });
    app.decorate('getDeadLetterJobs', () => { assert.fail('Unauthorized dead-letter lookup'); });
    await app.register(jobsRoutes);
    try {
      for (const url of ['/api/v1/jobs/notifications/1', '/api/v1/jobs/dead-letter']) {
        assert.equal((await app.inject(url)).statusCode, 403);
      }
    } finally { await app.close(); }
  }
});

test('system diagnostics omit payloads, reset links, results and raw errors', async () => {
  const app = Fastify();
  app.decorate('authenticate', async req => { req.user = { roleCode: 'SUPER_ADMIN', permissions: ['system.read'] }; });
  const secret = 'private-reset-token';
  app.decorate('getJobStatus', async () => ({ id: '1', state: 'failed', progress: { secret }, data: { secret }, returnvalue: { secret }, failedReason: secret }));
  app.decorate('getDeadLetterJobs', () => [{ jobId: '1', queueName: 'notifications', payload: { secret }, failedReason: secret, stackTrace: secret, attemptsMade: 3, failedAt: 123 }]);
  await app.register(jobsRoutes);
  try {
    for (const url of ['/api/v1/jobs/notifications/1', '/api/v1/jobs/dead-letter']) {
      const res = await app.inject(url);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.includes(secret), false);
      assert.equal(res.body.includes('payload'), false);
    }
  } finally { await app.close(); }
});

test('missing email provider rejects recovery before looking up an account', async () => {
  const saved = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  const app = Fastify();
  app.decorate('backgroundJobsAvailable', true);
  app.decorate('queues', { notificationsQueue: { add: async () => assert.fail('No email should be queued') } });
  app.decorate('prisma', { user: { findFirst: async () => assert.fail('No account lookup') } });
  app.decorate('authenticate', async () => {});
  await app.register(authRoutes);
  try {
    for (const email of ['existing@example.com', 'missing@example.com']) {
      assert.equal((await app.inject({ method: 'POST', url: '/api/v1/auth/forgot-password', payload: { email } })).statusCode, 503);
    }
  } finally {
    await app.close();
    if (saved === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = saved;
  }
});
