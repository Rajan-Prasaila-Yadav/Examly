const { test } = require('node:test');
const assert = require('node:assert/strict');
process.env.TS_NODE_PROJECT = require('node:path').join(__dirname, '../apps/api/tsconfig.json');
require('ts-node/register/transpile-only');
const Fastify = require('fastify');
const fp = require('fastify-plugin');
const queuePlugin = require('../apps/api/src/fastify/plugins/queue.plugin.ts').default;
const { authRoutes } = require('../apps/api/src/fastify/routes/auth.routes.ts');
test('missing Redis never acknowledges fake jobs', async () => {
  const previous = process.env.REDIS_URL;
  delete process.env.REDIS_URL;
  const app = Fastify();
  try {
    await app.register(fp(async app => { app.decorate('prisma', {}); }, { name: 'prisma-plugin' }));
    await app.register(queuePlugin);
    app.decorate('authenticate', async () => {});
    await app.register(authRoutes);
    assert.equal(app.backgroundJobsAvailable, false);
    for (const queue of Object.values(app.queues)) await assert.rejects(queue.add('job', {}), error => error.statusCode === 503);
  } finally {
    await app.close();
    if (previous === undefined) delete process.env.REDIS_URL; else process.env.REDIS_URL = previous;
  }
});
