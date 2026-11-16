const { test } = require('node:test');
const assert = require('node:assert/strict');
process.env.TS_NODE_PROJECT = require('node:path').join(__dirname, '../apps/api/tsconfig.json');
require('ts-node/register/transpile-only');
const Fastify = require('fastify');
const { studentFeedRoutes } = require('../apps/api/src/fastify/routes/student-feed.routes.ts');
const { contentRoutes } = require('../apps/api/src/fastify/routes/content.routes.ts');

async function setup({ blocked, permissions = ['notes.read', 'lessons.read'], plugin = studentFeedRoutes } = {}) {
  let writes = 0;
  const db = {
    studentProfile: { findUnique: async () => ({ batchId: 'enrolled' }) },
    note: { findFirst: async ({ where }) => { assert.equal(where.status, 'ACTIVE'); return blocked === 'note' ? null : { id: 'note', lessonId: 'lesson' }; } },
    lesson: { findFirst: async ({ where }) => { assert.equal(where.status, 'ACTIVE'); return blocked === 'lesson' ? null : { id: 'lesson', subjectId: 'subject' }; },
      findUnique: async ({ include }) => { assert.equal(!!include.resources, permissions.includes('resources.read')); return { id: 'lesson', ...(include.resources ? { resources: [] } : {}) }; } },
    subject: { findFirst: async ({ where }) => {
      assert.equal(where.batchId, 'enrolled'); assert.equal(where.status, 'ACTIVE');
      assert.equal(where.batch.instituteId, 'institute'); assert.equal(where.batch.status, 'ACTIVE');
      return blocked === 'subject' ? null : { id: 'subject' };
    }, findMany: async ({ include }) => { assert.equal(include._count.select.lessons.where.status, 'ACTIVE'); return []; } },
    pdfAnnotation: { findMany: async () => [], create: async ({ data }) => { writes++; return data; } },
    bookmark: { findMany: async () => [{ id: 'saved', targetType: 'NOTE', targetId: 'note' }], upsert: async ({ create }) => { writes++; return create; } },
  };
  const app = Fastify();
  app.decorate('prisma', db);
  app.decorate('authenticate', async request => { request.user = { userId: 'student', roleCode: 'STUDENT', instituteId: 'institute', permissions }; });
  await app.register(plugin);
  return { app, writes: () => writes };
}
test('annotations and bookmarks respect hidden content and inaccessible parent hierarchy', async () => {
  for (const blocked of ['note', 'lesson', 'subject']) {
    const { app, writes } = await setup({ blocked });
    try {
      assert.equal((await app.inject('/api/v1/notes/note/annotations')).statusCode, 404);
      assert.equal((await app.inject({ method: 'POST', url: '/api/v1/notes/note/annotations', payload: { pageNumber: 1, type: 'HIGHLIGHT' } })).statusCode, 404);
      assert.equal((await app.inject({ method: 'POST', url: '/api/v1/bookmarks', payload: { targetType: 'NOTE', targetId: 'note' } })).statusCode, 404);
      assert.deepEqual((await app.inject('/api/v1/bookmarks')).json().data, []);
      assert.equal(writes(), 0);
    } finally { await app.close(); }
  }
});
test('accessible annotations accept valid geometry and reject malformed pages/types', async () => {
  const { app, writes } = await setup();
  try {
    const create = payload => app.inject({ method: 'POST', url: '/api/v1/notes/note/annotations', payload });
    assert.equal((await create({ pageNumber: 0, type: 'HIGHLIGHT' })).statusCode, 400);
    assert.equal((await create({ pageNumber: 1, type: 'UNSUPPORTED' })).statusCode, 400);
    const result = await create({ pageNumber: 2, type: 'HIGHLIGHT', geometryJson: { x: 10 } });
    assert.equal(result.statusCode, 200); assert.equal(result.json().data.geometryJson, '{"x":10}'); assert.equal(writes(), 1);
  } finally { await app.close(); }
});
test('revoked read permission hides saved material and rejects annotation access', async () => {
  const { app, writes } = await setup({ permissions: [] });
  try {
    assert.equal((await app.inject('/api/v1/notes/note/annotations')).statusCode, 403);
    assert.deepEqual((await app.inject('/api/v1/bookmarks')).json().data, []);
    assert.equal((await app.inject({ method: 'POST', url: '/api/v1/bookmarks', payload: { targetType: 'NOTE', targetId: 'note' } })).statusCode, 403);
    assert.equal(writes(), 0);
  } finally { await app.close(); }
});
test('bookmark input validates type and preserves valid structured metadata', async () => {
  const { app, writes } = await setup();
  try {
    const create = payload => app.inject({ method: 'POST', url: '/api/v1/bookmarks', payload });
    assert.equal((await create({ targetType: 'ADMIN', targetId: 'note' })).statusCode, 400);
    const response = await create({ targetType: 'NOTE', targetId: 'note', metadataJson: { page: 2 } });
    assert.equal(response.statusCode, 200); assert.equal(response.json().data.metadataJson, '{"page":2}'); assert.equal(writes(), 1);
  } finally { await app.close(); }
});
test('student curriculum counts exclude hidden lessons', async () => {
  const { app } = await setup({ permissions: ['subjects.read'], plugin: contentRoutes });
  try { assert.equal((await app.inject('/api/v1/content/subjects')).statusCode, 200); }
  finally { await app.close(); }
});
test('lesson resources are included only with resource-read permission', async () => {
  for (const allowed of [false, true]) {
    const { app } = await setup({ plugin: contentRoutes, permissions: ['lessons.read', ...(allowed ? ['resources.read'] : [])] });
    try {
      const response = await app.inject('/api/v1/content/lessons/lesson');
      assert.equal(response.statusCode, 200);
      assert.equal('resources' in response.json(), allowed);
    } finally { await app.close(); }
  }
});
