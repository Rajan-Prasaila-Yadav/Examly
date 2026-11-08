// scripts/concurrent-load-test.js
require('dotenv').config();
const { PrismaClient, RecordStatus, RoleType } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const { performance } = require('perf_hooks');

require('ts-node').register({
  project: require('path').resolve(__dirname, '../apps/api/tsconfig.json'),
  transpileOnly: true,
});

async function runConcurrencyLoadTest() {
  console.log('========================================================================');
  console.log('⚡ EXAMLY HIGH-CONCURRENCY LOAD & STRESS BENCHMARK SUITE');
  console.log('========================================================================\n');

  const { createFastifyApp } = require('../apps/api/src/fastify/server');
  const app = await createFastifyApp();
  await app.ready();

  const prisma = new PrismaClient();
  const secret = process.env.JWT_ACCESS_SECRET || 'examly_jwt_access_super_secret_key_2026_production_abcdef';

  const studentUser = await prisma.user.findFirst({
    where: { role: { code: RoleType.STUDENT }, status: RecordStatus.ACTIVE },
  });

  const studentToken = jwt.sign(
    { sub: studentUser.id, userId: studentUser.id, instituteId: studentUser.instituteId, roleCode: RoleType.STUDENT },
    secret,
    { expiresIn: '1h' },
  );

  const testEndpoints = [
    { name: 'Health Probe', method: 'GET', url: '/api/v1/health', auth: false },
    { name: 'Dashboard Stats', method: 'GET', url: '/api/v1/dashboard/stats', auth: true },
    { name: 'Student Directory', method: 'GET', url: '/api/v1/users/students?page=1&limit=20', auth: true },
    { name: 'Lesson Hierarchy', method: 'GET', url: '/api/v1/lessons', auth: true },
    { name: 'Multi-Entity Search', method: 'GET', url: '/api/v1/search?q=math', auth: true },
    { name: 'Tests Catalog', method: 'GET', url: '/api/v1/tests', auth: true },
  ];

  const concurrencyLevels = [10, 50, 100, 500, 1000];
  const summaryReport = [];

  for (const concurrency of concurrencyLevels) {
    console.log(`--- Benchmarking ${concurrency} Concurrent Virtual Users ---`);
    const latencies = [];
    let errors = 0;

    const startTotal = performance.now();

    // Create concurrent batches
    const requests = Array.from({ length: concurrency }).map(async (_, idx) => {
      const ep = testEndpoints[idx % testEndpoints.length];
      const headers = ep.auth ? { authorization: `Bearer ${studentToken}` } : {};

      const reqStart = performance.now();
      try {
        const res = await app.inject({
          method: ep.method,
          url: ep.url,
          headers,
        });
        const dur = performance.now() - reqStart;
        latencies.push(dur);
        if (res.statusCode >= 400 && res.statusCode !== 404) {
          errors++;
        }
      } catch (err) {
        errors++;
      }
    });

    await Promise.all(requests);
    const totalDuration = performance.now() - startTotal;

    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)].toFixed(2);
    const p95 = latencies[Math.floor(latencies.length * 0.95)].toFixed(2);
    const p99 = latencies[Math.floor(latencies.length * 0.99)].toFixed(2);
    const rps = ((concurrency / totalDuration) * 1000).toFixed(0);

    console.log(`Throughput: ${rps} req/sec | p50: ${p50}ms | p95: ${p95}ms | p99: ${p99}ms | Errors: ${errors}/${concurrency}\n`);

    summaryReport.push({
      concurrency,
      rps,
      p50,
      p95,
      p99,
      errors,
      errorRate: ((errors / concurrency) * 100).toFixed(2) + '%',
    });
  }

  console.log('========================================================================');
  console.log('📊 MASTER LOAD TEST SUMMARY TABLE:');
  console.log('========================================================================');
  console.table(summaryReport);

  await app.close();
  await prisma.$disconnect();
}

runConcurrencyLoadTest().catch((err) => {
  console.error('Load test failed:', err);
  process.exit(1);
});
