// Isolated access checks: no connected database records are used.
const { test } = require('node:test');
const assert = require('node:assert/strict');
process.env.TS_NODE_PROJECT = require('node:path').join(__dirname, '../apps/api/tsconfig.json');
require('ts-node/register/transpile-only');
const Fastify = require('fastify');
const { batchesRoutes } = require('../apps/api/src/fastify/routes/batches.routes.ts');
const { subjectsRoutes } = require('../apps/api/src/fastify/routes/subjects.routes.ts');

const student = { userId: 'student', roleCode: 'STUDENT', instituteId: 'institute', permissions: ['batches.read', 'subjects.read'] };

async function subjectApp({ enrolled = 'enrolled', subjectBatch = 'enrolled', permissions = student.permissions } = {}) {
  let subjectReads = 0;
  const app = Fastify();
  app.decorate('authenticate', async request => { request.user = { ...student, permissions }; });
  app.decorate('prisma', {
    studentProfile: { findUnique: async () => ({ batchId: enrolled }) },
    batch: { findFirst: async ({ where }) => where.id === enrolled ? { id: enrolled } : null },
    subject: {
      findFirst: async ({ select, include }) => {
        subjectReads++;
        if (select) return { batchId: subjectBatch };
        assert.equal(include.lessons.include.resources, false);
        return { id: 'subject', lessons: [] };
      },
      findMany: async () => [],
    },
  });
  await app.register(subjectsRoutes);
  return { app, reads: () => subjectReads };
}

test('student aliases cannot read a batch outside their enrollment', async () => {
  const { app } = await subjectApp();
  try { assert.equal((await app.inject('/api/v1/subjects/batch/other-batch')).statusCode, 404); }
  finally { await app.close(); }
});

test('student subject detail rejects a subject from another batch', async () => {
  const { app, reads } = await subjectApp({ subjectBatch: 'other-batch' });
  try {
    assert.equal((await app.inject('/api/v1/subjects/subject')).statusCode, 404);
    assert.equal(reads(), 1);
  } finally { await app.close(); }
});

test('student subject detail omits resources without resource permission', async () => {
  const { app } = await subjectApp();
  try { assert.equal((await app.inject('/api/v1/subjects/subject')).statusCode, 200); }
  finally { await app.close(); }
});

test('student batch list queries only the assigned batch', async () => {
  const app = Fastify();
  app.decorate('authenticate', async request => { request.user = student; });
  app.decorate('prisma', {
    studentProfile: { findUnique: async () => ({ batchId: 'enrolled' }) },
    batch: { findMany: async ({ where }) => { assert.equal(where.id, 'enrolled'); assert.equal(where.status, 'ACTIVE'); return []; } },
  });
  await app.register(batchesRoutes);
  try { assert.deepEqual((await app.inject('/api/v1/batches')).json(), []); }
  finally { await app.close(); }
});
