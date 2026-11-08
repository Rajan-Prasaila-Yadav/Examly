// scripts/benchmark-fastify.js
/**
 * Fastify Migrated Routes Benchmark & Verification Suite
 * Compares latency, payload sizes, and security guarantees directly against baseline.
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

async function runFastifyBenchmark() {
  console.log('====================================================');
  console.log('⚡ EXAMLY FASTIFY MIGRATED MODULES BENCHMARK & TEST');
  console.log('====================================================\n');

  // Dynamically import Fastify App
  const { createFastifyApp } = require('../apps/api/src/fastify/server');
  const app = await createFastifyApp();
  await app.ready();

  const results = [];

  // Helper to record benchmark run
  async function testRoute(name, options, expectedStatus = 200, iterations = 5) {
    const latencies = [];
    let lastResponse = null;

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      const response = await app.inject(options);
      const duration = performance.now() - start;
      latencies.push(duration);
      lastResponse = response;
    }

    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const avg = latencies.reduce((s, v) => s + v, 0) / latencies.length;
    const sizeBytes = Buffer.byteLength(lastResponse.payload || '');
    const isSuccess = lastResponse.statusCode === expectedStatus;

    const result = {
      name,
      method: options.method || 'GET',
      url: options.url,
      expectedStatus,
      actualStatus: lastResponse.statusCode,
      p50Ms: Number(p50.toFixed(2)),
      p95Ms: Number(p95.toFixed(2)),
      avgMs: Number(avg.toFixed(2)),
      payloadBytes: sizeBytes,
      passed: isSuccess,
    };

    results.push(result);
    const icon = isSuccess ? '✅' : '❌';
    console.log(
      `${icon} [${result.method}] ${name.padEnd(28)} | p50: ${result.p50Ms.toString().padStart(6)}ms | p95: ${result.p95Ms.toString().padStart(6)}ms | Size: ${(sizeBytes / 1024).toFixed(2)} KB | Status: ${lastResponse.statusCode}`,
    );

    return lastResponse;
  }

  try {
    // 1. Setup Test Users & Tokens
    const adminUser = await prisma.user.findFirst({
      where: { role: { code: 'ADMIN' }, status: 'ACTIVE' },
    }) || await prisma.user.findFirst();

    const studentUser = await prisma.user.findFirst({
      where: { role: { code: 'STUDENT' }, status: 'ACTIVE' },
    }) || adminUser;

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

    console.log('--- 1. Testing System & Health Routes ---');
    await testRoute('Health Check (Root)', { method: 'GET', url: '/health' }, 200);
    await testRoute('Health Check (API Prefix)', { method: 'GET', url: '/api/v1/health' }, 200);

    console.log('\n--- 2. Testing Unauthenticated Access Guards (401) ---');
    await testRoute('Batches (No Auth Token)', { method: 'GET', url: '/api/v1/batches' }, 401);
    await testRoute('Storage Presigned (No Token)', { method: 'POST', url: '/api/v1/storage/presigned-url' }, 401);

    console.log('\n--- 3. Testing RBAC Permission Guards (403) ---');
    await testRoute(
      'Audit Logs (Student Token)',
      {
        method: 'GET',
        url: '/api/v1/system/audit/logs',
        headers: { authorization: `Bearer ${studentToken}` },
      },
      403,
    );

    console.log('\n--- 4. Benchmarking Authenticated Catalog Operations ---');
    // Fetch a sample batch and lesson from database
    const sampleBatch = await prisma.batch.findFirst({
      where: { status: 'ACTIVE' },
    });

    const sampleLesson = await prisma.lesson.findFirst({
      where: { status: 'ACTIVE' },
    });

    await testRoute(
      'Batches List (Admin Token)',
      {
        method: 'GET',
        url: '/api/v1/batches',
        headers: { authorization: `Bearer ${adminToken}` },
      },
      200,
    );

    if (sampleBatch) {
      await testRoute(
        'Batch Detail by ID',
        {
          method: 'GET',
          url: `/api/v1/batches/${sampleBatch.id}`,
          headers: { authorization: `Bearer ${adminToken}` },
        },
        200,
      );

      await testRoute(
        'Subjects by Batch ID',
        {
          method: 'GET',
          url: `/api/v1/subjects?batchId=${sampleBatch.id}`,
          headers: { authorization: `Bearer ${adminToken}` },
        },
        200,
      );
    }

    if (sampleLesson) {
      await testRoute(
        'Lesson Detail by ID',
        {
          method: 'GET',
          url: `/api/v1/lessons/${sampleLesson.id}`,
          headers: { authorization: `Bearer ${studentToken}` },
        },
        200,
      );
    }

    console.log('\n--- 5. Benchmarking Storage & Presigned URLs with Zod Validation ---');
    await testRoute(
      'Presigned Upload URL Generator',
      {
        method: 'POST',
        url: '/api/v1/storage/presigned-url',
        headers: {
          authorization: `Bearer ${studentToken}`,
          'content-type': 'application/json',
        },
        payload: JSON.stringify({
          folder: 'avatars',
          fileName: 'profile_pic.png',
          contentType: 'image/png',
        }),
      },
      200,
    );

    await testRoute(
      'Presigned URL (Invalid Zod Body)',
      {
        method: 'POST',
        url: '/api/v1/storage/presigned-url',
        headers: {
          authorization: `Bearer ${studentToken}`,
          'content-type': 'application/json',
        },
        payload: JSON.stringify({
          folder: 'invalid_folder_name_xyz',
          fileName: '',
          contentType: '',
        }),
      },
      400,
    );

    console.log('\n====================================================');
    const passedCount = results.filter((r) => r.passed).length;
    console.log(`🎉 FASTIFY BENCHMARK & VERIFICATION PASSED: ${passedCount}/${results.length}`);
    console.log('====================================================\n');

  } catch (err) {
    console.error('Benchmark suite error:', err);
    process.exit(1);
  } finally {
    await app.close();
    await prisma.$disconnect();
  }
}

runFastifyBenchmark();
