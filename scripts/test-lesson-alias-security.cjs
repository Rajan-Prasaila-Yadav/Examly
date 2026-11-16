const { test } = require('node:test');
const assert = require('node:assert/strict');
process.env.TS_NODE_PROJECT = require('node:path').join(__dirname, '../apps/api/tsconfig.json');
require('ts-node/register/transpile-only');
const Fastify = require('fastify');
const { lessonsRoutes } = require('../apps/api/src/fastify/routes/lessons.routes.ts');

async function setup({ accessible = false, validFolder = false } = {}) {
  let writes = 0, cacheReads = 0;
  const invalidations = [];
  const lesson = { id: 'lesson', subjectId: 'subject', subject: { batch: null } };
  const app = Fastify();
  app.decorate('authenticate', async request => { request.user = { userId: 'admin', roleCode: 'ADMIN', instituteId: 'institute', permissions: ['*.*'] }; });
  app.decorate('cache', { getOrSet: async () => { cacheReads++; return lesson; }, invalidatePrefix: prefix => invalidations.push(prefix) });
  app.decorate('prisma', {
    subject: { findFirst: async ({ where }) => { assert.ok(where.OR.some(scope => scope.instituteId === 'institute')); return accessible ? { id: 'subject' } : null; } },
    lesson: { findFirst: async () => lesson, findUnique: async () => lesson, findMany: async () => [lesson], update: async () => { writes++; return lesson; } },
    video: { findFirst: async () => ({ id: 'video', lessonId: 'lesson' }) },
    note: { findFirst: async () => ({ id: 'note', lessonId: 'lesson' }) },
    resourceNode: {
      findUnique: async () => ({ lessonId: 'lesson' }),
      findFirst: async ({ where }) => { assert.equal(where.lessonId, 'lesson'); assert.equal(where.isFolder, true); return validFolder ? { id: 'folder' } : null; },
      count: async () => 0,
      create: async ({ data }) => { writes++; return data; },
    },
    $transaction: async operations => Promise.all(operations),
  });
  await app.register(lessonsRoutes);
  return { app, counts: () => ({ writes, cacheReads }), invalidations };
}
test('legacy lesson read checks access before returning cached data', async () => {
  const { app, counts } = await setup();
  try { assert.equal((await app.inject('/api/v1/lessons/lesson')).statusCode, 404); assert.equal(counts().cacheReads, 0); }
  finally { await app.close(); }
});
test('legacy curriculum mutations reject inaccessible hierarchy before writes', async () => {
  const { app, counts } = await setup();
  const cases = [
    ['POST', '/api/v1/lessons', { subjectId: 'subject', name: 'Lesson' }],
    ['POST', '/api/v1/lessons/subject/subject', { name: 'Lesson' }],
    ['PUT', '/api/v1/lessons/reorder', { ids: ['lesson'] }],
    ['PUT', '/api/v1/lessons/lesson', { name: 'Updated' }],
    ['DELETE', '/api/v1/lessons/lesson'],
    ['POST', '/api/v1/lessons/lesson/videos', { title: 'Video', videoUrl: 'https://example.com/video' }],
    ['PUT', '/api/v1/lessons/videos/video', { title: 'Updated' }],
    ['DELETE', '/api/v1/lessons/videos/video'],
    ['POST', '/api/v1/lessons/lesson/notes', { title: 'Note', fileUrl: 'https://example.com/note.pdf' }],
    ['PUT', '/api/v1/lessons/notes/note', { title: 'Updated' }],
    ['DELETE', '/api/v1/lessons/notes/note'],
    ['POST', '/api/v1/lessons/lesson/resources', { title: 'Folder', isFolder: true }],
    ['DELETE', '/api/v1/lessons/resources/resource'],
  ];
  try {
    for (const [method, url, payload] of cases) assert.equal((await app.inject({ method, url, ...(payload ? { payload } : {}) })).statusCode, 404, `${method} ${url}`);
    assert.equal(counts().writes, 0);
  } finally { await app.close(); }
});
test('main-library lessons without a batch can be reordered and invalidate cache', async () => {
  const { app, counts, invalidations } = await setup({ accessible: true });
  try {
    assert.equal((await app.inject({ method: 'PUT', url: '/api/v1/lessons/reorder', payload: { ids: ['lesson'] } })).statusCode, 200);
    assert.equal(counts().writes, 1); assert.deepEqual(invalidations, ['lesson:', 'subject:']);
  } finally { await app.close(); }
});
test('resources cannot be attached to another lesson folder', async () => {
  for (const validFolder of [false, true]) {
    const { app, counts } = await setup({ accessible: true, validFolder });
    try {
      const res = await app.inject({ method: 'POST', url: '/api/v1/lessons/lesson/resources', payload: { title: 'Folder', isFolder: true, parentId: 'folder' } });
      assert.equal(res.statusCode, validFolder ? 201 : 400); assert.equal(counts().writes, validFolder ? 1 : 0);
    } finally { await app.close(); }
  }
});
