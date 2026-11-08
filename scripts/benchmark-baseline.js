// scripts/benchmark-baseline.js
// Repeatable Performance Baseline & Telemetry Benchmark Suite for Examly
const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

function calculatePercentiles(latencies) {
  if (!latencies || latencies.length === 0) return { p50: 0, p95: 0, p99: 0, avg: 0, min: 0, max: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1];
  const p99 = sorted[Math.floor(sorted.length * 0.99)] || sorted[sorted.length - 1];
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  return {
    min: Number(sorted[0].toFixed(2)),
    p50: Number(p50.toFixed(2)),
    p95: Number(p95.toFixed(2)),
    p99: Number(p99.toFixed(2)),
    max: Number(sorted[sorted.length - 1].toFixed(2)),
    avg: Number((sum / sorted.length).toFixed(2)),
  };
}

async function benchmarkQuery(name, queryFn, iterations = 5) {
  process.stdout.write(`- Benchmarking: ${name}... `);
  const latencies = [];
  let samplePayloadSize = 0;
  let errorCount = 0;

  // Warmup
  try {
    const warmupResult = await queryFn();
    samplePayloadSize = Buffer.byteLength(JSON.stringify(warmupResult || ''));
  } catch (e) {
    // ignore
  }

  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    try {
      await queryFn();
      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1e6;
      latencies.push(durationMs);
    } catch (e) {
      errorCount++;
    }
  }

  const stats = calculatePercentiles(latencies);
  console.log(`done (p50: ${stats.p50}ms, p95: ${stats.p95}ms, payload: ${(samplePayloadSize/1024).toFixed(1)} KB)`);
  return {
    name,
    iterations,
    samplePayloadSizeBytes: samplePayloadSize,
    samplePayloadSizeKb: Number((samplePayloadSize / 1024).toFixed(2)),
    errorRatePercent: Number(((errorCount / iterations) * 100).toFixed(2)),
    ...stats,
  };
}

async function measureRedis() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl || !redisUrl.startsWith('redis')) {
    return { status: 'Disabled / In-Memory Mock', p50: 0.05, p95: 0.1, p99: 0.15, avg: 0.06 };
  }

  try {
    const redis = new Redis(redisUrl, {
      tls: redisUrl.startsWith('rediss://') ? {} : undefined,
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
    });

    const latencies = [];
    for (let i = 0; i < 10; i++) {
      const start = process.hrtime.bigint();
      await redis.set('examly:benchmark:ping', 'pong', 'EX', 10);
      await redis.get('examly:benchmark:ping');
      const end = process.hrtime.bigint();
      latencies.push(Number(end - start) / 1e6);
    }
    await redis.quit();
    return { status: 'Connected (Upstash)', ...calculatePercentiles(latencies) };
  } catch (err) {
    return { status: `Error: ${err.message}`, p50: 0, p95: 0, p99: 0, avg: 0 };
  }
}

async function measureClientBundleSizes() {
  const pages = [
    { name: 'Live Test Runner (tests/[id]/runner)', path: 'apps/web/src/app/(dashboard)/tests/[id]/runner/page.tsx' },
    { name: 'Lesson Detail & Content (lessons/[id])', path: 'apps/web/src/app/(dashboard)/lessons/[id]/page.tsx' },
    { name: 'Test Control Room (tests/[id])', path: 'apps/web/src/app/(dashboard)/tests/[id]/page.tsx' },
    { name: 'Test Authoring Wizard (tests/create)', path: 'apps/web/src/app/(dashboard)/tests/create/page.tsx' },
    { name: 'Student Roster (students)', path: 'apps/web/src/app/(dashboard)/students/page.tsx' },
    { name: 'Subject Detail (subjects/[id])', path: 'apps/web/src/app/(dashboard)/subjects/[id]/page.tsx' },
    { name: 'Video Player & Forum (lessons/[id]/videos/[videoId])', path: 'apps/web/src/app/(dashboard)/lessons/[id]/videos/[videoId]/page.tsx' },
  ];

  const results = [];
  for (const page of pages) {
    const fullPath = path.resolve(__dirname, '..', page.path);
    if (fs.existsSync(fullPath)) {
      const bytes = fs.statSync(fullPath).size;
      results.push({
        Page: page.name,
        'Source Size (KB)': Number((bytes / 1024).toFixed(2)),
      });
    }
  }

  return results;
}

async function runBenchmark() {
  console.log('====================================================');
  console.log('🚀 EXAMLY REPEATABLE PERFORMANCE BASELINE BENCHMARK');
  console.log('====================================================\n');

  const sampleInstitute = await prisma.institute.findFirst();
  const sampleBatch = await prisma.batch.findFirst();
  const sampleTest = await prisma.test.findFirst();
  const sampleLesson = await prisma.lesson.findFirst();
  const sampleStudent = await prisma.user.findFirst({ where: { role: { code: 'STUDENT' } } });

  console.log('📍 Target IDs:');
  console.log(`- Institute ID: ${sampleInstitute?.id || 'none'}`);
  console.log(`- Batch ID:     ${sampleBatch?.id || 'none'}`);
  console.log(`- Test ID:      ${sampleTest?.id || 'none'}`);
  console.log(`- Lesson ID:    ${sampleLesson?.id || 'none'}`);
  console.log(`- Student ID:   ${sampleStudent?.id || 'none'}\n`);

  console.log('📊 Benchmarking Database Query Latencies...');
  const queryBenchmarks = [
    await benchmarkQuery('1. Unbounded Student List (getStudents)', () =>
      prisma.user.findMany({
        where: { role: { code: 'STUDENT' }, status: { not: 'DELETED' } },
        include: {
          studentProfile: { include: { batch: { select: { id: true, name: true, code: true, status: true } } } },
          _count: { select: { testAttempts: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
    ),

    await benchmarkQuery('2. Batch Detail Over-fetch (BatchesService.findOne)', () =>
      prisma.batch.findFirst({
        where: { id: sampleBatch?.id || undefined, status: { not: 'DELETED' } },
        include: {
          subjects: {
            where: { status: { not: 'DELETED' } },
            include: {
              lessons: {
                where: { status: { not: 'DELETED' } },
                include: { _count: { select: { videos: true, notes: true, resources: true, tests: true } } },
                orderBy: { sortOrder: 'asc' },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
          students: { include: { user: true } },
          tests: { where: { status: { not: 'DELETED' } } },
          _count: { select: { students: true, tests: true } },
        },
      })
    ),

    await benchmarkQuery('3. Lesson Hierarchy Detail (LessonsService.findOne)', () =>
      prisma.lesson.findFirst({
        where: { id: sampleLesson?.id || undefined, status: { not: 'DELETED' } },
        include: {
          subject: {
            include: {
              batch: true,
              lessons: {
                where: { status: { not: 'DELETED' } },
                select: { id: true, name: true, sortOrder: true, _count: { select: { videos: true, notes: true, resources: true, tests: true } } },
                orderBy: { sortOrder: 'asc' },
              },
            },
          },
          videos: {
            where: { status: { not: 'DELETED' } },
            include: { _count: { select: { comments: true, reactions: true } } },
            orderBy: { sortOrder: 'asc' },
          },
          notes: { where: { status: { not: 'DELETED' } }, orderBy: { sortOrder: 'asc' } },
          resources: { orderBy: { sortOrder: 'asc' } },
          tests: {
            where: { status: { not: 'DELETED' } },
            include: { config: true, _count: { select: { sections: true, attempts: true } } },
            orderBy: { createdAt: 'desc' },
          },
        },
      })
    ),

    await benchmarkQuery('4. Test Catalog List (TestsService.findAll)', () =>
      prisma.test.findMany({
        where: { status: { not: 'DELETED' } },
        include: {
          config: true,
          batch: { select: { name: true, code: true } },
          subject: { select: { name: true } },
          lesson: { select: { id: true, name: true } },
          sections: { include: { _count: { select: { questions: true } } } },
          _count: { select: { attempts: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
    ),

    await benchmarkQuery('5. Test Detail + Questions (TestsService.findOne)', () =>
      prisma.test.findFirst({
        where: { id: sampleTest?.id || undefined, status: { not: 'DELETED' } },
        include: {
          config: true,
          batch: true,
          subject: true,
          sections: {
            include: {
              questions: {
                include: {
                  options: { orderBy: { sortOrder: 'asc' } },
                  solution: true,
                },
                orderBy: { sortOrder: 'asc' },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      })
    ),

    await benchmarkQuery('6. Test Leaderboard (TestsService.getAttemptsLeaderboard)', () =>
      prisma.testAttempt.findMany({
        where: { testId: sampleTest?.id || undefined, submittedAt: { not: null } },
        include: {
          student: { select: { id: true, fullName: true, identifier: true, avatarUrl: true } },
          result: true,
        },
        orderBy: { result: { totalScore: 'desc' } },
      })
    ),

    await benchmarkQuery('7. Community Posts Feed (CommunityService.findAll)', () =>
      prisma.communityPost.findMany({
        where: { instituteId: sampleInstitute?.id || undefined },
        include: {
          author: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
          batch: { select: { id: true, name: true } },
          poll: { include: { options: { include: { _count: { select: { votes: true } } } } } },
          _count: { select: { comments: true, reactions: true } },
        },
        orderBy: { publishedAt: 'desc' },
      })
    ),

    await benchmarkQuery('8. Auth Profile & RBAC (AuthService.getProfile)', () =>
      prisma.user.findUnique({
        where: { id: sampleStudent?.id || undefined },
        include: {
          role: { include: { permissions: true } },
          studentProfile: { include: { batch: true } },
          teacherProfile: true,
          institute: true,
          permissionGrants: true,
        },
      })
    ),
  ];

  console.log('\n📈 Database Query Latency Summary:');
  console.table(
    queryBenchmarks.map((q) => ({
      Operation: q.name,
      'p50 (ms)': q.p50,
      'p95 (ms)': q.p95,
      'p99 (ms)': q.p99,
      'Avg (ms)': q.avg,
      'Payload (KB)': q.samplePayloadSizeKb,
      'Err %': q.errorRatePercent,
    }))
  );

  console.log('\n⚡ Redis Cache Telemetry:');
  const redisStats = await measureRedis();
  console.log(`- Redis Status: ${redisStats.status}`);
  console.log(`- p50 Latency:  ${redisStats.p50} ms`);
  console.log(`- p95 Latency:  ${redisStats.p95} ms\n`);

  console.log('📦 Client Page Size Profiles:');
  const bundleSizes = await measureClientBundleSizes();
  console.table(bundleSizes);

  const summary = {
    timestamp: new Date().toISOString(),
    databaseOperations: queryBenchmarks,
    redisMetrics: redisStats,
    bundleMetrics: bundleSizes,
  };

  const outputPath = path.resolve(__dirname, '../docs/benchmark-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2));
  console.log(`\n💾 Baseline benchmark results recorded to: ${outputPath}`);

  await prisma.$disconnect();
}

runBenchmark().catch((err) => {
  console.error('Benchmark error:', err);
  prisma.$disconnect();
  process.exit(1);
});
