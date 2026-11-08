// Register TypeScript runtime for Fastify app
require('ts-node').register({
  project: require('path').resolve(__dirname, '../apps/api/tsconfig.json'),
  transpileOnly: true,
});

async function main() {
  console.log('====================================================');
  console.log('  EXAMLY PRODUCTION DEPLOYMENT SMOKE TEST RUNNER   ');
  console.log('====================================================\n');

  // Launch Fastify application for smoke verification
  const { createFastifyApp } = require('../apps/api/src/fastify/server');
  const app = await createFastifyApp();
  await app.ready();

  const tests = [
    { name: 'Public Health Check', url: '/health', expectedStatus: 200 },
    { name: 'API v1 Health Probe', url: '/api/v1/health', expectedStatus: 200 },
    { name: 'Database Readiness Probe (/ready)', url: '/api/v1/ready', expectedStatus: 200 },
    { name: 'Process Liveness Probe (/live)', url: '/api/v1/live', expectedStatus: 200 },
    { name: 'Unauthenticated Protected Route 401 Check', url: '/api/v1/batches', expectedStatus: 401 },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const start = performance.now();
    try {
      const res = await app.inject({
        method: 'GET',
        url: test.url,
      });
      const latency = (performance.now() - start).toFixed(2);

      if (res.statusCode === test.expectedStatus) {
        console.log(`[PASS] ${test.name.padEnd(45)} | Status: ${res.statusCode} | Latency: ${latency}ms`);
        passed++;
      } else {
        console.error(`[FAIL] ${test.name.padEnd(45)} | Expected: ${test.expectedStatus}, Got: ${res.statusCode}`);
        failed++;
      }
    } catch (err) {
      console.error(`[FAIL] ${test.name.padEnd(45)} | Error: ${err.message}`);
      failed++;
    }
  }

  await app.close();

  console.log('\n----------------------------------------------------');
  console.log(`Smoke Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('----------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('Smoke test execution failed:', err);
  process.exit(1);
});
