// Isolated fixtures only: these tests never connect to the real database.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
process.env.TS_NODE_PROJECT = require('node:path').join(__dirname, '../apps/api/tsconfig.json');
require('ts-node/register/transpile-only');
const Fastify = require('fastify');
const jwt = require('jsonwebtoken');
const { authRoutes } = require('../apps/api/src/fastify/routes/auth.routes.ts');
const { studentFeedRoutes } = require('../apps/api/src/fastify/routes/student-feed.routes.ts');
const { installTestAccess } = require('../apps/api/src/fastify/routes/test-access.ts');
const { testsRoutes } = require('../apps/api/src/fastify/routes/tests.routes.ts');
const { videosRoutes } = require('../apps/api/src/fastify/routes/videos.routes.ts');
const { communityRoutes } = require('../apps/api/src/fastify/routes/community.routes.ts');
const student = { userId: 'student', roleCode: 'STUDENT', instituteId: 'institute-a' };
async function appFor(plugin, db, user = student) {
  const app = Fastify();
  app.decorate('prisma', db);
  app.decorate('authenticate', async request => { request.user = user; });
  await app.register(plugin);
  return app;
}

async function videoApp(db) {
  const app = Fastify();
  app.decorate('prisma', db);
  app.decorate('authenticate', async request => { request.user = student; });
  app.decorate('cache', { getOrSet: async (_key, fn) => fn(), invalidate: () => {}, invalidateTag: () => {} });
  await app.register(videosRoutes);
  return app;
}

async function communityApp(db, user = student) {
  const app = Fastify();
  app.decorate('prisma', db);
  app.decorate('authenticate', async request => { request.user = user; });
  await app.register(communityRoutes);
  return app;
}

test('unenrolled, hidden-batch and cross-institute students receive no feed content', async () => {
  for (const batch of [null, { id: 'batch', status: 'HIDDEN', instituteId: 'institute-a' }, { id: 'batch', status: 'ACTIVE', instituteId: 'other' }]) {
    const app = await appFor(studentFeedRoutes, { studentProfile: { findUnique: async () => ({ batch }) } });
    try {
      const res = await app.inject('/api/v1/students/home-feed');
      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.json().data.liveTests, []);
      assert.equal(res.json().data.enrolledBatch, null);
    } finally { await app.close(); }
  }
});
test('enrolled feed scopes content and hides unreleased scores', async () => {
  const db = {
    studentProfile: { findUnique: async () => ({ batch: { id: 'batch', status: 'ACTIVE', instituteId: 'institute-a' } }) },
    test: { findMany: async ({ where }) => { assert.equal(where.batchId, 'batch'); assert.equal(where.instituteId, 'institute-a'); return []; } },
    videoWatchProgress: {
      findFirst: async ({ where }) => { assert.equal(where.video.lesson.subject.batchId, 'batch'); return null; },
      findMany: async ({ where }) => { assert.equal(where.userId, student.userId); return []; },
    },
    video: { findFirst: async ({ where }) => { assert.equal(where.lesson.subject.batchId, 'batch'); assert.equal(where.lesson.subject.batch.instituteId, 'institute-a'); return null; } },
    note: { findMany: async ({ where }) => { assert.equal(where.status, 'ACTIVE'); assert.equal(where.lesson.status, 'ACTIVE'); return []; } },
    batchClass: { findMany: async ({ where }) => { assert.equal(where.batchId, 'batch'); assert.equal(where.date, new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kathmandu', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())); return []; } },
    testAttempt: { findMany: async () => [{ test: { config: { publishMode: 'MANUAL_BY_ADMIN' } }, result: { percentage: 100, publishedAt: null } }] },
  };
  const app = await appFor(studentFeedRoutes, db);
  try { const res = await app.inject('/api/v1/students/home-feed'); assert.equal(res.statusCode, 200); assert.equal(res.json().data.stats.averagePercentage, 0); }
  finally { await app.close(); }
});
test('students cannot list or reply to admin support tickets', async () => {
  const app = await appFor(studentFeedRoutes, {});
  try {
    assert.equal((await app.inject('/api/v1/support/admin/all')).statusCode, 403);
    assert.equal((await app.inject({ method: 'PUT', url: '/api/v1/support/admin/other/reply', payload: { reply: 'unauthorized' } })).statusCode, 403);
  } finally { await app.close(); }
});
test('admin support listing and reply are restricted to institute members', async () => {
  const app = await appFor(studentFeedRoutes, {
    user: { findMany: async ({ where }) => { assert.equal(where.instituteId, 'institute-a'); return [{ id: 'member' }]; } },
    supportTicket: {
      findMany: async ({ where }) => { assert.deepEqual(where.userId.in, ['member']); return []; },
      updateMany: async ({ where }) => { assert.deepEqual(where.userId.in, ['member']); return { count: 0 }; },
    },
  }, { ...student, roleCode: 'ADMIN' });
  try {
    assert.equal((await app.inject('/api/v1/support/admin/all')).statusCode, 200);
    assert.equal((await app.inject({ method: 'PUT', url: '/api/v1/support/admin/other/reply', payload: { reply: 'reply' } })).statusCode, 404);
  } finally { await app.close(); }
});
test('registration and onboarding cannot grant a student enrollment', async () => {
  const app = await appFor(authRoutes, { studentProfile: { findUnique: async () => ({ batchId: 'assigned' }) } });
  try {
    assert.equal((await app.inject({ method: 'POST', url: '/api/v1/auth/register', payload: { fullName: 'Test Student', email: 'test@example.com', password: 'test-password', batchId: 'other' } })).statusCode, 403);
    for (const batchId of ['other', null]) assert.equal((await app.inject({ method: 'PATCH', url: '/api/v1/auth/onboarding', payload: { batchId } })).statusCode, 403);
  } finally { await app.close(); }
});

test('onboarding reports a duplicate phone without updating the account', async () => {
  let updateCalled = false;
  const app = await appFor(authRoutes, {
    user: {
      findFirst: async () => ({ id: 'other-user' }),
      update: async () => { updateCalled = true; },
    },
  });
  try {
    const response = await app.inject({ method: 'PATCH', url: '/api/v1/auth/onboarding', payload: { phone: '9800000000' } });
    assert.equal(response.statusCode, 409);
    assert.match(response.json().message, /already used/i);
    assert.equal(updateCalled, false);
  } finally { await app.close(); }
});

test('onboarding returns a public user shape without credentials', async () => {
  const profile = {
    id: 'student', fullName: 'Student', email: 'student@example.com', phone: '9800000000', identifier: 'S1', avatarUrl: null,
    passwordHash: 'must-not-leave-server', role: { code: 'STUDENT' }, instituteId: 'institute-a', institute: { name: 'Institute A' },
    studentProfile: null, teacherProfile: null,
  };
  const app = await appFor(authRoutes, {
    user: {
      findFirst: async () => null,
      update: async () => profile,
      findUnique: async () => profile,
    },
    studentProfile: { upsert: async () => ({}) },
  });
  try {
    const response = await app.inject({ method: 'PATCH', url: '/api/v1/auth/onboarding', payload: { phone: '9800000000' } });
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().user.passwordHash, undefined);
    assert.equal(response.json().user.email, 'student@example.com');
  } finally { await app.close(); }
});
test('refresh rotates an active session and rejects replay and revocation', async () => {
  const token = jwt.sign({ sub: 'student' }, process.env.JWT_REFRESH_SECRET || 'examly_local_development_refresh_secret_change_me', { expiresIn: '1h' });
  let session = { id: 'session', isActive: true, refreshTokenHash: crypto.createHash('sha256').update(token).digest('hex') };
  const app = await appFor(authRoutes, {
    user: { findUnique: async () => ({ id: 'student', status: 'ACTIVE', role: { code: 'STUDENT' }, institute: { status: 'ACTIVE' } }) },
    userSession: {
      findMany: async () => session.isActive ? [session] : [],
      updateMany: async ({ where, data }) => { if (session.refreshTokenHash !== where.refreshTokenHash) return { count: 0 }; session = { ...session, ...data }; return { count: 1 }; },
    },
  });
  const renew = refreshToken => app.inject({ method: 'POST', url: '/api/v1/auth/refresh', payload: { refreshToken } });
  try {
    const first = await renew(token); assert.equal(first.statusCode, 200); assert.notEqual(first.json().refreshToken, token);
    assert.equal((await renew(token)).statusCode, 401);
    session.isActive = false;
    assert.equal((await renew(first.json().refreshToken)).statusCode, 401);
  } finally { await app.close(); }
});
test('batch tests reject students without active enrollment', async () => {
  const plugin = async app => {
    installTestAccess(app);
    app.get('/api/v1/tests/:id', { preHandler: [app.authenticate] }, async () => ({ secret: true }));
  };
  const app = await appFor(plugin, {
    test: { findFirst: async () => ({ id: 'test', batchId: 'batch', isPublished: true, status: 'ACTIVE' }) },
    studentProfile: { findUnique: async () => null },
  });
  try { assert.equal((await app.inject('/api/v1/tests/test')).statusCode, 404); }
  finally { await app.close(); }
});

test('students cannot open standalone tests outside their copied curriculum', async () => {
  const plugin = async app => {
    installTestAccess(app);
    app.get('/api/v1/tests/:id', { preHandler: [app.authenticate] }, async () => ({ secret: true }));
  };
  const app = await appFor(plugin, {
    test: { findFirst: async () => ({ id: 'test', batchId: null, subjectId: 'outside-subject', lessonId: null, isPublished: true, status: 'ACTIVE' }) },
    studentProfile: { findUnique: async () => ({ batchId: 'batch', batch: { status: 'ACTIVE', instituteId: 'institute-a' } }) },
    subject: { findFirst: async () => null },
  });
  try { assert.equal((await app.inject('/api/v1/tests/test')).statusCode, 404); }
  finally { await app.close(); }
});

test('students cannot bookmark questions from an unrelated published test', async () => {
  const db = {
    question: { findFirst: async () => ({ section: { test: { id: 'outside-test', status: 'ACTIVE', isPublished: true, batchId: null, subjectId: 'outside-subject', lessonId: null, instituteId: 'institute-a' } } }) },
    studentProfile: { findUnique: async () => ({ batchId: 'batch', batch: { status: 'ACTIVE', instituteId: 'institute-a' } }) },
    subject: { findFirst: async () => null },
  };
  const app = await appFor(studentFeedRoutes, db, { ...student, permissions: ['tests.read'] });
  try {
    const response = await app.inject({ method: 'POST', url: '/api/v1/bookmarks', payload: { targetType: 'QUESTION', targetId: 'outside-question' } });
    assert.equal(response.statusCode, 404);
  } finally { await app.close(); }
});

test('legacy video progress cannot be saved for inaccessible content', async () => {
  let writes = 0;
  const app = await videoApp({
    video: { findFirst: async () => null },
    videoWatchProgress: { upsert: async () => { writes++; } },
  });
  try {
    const response = await app.inject({ method: 'POST', url: '/api/v1/videos/other-video/progress', payload: { progressSeconds: 5, durationSeconds: 10 } });
    assert.equal(response.statusCode, 404);
    assert.equal(writes, 0);
  } finally { await app.close(); }
});

test('legacy video history is filtered to the student active batch', async () => {
  const app = await videoApp({
    studentProfile: { findUnique: async () => ({ batchId: 'batch' }) },
    videoWatchProgress: { findMany: async ({ where }) => {
      assert.equal(where.userId, 'student');
      assert.equal(where.video.lesson.subject.batchId, 'batch');
      assert.equal(where.video.lesson.subject.batch.status, 'ACTIVE');
      return [];
    } },
  });
  try { assert.equal((await app.inject('/api/v1/videos/history')).statusCode, 200); }
  finally { await app.close(); }
});

test('students cannot react to community posts outside their active batch', async () => {
  let reactionReads = 0;
  const app = await communityApp({
    studentProfile: { findUnique: async () => ({ batchId: 'batch', batch: { id: 'batch', status: 'ACTIVE', instituteId: 'institute-a' } }) },
    communityPost: { findFirst: async ({ where }) => {
      assert.equal(where.instituteId, 'institute-a');
      assert.deepEqual(where.OR, [{ batchId: null }, { batchId: 'batch' }]);
      return null;
    } },
    postReaction: { findUnique: async () => { reactionReads++; } },
  });
  try {
    const response = await app.inject({ method: 'POST', url: '/api/v1/community/posts/outside/react', payload: { reactionType: 'LIKE' } });
    assert.equal(response.statusCode, 404);
    assert.equal(reactionReads, 0);
  } finally { await app.close(); }
});

test('unenrolled students receive no community feed', async () => {
  const app = await communityApp({
    studentProfile: { findUnique: async () => ({ batchId: null, batch: null }) },
    communityPost: { findMany: async ({ where }) => { assert.equal(where.id, '__none__'); return []; } },
  });
  try { assert.deepEqual((await app.inject('/api/v1/community/feed')).json(), []); }
  finally { await app.close(); }
});

test('community replies must belong to the addressed post', async () => {
  let writes = 0;
  const app = await communityApp({
    studentProfile: { findUnique: async () => ({ batchId: 'batch', batch: { id: 'batch', status: 'ACTIVE', instituteId: 'institute-a' } }) },
    communityPost: { findFirst: async () => ({ id: 'post', allowComments: true }) },
    postComment: { findFirst: async () => null, create: async () => { writes++; } },
  });
  try {
    const response = await app.inject({ method: 'POST', url: '/api/v1/community/posts/post/comments', payload: { content: 'Reply', parentId: 'other-post-comment' } });
    assert.equal(response.statusCode, 400);
    assert.equal(writes, 0);
  } finally { await app.close(); }
});

test('students can bookmark questions inherited through a copied lesson', async () => {
  let stored = false;
  const db = {
    question: { findFirst: async () => ({ section: { test: { id: 'source-test', status: 'ACTIVE', isPublished: true, batchId: null, subjectId: null, lessonId: 'source-lesson', instituteId: 'institute-a' } } }) },
    studentProfile: { findUnique: async () => ({ batchId: 'batch', batch: { status: 'ACTIVE', instituteId: 'institute-a' } }) },
    subject: { findFirst: async ({ where }) => {
      assert.equal(where.batchId, 'batch');
      assert.equal(where.OR[2].lessons.some.OR[1].copiedFromId, 'source-lesson');
      return { id: 'copied-subject' };
    } },
    bookmark: { upsert: async ({ create }) => { stored = true; return create; } },
  };
  const app = await appFor(studentFeedRoutes, db, { ...student, permissions: ['tests.read'] });
  try {
    const response = await app.inject({ method: 'POST', url: '/api/v1/bookmarks', payload: { targetType: 'QUESTION', targetId: 'source-question' } });
    assert.equal(response.statusCode, 200);
    assert.equal(stored, true);
  } finally { await app.close(); }
});

test('answer keys remain hidden until a student result is released', async () => {
  const db = {
    test: {
      findFirst: async () => ({ id: 'test', batchId: 'batch', isPublished: true, status: 'ACTIVE', config: { publishMode: 'MANUAL_BY_ADMIN' }, _count: { attempts: 0 } }),
      findUnique: async () => ({ id: 'test', config: { publishMode: 'MANUAL_BY_ADMIN' }, sections: [] }),
    },
    studentProfile: { findUnique: async () => ({ batchId: 'batch', batch: { status: 'ACTIVE', instituteId: 'institute-a' } }) },
    testAttempt: { findFirst: async () => ({ id: 'attempt', studentId: 'student', answers: [], result: { publishedAt: null } }) },
  };
  const app = await appFor(testsRoutes, db);
  try { assert.equal((await app.inject('/api/v1/tests/test/answer-key')).statusCode, 403); }
  finally { await app.close(); }
});

test('answer keys are available to the owning student after release', async () => {
  const db = {
    test: {
      findFirst: async () => ({ id: 'test', batchId: 'batch', isPublished: true, status: 'ACTIVE', config: { publishMode: 'MANUAL_BY_ADMIN' }, _count: { attempts: 0 } }),
      findUnique: async () => ({ id: 'test', config: { publishMode: 'MANUAL_BY_ADMIN' }, sections: [] }),
    },
    studentProfile: { findUnique: async () => ({ batchId: 'batch', batch: { status: 'ACTIVE', instituteId: 'institute-a' } }) },
    testAttempt: { findFirst: async () => ({ id: 'attempt', studentId: 'student', answers: [], result: { publishedAt: new Date() } }) },
  };
  const app = await appFor(testsRoutes, db);
  try { assert.equal((await app.inject('/api/v1/tests/test/answer-key')).statusCode, 200); }
  finally { await app.close(); }
});

test('students can open tests inherited through a copied lesson', async () => {
  const plugin = async app => {
    installTestAccess(app);
    app.get('/api/v1/tests/:id', { preHandler: [app.authenticate] }, async () => ({ available: true }));
  };
  const app = await appFor(plugin, {
    test: { findFirst: async () => ({ id: 'test', batchId: null, subjectId: null, lessonId: 'source-lesson', isPublished: true, status: 'ACTIVE' }) },
    studentProfile: { findUnique: async () => ({ batchId: 'batch', batch: { status: 'ACTIVE', instituteId: 'institute-a' } }) },
    subject: { findFirst: async ({ where }) => {
      assert.equal(where.batchId, 'batch');
      assert.equal(where.OR[2].lessons.some.OR[1].copiedFromId, 'source-lesson');
      return { id: 'copied-subject' };
    } },
  });
  try { assert.equal((await app.inject('/api/v1/tests/test')).statusCode, 200); }
  finally { await app.close(); }
});

test('password login, registration and Google login all persist refresh sessions', async () => {
  const bcrypt = require('bcrypt');
  const { OAuth2Client } = require('google-auth-library');
  const original = OAuth2Client.prototype.verifyIdToken;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  process.env.GOOGLE_CLIENT_ID = 'test-client';
  OAuth2Client.prototype.verifyIdToken = async () => ({ getPayload: () => ({ sub: 'google-user', email: 'test@example.com', email_verified: true }) });
  const user = { id: 'student', fullName: 'Test Student', email: 'test@example.com', status: 'ACTIVE', googleId: 'google-user', avatarUrl: 'https://example.com/avatar', role: { code: 'STUDENT' }, institute: { status: 'ACTIVE' }, passwordHash: await bcrypt.hash('test-password', 4) };
  try {
    for (const kind of ['login', 'register', 'google']) {
      let stored;
      const app = await appFor(authRoutes, {
        user: { findFirst: async () => kind === 'register' ? null : user, create: async () => user },
        role: { findFirst: async () => ({ id: 'role' }) },
        institute: { findFirst: async () => ({ id: 'institute-a' }) },
        userSession: { create: async ({ data }) => { stored = data; } },
      });
      try {
        const payload = kind === 'google' ? { idToken: 'verified-by-test-stub' } : { fullName: 'Test Student', email: 'test@example.com', password: 'test-password' };
        const response = await app.inject({ method: 'POST', url: `/api/v1/auth/${kind}`, payload });
        assert.equal(response.statusCode, kind === 'register' ? 201 : 200, response.body);
        assert.equal(stored.userId, 'student');
        assert.equal(stored.refreshTokenHash, crypto.createHash('sha256').update(response.json().refreshToken).digest('hex'));
      } finally { await app.close(); }
    }
  } finally {
    OAuth2Client.prototype.verifyIdToken = original;
    if (clientId === undefined) delete process.env.GOOGLE_CLIENT_ID; else process.env.GOOGLE_CLIENT_ID = clientId;
  }
});
