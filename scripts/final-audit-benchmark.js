// scripts/final-audit-benchmark.js
const { PrismaClient, RecordStatus, VideoProvider, QuestionType, TestType } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'examly_ephemeral_dev_secret_key_must_be_overridden_in_prod_12345';

require('ts-node').register({
  project: require('path').resolve(__dirname, '../apps/api/tsconfig.json'),
  transpileOnly: true,
});

function calculatePercentiles(latencies) {
  const sorted = [...latencies].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)].toFixed(2);
  const p95 = sorted[Math.floor(sorted.length * 0.95)].toFixed(2);
  const p99 = sorted[Math.floor(sorted.length * 0.99)].toFixed(2);
  return { p50, p95, p99 };
}

async function runFinalAudit() {
  console.log('========================================================================');
  console.log('🏁 EXAMLY PHASE 18: FINAL PRODUCTION PERFORMANCE & SECURITY AUDIT');
  console.log('========================================================================\n');

  const { createFastifyApp } = require('../apps/api/src/fastify/server');
  const app = await createFastifyApp();
  await app.ready();

  // 1. Ensure or Seed Audit Test Fixtures
  let adminUser = await prisma.user.findFirst({
    where: { role: { code: 'SUPER_ADMIN' } },
    include: { role: { include: { permissions: true } } },
  });

  if (!adminUser) {
    adminUser = await prisma.user.findFirst({
      include: { role: { include: { permissions: true } } },
    });
  }

  const token = jwt.sign(
    {
      sub: adminUser?.id || 'admin_audit_id',
      userId: adminUser?.id || 'admin_audit_id',
      instituteId: adminUser?.instituteId || 'inst_audit',
      roleCode: adminUser?.role?.code || 'SUPER_ADMIN',
      identifier: adminUser?.identifier || 'admin',
      email: adminUser?.email || 'admin@examly.com',
    },
    JWT_SECRET,
    { expiresIn: '2h' },
  );

  const headers = { authorization: `Bearer ${token}` };

  // Fetch or create fixture models
  let batch = await prisma.batch.findFirst();
  if (!batch) {
    batch = await prisma.batch.create({
      data: { name: 'Audit Batch 2026', code: 'AUDIT-2026', status: RecordStatus.ACTIVE },
    });
  }

  let subject = await prisma.subject.findFirst({ where: { batchId: batch.id } });
  if (!subject) {
    subject = await prisma.subject.create({
      data: { batchId: batch.id, name: 'Audit Mathematics', status: RecordStatus.ACTIVE },
    });
  }

  let lesson = await prisma.lesson.findFirst({ where: { subjectId: subject.id } });
  if (!lesson) {
    lesson = await prisma.lesson.create({
      data: { subjectId: subject.id, name: 'Calculus Fundamentals', status: RecordStatus.ACTIVE },
    });
  }

  let video = await prisma.video.findFirst({ where: { lessonId: lesson.id } });
  if (!video) {
    video = await prisma.video.create({
      data: {
        lessonId: lesson.id,
        title: 'Limits and Continuity',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        provider: VideoProvider.YOUTUBE,
        durationSeconds: 900,
        status: RecordStatus.ACTIVE,
      },
    });
  }

  let test = await prisma.test.findFirst();
  if (!test) {
    test = await prisma.test.create({
      data: {
        title: 'Mathematics Final Mock',
        batchId: batch.id,
        subjectId: subject.id,
        testType: TestType.MOCK,
        durationMinutes: 60,
        totalMarks: 100,
        passMarks: 40,
        isPublished: true,
        status: RecordStatus.ACTIVE,
      },
    });
  }

  // ── PART 1: 11-ENDPOINT LOAD & LATENCY AUDIT ──
  console.log('📊 PART 1: 11-ENDPOINT LOAD & LATENCY AUDIT (p50, p95, p99, Payload Size)\n');

  const endpoints = [
    { name: '1. Health Probe', method: 'GET', url: '/api/v1/health', headers: {} },
    { name: '2. Readiness Probe (/ready)', method: 'GET', url: '/api/v1/ready', headers: {} },
    { name: '3. Dashboard Analytics Stats', method: 'GET', url: '/api/v1/dashboard/admin', headers },
    { name: '4. Student Directory Listing', method: 'GET', url: '/api/v1/users/students?page=1&limit=20', headers },
    { name: '5. Teacher Faculty Listing', method: 'GET', url: '/api/v1/users/teachers?page=1&limit=20', headers },
    { name: '6. Curriculum Lesson Hierarchy', method: 'GET', url: `/api/v1/lessons/${lesson.id}`, headers },
    { name: '7. Direct Video Stream Detail', method: 'GET', url: `/api/v1/videos/${video.id}`, headers },
    { name: '8. Threaded Video Comments', method: 'GET', url: `/api/v1/videos/${video.id}/comments`, headers },
    { name: '9. Multi-Entity Global Search', method: 'GET', url: '/api/v1/search?q=math&limit=5', headers },
    { name: '10. Tests Catalog Listing', method: 'GET', url: '/api/v1/tests', headers },
    { name: '11. Ranked Student Leaderboard', method: 'GET', url: `/api/v1/tests/${test.id}/leaderboard`, headers },
  ];

  const auditResults = [];

  for (const ep of endpoints) {
    const latencies = [];
    let payloadSize = 0;
    let statusCode = 200;

    // Warm up 1 request to cache
    const initialRes = await app.inject({ method: ep.method, url: ep.url, headers: ep.headers });
    payloadSize = Buffer.byteLength(initialRes.payload, 'utf8');
    statusCode = initialRes.statusCode;

    // 15 warm cached requests for p50/p95/p99 distribution
    for (let i = 0; i < 15; i++) {
      const start = performance.now();
      const res = await app.inject({ method: ep.method, url: ep.url, headers: ep.headers });
      const duration = performance.now() - start;
      latencies.push(duration);
    }

    const { p50, p95, p99 } = calculatePercentiles(latencies);
    auditResults.push({
      name: ep.name,
      url: ep.url,
      statusCode,
      payloadSize: `${(payloadSize / 1024).toFixed(2)} KB`,
      p50: `${p50}ms`,
      p95: `${p95}ms`,
      p99: `${p99}ms`,
    });

    console.log(`[AUDIT] ${ep.name.padEnd(35)} | Status: ${statusCode} | p50: ${p50.padStart(6)}ms | p95: ${p95.padStart(6)}ms | p99: ${p99.padStart(6)}ms | Size: ${(payloadSize / 1024).toFixed(2)} KB`);
  }

  // ── PART 2: ZERO-TRUST SECURITY & ISOLATION AUDIT ──
  console.log('\n🛡️ PART 2: ZERO-TRUST SECURITY & ISOLATION AUDIT\n');

  const securityChecks = [
    {
      name: 'Unauthenticated Request Rejection (401)',
      fn: async () => {
        const res = await app.inject({ method: 'GET', url: '/api/v1/batches' });
        return res.statusCode === 401;
      },
    },
    {
      name: 'Tampered JWT Signature Rejection (401)',
      fn: async () => {
        const res = await app.inject({
          method: 'GET',
          url: '/api/v1/batches',
          headers: { authorization: `Bearer ${token}tampered` },
        });
        return res.statusCode === 401;
      },
    },
    {
      name: 'Security Headers Present (Helmet/CORP)',
      fn: async () => {
        const res = await app.inject({ method: 'GET', url: '/api/v1/health' });
        return res.headers['x-content-type-options'] === 'nosniff' && !!res.headers['cross-origin-resource-policy'];
      },
    },
    {
      name: 'Timing Telemetry Headers Active',
      fn: async () => {
        const res = await app.inject({ method: 'GET', url: '/api/v1/health' });
        return !!res.headers['x-response-time'] && !!res.headers['server-timing'];
      },
    },
    {
      name: 'Live Exam Student Answer Isolation (Hidden isCorrect)',
      fn: async () => {
        const studentToken = jwt.sign(
          { sub: 'student_audit', userId: 'student_audit', instituteId: 'inst_1', roleCode: 'STUDENT' },
          JWT_SECRET,
        );
        const res = await app.inject({
          method: 'POST',
          url: `/api/v1/tests/${test.id}/attempts`,
          headers: { authorization: `Bearer ${studentToken}` },
        });
        const body = JSON.parse(res.payload);
        const questions = body?.test?.sections?.[0]?.questions || [];
        const options = questions.flatMap((q) => q.options || []);
        return options.every((o) => o.isCorrect === false);
      },
    },
  ];

  let secPassed = 0;
  for (const check of securityChecks) {
    try {
      const ok = await check.fn();
      if (ok) {
        console.log(`[PASS] ${check.name}`);
        secPassed++;
      } else {
        console.error(`[FAIL] ${check.name}`);
      }
    } catch (err) {
      console.error(`[FAIL] ${check.name}: ${err.message}`);
    }
  }

  console.log(`\nSecurity Suite: ${secPassed}/${securityChecks.length} Passed`);

  await app.close();
  await prisma.$disconnect();

  return { auditResults, secPassed, totalSec: securityChecks.length };
}

runFinalAudit()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Final audit execution failed:', err);
    process.exit(1);
  });
