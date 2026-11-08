// scripts/phase6-realworld-benchmark.js
require('dotenv').config();
const { createFastifyApp } = require('../apps/api/dist/fastify/server');
const { PrismaClient } = require('@prisma/client');
const IORedis = require('ioredis');
const { performance } = require('perf_hooks');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

function calculatePercentiles(latencies) {
  if (!latencies || latencies.length === 0) return { p50: 0, p75: 0, p95: 0, p99: 0, avg: 0, min: 0, max: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p75 = sorted[Math.floor(sorted.length * 0.75)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  return {
    p50: Number(p50.toFixed(2)),
    p75: Number(p75.toFixed(2)),
    p95: Number(p95.toFixed(2)),
    p99: Number(p99.toFixed(2)),
    avg: Number(avg.toFixed(2)),
    min: Number(sorted[0].toFixed(2)),
    max: Number(sorted[sorted.length - 1].toFixed(2)),
  };
}

async function runPhase6Benchmark() {
  console.log('========================================================================');
  console.log('🏎️  EXAMLY PHASE 6 — REAL-WORLD 19-ENDPOINT PERFORMANCE BENCHMARK');
  console.log('========================================================================\n');

  // 1. Initialize Fastify Server Instance
  console.log('Booting Fastify API engine...');
  const app = await createFastifyApp();
  await app.ready();

  // 2. Discover Real Entities in Database for Valid Route Parameters
  console.log('Discovering database fixtures for live route injection...');
  const adminUser = await prisma.user.findFirst({
    where: { role: { code: 'ADMIN' } },
    include: { role: true },
  });
  const studentUser = await prisma.user.findFirst({
    where: { role: { code: 'STUDENT' } },
    include: { role: true, studentProfile: true },
  });
  const teacherUser = await prisma.user.findFirst({
    where: { role: { code: 'TEACHER' } },
    include: { role: true, teacherProfile: true },
  });
  const batch = await prisma.batch.findFirst();
  const lesson = await prisma.lesson.findFirst();
  const video = await prisma.video.findFirst();
  const test = await prisma.test.findFirst({ where: { status: 'ACTIVE' } }) || await prisma.test.findFirst();
  const attempt = await prisma.testAttempt.findFirst({ where: { submittedAt: { not: null } } }) || await prisma.testAttempt.findFirst();

  const accessSecret = process.env.JWT_ACCESS_SECRET || 'examly_jwt_access_super_secret_key_2026_production_abcdef';

  const adminToken = jwt.sign(
    { sub: adminUser?.id || 'admin-1', userId: adminUser?.id || 'admin-1', instituteId: adminUser?.instituteId, roleCode: 'ADMIN' },
    accessSecret,
    { expiresIn: '1h' },
  );

  const studentToken = jwt.sign(
    { sub: studentUser?.id || 'student-1', userId: studentUser?.id || 'student-1', instituteId: studentUser?.instituteId, roleCode: 'STUDENT' },
    accessSecret,
    { expiresIn: '1h' },
  );

  // 3. Measure Redis Latency
  let redisLatencyMs = 0;
  try {
    const redis = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      tls: process.env.REDIS_URL?.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
    });
    await redis.connect();
    const rStart = performance.now();
    await redis.ping();
    redisLatencyMs = Number((performance.now() - rStart).toFixed(2));
    await redis.quit();
  } catch (err) {
    redisLatencyMs = -1;
  }

  // 4. Define 19 Real-World Benchmark Test Cases
  const testCases = [
    {
      name: '1. Login (POST)',
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: {},
      payload: { identifier: adminUser?.email || 'admin@examly.com', password: 'Password@123' },
      type: 'DB-backed Auth',
      targetP95: 250,
    },
    {
      name: '2. Dashboard (GET)',
      method: 'GET',
      url: '/api/v1/dashboard/student',
      headers: { authorization: `Bearer ${studentToken}` },
      type: 'Cached/DB Read',
      targetP95: 100,
    },
    {
      name: '3. Students List (GET)',
      method: 'GET',
      url: '/api/v1/users/students?page=1&limit=20',
      headers: { authorization: `Bearer ${adminToken}` },
      type: 'DB-backed List',
      targetP95: 250,
    },
    {
      name: '4. Student Detail (GET)',
      method: 'GET',
      url: `/api/v1/users/${studentUser?.id || 'none'}`,
      headers: { authorization: `Bearer ${adminToken}` },
      type: 'DB-backed Read',
      targetP95: 100,
    },
    {
      name: '5. Teachers List (GET)',
      method: 'GET',
      url: '/api/v1/users/teachers?page=1&limit=20',
      headers: { authorization: `Bearer ${adminToken}` },
      type: 'DB-backed List',
      targetP95: 250,
    },
    {
      name: '6. Teacher Detail (GET)',
      method: 'GET',
      url: `/api/v1/users/${teacherUser?.id || 'none'}`,
      headers: { authorization: `Bearer ${adminToken}` },
      type: 'DB-backed Read',
      targetP95: 100,
    },
    {
      name: '7. Batch Detail (GET)',
      method: 'GET',
      url: `/api/v1/batches/${batch?.id || 'none'}`,
      headers: { authorization: `Bearer ${adminToken}` },
      type: 'Cached/DB Read',
      targetP95: 100,
    },
    {
      name: '8. Lesson Detail (GET)',
      method: 'GET',
      url: `/api/v1/lessons/${lesson?.id || 'none'}`,
      headers: { authorization: `Bearer ${adminToken}` },
      type: 'Cached/DB Read',
      targetP95: 100,
    },
    {
      name: '9. Video Detail (GET)',
      method: 'GET',
      url: `/api/v1/videos/${video?.id || 'none'}`,
      headers: { authorization: `Bearer ${studentToken}` },
      type: 'Cached/DB Read',
      targetP95: 100,
    },
    {
      name: '10. Video Comments (GET)',
      method: 'GET',
      url: `/api/v1/videos/${video?.id || 'none'}/comments`,
      headers: { authorization: `Bearer ${studentToken}` },
      type: 'DB-backed List',
      targetP95: 150,
    },
    {
      name: '11. Post Comment (POST)',
      method: 'POST',
      url: `/api/v1/videos/${video?.id || 'none'}/comments`,
      headers: { authorization: `Bearer ${studentToken}` },
      payload: { content: 'Real-world benchmark test comment' },
      type: 'Mutation',
      targetP95: 300,
    },
    {
      name: '12. Post Reaction (POST)',
      method: 'POST',
      url: `/api/v1/videos/${video?.id || 'none'}/reactions`,
      headers: { authorization: `Bearer ${studentToken}` },
      payload: { reactionType: 'LIKE' },
      type: 'Mutation',
      targetP95: 300,
    },
    {
      name: '13. Global Search (GET)',
      method: 'GET',
      url: '/api/v1/search?q=physics',
      headers: { authorization: `Bearer ${studentToken}` },
      type: 'pg_trgm Search',
      targetP95: 150,
    },
    {
      name: '14. Test List (GET)',
      method: 'GET',
      url: '/api/v1/tests?page=1&limit=20',
      headers: { authorization: `Bearer ${studentToken}` },
      type: 'DB-backed List',
      targetP95: 200,
    },
    {
      name: '15. Test Runner (GET)',
      method: 'GET',
      url: `/api/v1/tests/${test?.id || 'none'}/active-attempt`,
      headers: { authorization: `Bearer ${studentToken}` },
      type: 'DB-backed Read',
      targetP95: 150,
    },
    {
      name: '16. Test Submit (POST)',
      method: 'POST',
      url: `/api/v1/tests/${test?.id || 'none'}/submit`,
      headers: { authorization: `Bearer ${studentToken}` },
      payload: { attemptId: attempt?.id || 'none', answers: [] },
      type: 'Mutation',
      targetP95: 300,
    },
    {
      name: '17. Result / Attempt (GET)',
      method: 'GET',
      url: `/api/v1/tests/results/${attempt?.id || 'none'}`,
      headers: { authorization: `Bearer ${studentToken}` },
      type: 'Complex Join',
      targetP95: 250,
    },
    {
      name: '18. Watch Progress (POST)',
      method: 'POST',
      url: `/api/v1/videos/${video?.id || 'none'}/progress`,
      headers: { authorization: `Bearer ${studentToken}` },
      payload: { secondsWatched: 45, isCompleted: false },
      type: 'Mutation',
      targetP95: 300,
    },
    {
      name: '19. System Health (GET)',
      method: 'GET',
      url: '/api/v1/health',
      headers: {},
      type: 'Cached Fastify',
      targetP95: 30,
    },
  ];

  // 5. Execute 25 Warm-up & Benchmark Runs Per Endpoint
  console.log('\nExecuting 25 warm real-world requests per endpoint across all 19 endpoints...\n');

  const startMemory = process.memoryUsage();
  const startCPU = process.cpuUsage();
  const overallStart = performance.now();

  const benchmarkResults = [];

  for (const tc of testCases) {
    const latencies = [];
    let errors = 0;

    for (let i = 0; i < 25; i++) {
      const s = performance.now();
      try {
        const response = await app.inject({
          method: tc.method,
          url: tc.url,
          headers: tc.headers,
          payload: tc.payload,
        });

        const duration = performance.now() - s;
        latencies.push(duration);

        if (response.statusCode >= 500) {
          errors++;
        }
      } catch (err) {
        errors++;
        latencies.push(performance.now() - s);
      }
    }

    const stats = calculatePercentiles(latencies);
    const rps = (1000 / stats.avg).toFixed(0);

    benchmarkResults.push({
      endpoint: tc.name,
      type: tc.type,
      p50: stats.p50,
      p75: stats.p75,
      p95: stats.p95,
      p99: stats.p99,
      avg: stats.avg,
      rps,
      errors,
      targetP95: `${tc.targetP95}ms`,
      status: stats.p95 <= tc.targetP95 ? '✅ MET' : '⚠️ HIGH',
    });
  }

  const endCPU = process.cpuUsage(startCPU);
  const endMemory = process.memoryUsage();
  const totalDuration = (performance.now() - overallStart) / 1000;

  console.log('========================================================================');
  console.log('📊 MASTER 19-ENDPOINT REAL-WORLD PERFORMANCE MATRIX:');
  console.log('========================================================================');
  console.table(
    benchmarkResults.map((r) => ({
      Endpoint: r.endpoint,
      Type: r.type,
      'p50 (ms)': r.p50,
      'p75 (ms)': r.p75,
      'p95 (ms)': r.p95,
      'p99 (ms)': r.p99,
      'Avg (ms)': r.avg,
      RPS: r.rps,
      Errors: r.errors,
      'Target p95': r.targetP95,
      Status: r.status,
    })),
  );

  console.log('========================================================================');
  console.log('💻 SYSTEM RESOURCE & INFRASTRUCTURE TELEMETRY:');
  console.log('========================================================================');
  console.log(`- Total Benchmark Duration:    ${totalDuration.toFixed(2)} seconds (475 requests total)`);
  console.log(`- CPU User Time:               ${(endCPU.user / 1000).toFixed(2)} ms`);
  console.log(`- CPU System Time:             ${(endCPU.system / 1000).toFixed(2)} ms`);
  console.log(`- Process RSS Memory:          ${(endMemory.rss / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`- Node.js Heap Used:           ${(endMemory.heapUsed / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`- Upstash Redis Latency:       ${redisLatencyMs >= 0 ? redisLatencyMs + ' ms' : 'Offline / In-Memory'}`);
  console.log(`- Target Compliance:           19 / 19 Endpoints Audited`);
  console.log('========================================================================\n');

  await app.close();
  await prisma.$disconnect();
}

runPhase6Benchmark().catch((err) => {
  console.error('Phase 6 Benchmark Failed:', err);
  process.exit(1);
});
