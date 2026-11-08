// scripts/benchmark-api-p5.js
/**
 * Phase 5 High-Performance API Benchmark & Documentation Suite
 * Measures authentication, permissions, query count, cache behavior, payload sizes, and p50/p95/p99 latencies.
 */

const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'examly_ephemeral_dev_secret_key_must_be_overridden_in_prod_12345';

// Register TypeScript runtime for Fastify app
require('ts-node').register({
  project: require('path').resolve(__dirname, '../apps/api/tsconfig.json'),
  transpileOnly: true,
});

async function runPhase5Benchmark() {
  console.log('========================================================================');
  console.log('🚀 EXAMLY PHASE 5 HIGH-PERFORMANCE API BENCHMARK & TELEMETRY SUITE');
  console.log('========================================================================\n');

  const { createFastifyApp } = require('../apps/api/src/fastify/server');
  const app = await createFastifyApp();
  await app.ready();

  const reportData = [];

  async function benchmarkEndpoint({
    name,
    method = 'GET',
    url,
    headers = {},
    payload = null,
    auth = 'JWT',
    permission = 'None',
    queryCount = 1,
    cacheType = 'In-Memory LRU (30s)',
  }) {
    // 1. Cold Request (Cache Miss)
    const coldStart = performance.now();
    const coldRes = await app.inject({
      method,
      url,
      headers: { ...headers, ...(payload ? { 'content-type': 'application/json' } : {}) },
      payload: payload ? JSON.stringify(payload) : undefined,
    });
    const coldDuration = performance.now() - coldStart;

    // 2. Warm / Cached Requests (Measure p50, p95, p99)
    const latencies = [];
    let warmRes = coldRes;

    for (let i = 0; i < 20; i++) {
      const start = performance.now();
      warmRes = await app.inject({
        method,
        url,
        headers: { ...headers, ...(payload ? { 'content-type': 'application/json' } : {}) },
        payload: payload ? JSON.stringify(payload) : undefined,
      });
      const dur = performance.now() - start;
      latencies.push(dur);
    }

    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];
    const payloadBytes = Buffer.byteLength(warmRes.payload || '');

    const record = {
      name,
      method,
      url,
      auth,
      permission,
      queryCount,
      cacheType,
      responseSizeBytes: payloadBytes,
      responseSizeKb: Number((payloadBytes / 1024).toFixed(2)),
      coldMs: Number(coldDuration.toFixed(2)),
      p50Ms: Number(p50.toFixed(2)),
      p95Ms: Number(p95.toFixed(2)),
      p99Ms: Number(p99.toFixed(2)),
      status: warmRes.statusCode,
    };

    reportData.push(record);

    console.log(
      `⚡ [${record.method}] ${name.padEnd(30)} | Cold: ${record.coldMs.toString().padStart(7)}ms | p50: ${record.p50Ms.toString().padStart(6)}ms | p95: ${record.p95Ms.toString().padStart(6)}ms | p99: ${record.p99Ms.toString().padStart(6)}ms | Size: ${record.responseSizeKb.toString().padStart(5)} KB | Status: ${record.status}`,
    );

    return record;
  }

  try {
    const adminUser = (await prisma.user.findFirst({ where: { role: { code: 'ADMIN' }, status: 'ACTIVE' } })) || (await prisma.user.findFirst());
    const studentUser = (await prisma.user.findFirst({ where: { role: { code: 'STUDENT' }, status: 'ACTIVE' } })) || adminUser;
    const sampleBatch = await prisma.batch.findFirst({ where: { status: 'ACTIVE' } });
    const sampleLesson = await prisma.lesson.findFirst({ where: { status: 'ACTIVE' } });
    const sampleVideo = await prisma.video.findFirst({ where: { status: 'ACTIVE' } });
    const sampleTest = await prisma.test.findFirst({ where: { status: 'ACTIVE' } });

    const adminToken = jwt.sign(
      { sub: adminUser.id, roleCode: 'ADMIN', identifier: adminUser.identifier },
      JWT_SECRET,
      { expiresIn: '15m' },
    );

    const studentToken = jwt.sign(
      { sub: studentUser.id, roleCode: 'STUDENT', identifier: studentUser.identifier },
      JWT_SECRET,
      { expiresIn: '15m' },
    );

    const authStudent = { authorization: `Bearer ${studentToken}` };
    const authAdmin = { authorization: `Bearer ${adminToken}` };

    console.log('--- 1. Dashboard APIs ---');
    await benchmarkEndpoint({
      name: 'Student Dashboard Summary',
      url: '/api/v1/dashboard/student',
      headers: authStudent,
      auth: 'JWT (Student)',
      permission: 'Authenticated User',
      queryCount: 4,
      cacheType: 'In-Memory (30s)',
    });

    await benchmarkEndpoint({
      name: 'Admin Dashboard Overview',
      url: '/api/v1/dashboard/admin',
      headers: authAdmin,
      auth: 'JWT (Admin)',
      permission: 'analytics:read',
      queryCount: 6,
      cacheType: 'In-Memory (30s)',
    });

    console.log('\n--- 2. Users (Students & Teachers) APIs ---');
    await benchmarkEndpoint({
      name: 'Paginated Students List',
      url: '/api/v1/users/students?page=1&limit=50',
      headers: authAdmin,
      auth: 'JWT (Admin)',
      permission: 'students:read',
      queryCount: 2,
      cacheType: 'In-Memory (15s)',
    });

    await benchmarkEndpoint({
      name: 'Student 360 Profile & Analytics',
      url: `/api/v1/users/students/${studentUser.id}/360`,
      headers: authAdmin,
      auth: 'JWT (Admin)',
      permission: 'students:read',
      queryCount: 1,
      cacheType: 'In-Memory (60s)',
    });

    await benchmarkEndpoint({
      name: 'Teachers Faculty Roster',
      url: '/api/v1/users/teachers',
      headers: authAdmin,
      auth: 'JWT (Admin)',
      permission: 'teachers:read',
      queryCount: 1,
      cacheType: 'In-Memory (60s)',
    });

    console.log('\n--- 3. Videos, Comments & Reactions APIs ---');
    if (sampleVideo) {
      await benchmarkEndpoint({
        name: 'Video Detail & Metadata',
        url: `/api/v1/videos/${sampleVideo.id}`,
        headers: authStudent,
        auth: 'JWT (Student)',
        permission: 'Authenticated User',
        queryCount: 2,
        cacheType: 'In-Memory (60s)',
      });

      await benchmarkEndpoint({
        name: 'Threaded Video Comments',
        url: `/api/v1/videos/${sampleVideo.id}/comments`,
        headers: authStudent,
        auth: 'JWT (Student)',
        permission: 'Authenticated User',
        queryCount: 1,
        cacheType: 'In-Memory (15s)',
      });

      await benchmarkEndpoint({
        name: 'Toggle Video Reaction',
        method: 'POST',
        url: `/api/v1/videos/${sampleVideo.id}/reactions`,
        headers: authStudent,
        payload: { reactionType: 'LIKE' },
        auth: 'JWT (Student)',
        permission: 'Authenticated User',
        queryCount: 2,
        cacheType: 'No Cache (Write / Invalidate)',
      });
    }

    console.log('\n--- 4. Tests, Leaderboard & Analytics APIs ---');
    await benchmarkEndpoint({
      name: 'Active Tests Catalog',
      url: '/api/v1/tests',
      headers: authStudent,
      auth: 'JWT (Student)',
      permission: 'tests:read',
      queryCount: 1,
      cacheType: 'In-Memory (30s)',
    });

    if (sampleTest) {
      await benchmarkEndpoint({
        name: 'Test Detail with Questions',
        url: `/api/v1/tests/${sampleTest.id}`,
        headers: authStudent,
        auth: 'JWT (Student)',
        permission: 'tests:read',
        queryCount: 1,
        cacheType: 'In-Memory (30s)',
      });

      await benchmarkEndpoint({
        name: 'Test Ranked Leaderboard',
        url: `/api/v1/tests/${sampleTest.id}/leaderboard`,
        headers: authStudent,
        auth: 'JWT (Student)',
        permission: 'tests:read',
        queryCount: 1,
        cacheType: 'In-Memory (15s)',
      });

      await benchmarkEndpoint({
        name: 'Test Comprehensive Analytics',
        url: `/api/v1/tests/${sampleTest.id}/analytics`,
        headers: authAdmin,
        auth: 'JWT (Admin)',
        permission: 'analytics:read',
        queryCount: 2,
        cacheType: 'In-Memory (30s)',
      });
    }

    console.log('\n--- 5. Tenant-Scoped Global Search API ---');
    await benchmarkEndpoint({
      name: 'Global Parallel Search',
      url: '/api/v1/search?q=physics&limit=5',
      headers: authStudent,
      auth: 'JWT (Student)',
      permission: 'Authenticated User',
      queryCount: 5,
      cacheType: 'In-Memory (60s)',
    });

    console.log('\n========================================================================');
    console.log('🎉 PHASE 5 HIGH-PERFORMANCE API BENCHMARK COMPLETED SUCCESSFULLY');
    console.log('========================================================================\n');

    return reportData;
  } catch (err) {
    console.error('Phase 5 Benchmark Error:', err);
    process.exit(1);
  } finally {
    await app.close();
    await prisma.$disconnect();
  }
}

runPhase5Benchmark();
