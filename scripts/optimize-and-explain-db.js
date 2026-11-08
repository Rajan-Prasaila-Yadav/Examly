// scripts/optimize-and-explain-db.js
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { performance } = require('perf_hooks');

const prisma = new PrismaClient();

function calculatePercentiles(latencies) {
  if (latencies.length === 0) return { p50: 0, p95: 0, p99: 0, avg: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  return {
    p50: Number(p50.toFixed(2)),
    p95: Number(p95.toFixed(2)),
    p99: Number(p99.toFixed(2)),
    avg: Number(avg.toFixed(2)),
  };
}

async function runBenchmarkIteration(name, queryFn, iterations = 20) {
  const latencies = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await queryFn();
    latencies.push(performance.now() - start);
  }
  return calculatePercentiles(latencies);
}

async function optimizeAndAuditDatabase() {
  console.log('========================================================================');
  console.log('🔍 EXAMLY DATABASE EXPLAIN ANALYZE & PG_TRGM OPTIMIZATION HARNESS');
  console.log('========================================================================\n');

  // 1. Initial EXPLAIN ANALYZE on High-Frequency Queries
  console.log('--- PART 1: Baseline EXPLAIN ANALYZE Audits ---');

  // A. Students Query
  console.log('\n[1. Students Query EXPLAIN ANALYZE]');
  const studentsExplain = await prisma.$queryRawUnsafe(`
    EXPLAIN ANALYZE
    SELECT u."id", u."fullName", u."email", u."status", s."rollNumber", s."batchId"
    FROM "User" u
    LEFT JOIN "StudentProfile" s ON s."userId" = u."id"
    WHERE u."status" = 'ACTIVE'
    ORDER BY u."createdAt" DESC
    LIMIT 25;
  `);
  console.log(studentsExplain.map((r) => Object.values(r)[0]).join('\n'));

  // B. Videos Query with Wildcard Search
  console.log('\n[2. Video Wildcard Search EXPLAIN ANALYZE]');
  const videoSearchExplain = await prisma.$queryRawUnsafe(`
    EXPLAIN ANALYZE
    SELECT "id", "title", "durationSeconds", "lessonId"
    FROM "Video"
    WHERE "title" ILIKE '%physics%' AND "status" = 'ACTIVE'
    LIMIT 20;
  `);
  console.log(videoSearchExplain.map((r) => Object.values(r)[0]).join('\n'));

  // C. Leaderboards Query
  console.log('\n[3. Leaderboards Query EXPLAIN ANALYZE]');
  const leaderboardExplain = await prisma.$queryRawUnsafe(`
    EXPLAIN ANALYZE
    SELECT a."id", a."studentId", a."durationSeconds", r."totalScore", r."percentage"
    FROM "TestAttempt" a
    INNER JOIN "TestResult" r ON r."attemptId" = a."id"
    WHERE a."submittedAt" IS NOT NULL
    ORDER BY r."totalScore" DESC, a."durationSeconds" ASC
    LIMIT 50;
  `);
  console.log(leaderboardExplain.map((r) => Object.values(r)[0]).join('\n'));

  // D. Comments Query
  console.log('\n[4. Post Comments Query EXPLAIN ANALYZE]');
  const commentsExplain = await prisma.$queryRawUnsafe(`
    EXPLAIN ANALYZE
    SELECT c."id", c."content", c."createdAt", u."fullName", u."avatarUrl"
    FROM "PostComment" c
    INNER JOIN "User" u ON u."id" = c."userId"
    ORDER BY c."createdAt" DESC
    LIMIT 30;
  `);
  console.log(commentsExplain.map((r) => Object.values(r)[0]).join('\n'));

  // 2. Measure BEFORE Latencies
  console.log('\n--- PART 2: Measuring BEFORE Latencies (20 iterations each) ---');
  const beforeMetrics = {
    students: await runBenchmarkIteration('students', () =>
      prisma.user.findMany({
        where: { status: 'ACTIVE' },
        include: { studentProfile: true },
        take: 25,
        orderBy: { createdAt: 'desc' },
      }),
    ),
    videos: await runBenchmarkIteration('videos', () =>
      prisma.video.findMany({
        where: { title: { contains: 'math', mode: 'insensitive' }, status: 'ACTIVE' },
        take: 20,
      }),
    ),
    leaderboard: await runBenchmarkIteration('leaderboard', () =>
      prisma.testAttempt.findMany({
        where: { submittedAt: { not: null } },
        include: { result: true, student: { select: { fullName: true } } },
        take: 50,
      }),
    ),
    comments: await runBenchmarkIteration('comments', () =>
      prisma.postComment.findMany({
        include: { user: { select: { fullName: true } } },
        take: 30,
        orderBy: { createdAt: 'desc' },
      }),
    ),
  };

  // 3. Apply Index & pg_trgm Optimizations
  console.log('\n--- PART 3: Applying pg_trgm & High-Performance GIN / B-Tree Indexes ---');
  try {
    console.log('Enabling pg_trgm extension...');
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);

    console.log('Creating GIN Trigram indexes on searchable text columns...');
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS idx_user_fullname_trgm ON "User" USING gin ("fullName" gin_trgm_ops);`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS idx_user_email_trgm ON "User" USING gin ("email" gin_trgm_ops);`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS idx_video_title_trgm ON "Video" USING gin ("title" gin_trgm_ops);`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS idx_test_title_trgm ON "Test" USING gin ("title" gin_trgm_ops);`,
    );

    console.log('Creating optimized compound B-tree indexes for high-frequency queries...');
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS idx_test_attempt_submitted_score ON "TestAttempt" ("submittedAt", "testId", "studentId");`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS idx_post_comment_post_created ON "PostComment" ("postId", "createdAt" DESC);`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS idx_post_reaction_post_type ON "PostReaction" ("postId", "reactionType");`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS idx_user_status_created ON "User" ("status", "createdAt" DESC);`,
    );
    console.log('✅ Index creation completed successfully!');
  } catch (err) {
    console.warn(`[WARN] Index creation note: ${err.message}`);
  }

  // 4. Post-Optimization EXPLAIN ANALYZE
  console.log('\n--- PART 4: Post-Optimization EXPLAIN ANALYZE Verification ---');
  console.log('\n[Post-Opt Video GIN Trigram Search EXPLAIN ANALYZE]');
  const postVideoExplain = await prisma.$queryRawUnsafe(`
    EXPLAIN ANALYZE
    SELECT "id", "title", "durationSeconds", "lessonId"
    FROM "Video"
    WHERE "title" ILIKE '%physics%' AND "status" = 'ACTIVE'
    LIMIT 20;
  `);
  console.log(postVideoExplain.map((r) => Object.values(r)[0]).join('\n'));

  // 5. Measure AFTER Latencies
  console.log('\n--- PART 5: Measuring AFTER Latencies (20 iterations each) ---');
  const afterMetrics = {
    students: await runBenchmarkIteration('students', () =>
      prisma.user.findMany({
        where: { status: 'ACTIVE' },
        include: { studentProfile: true },
        take: 25,
        orderBy: { createdAt: 'desc' },
      }),
    ),
    videos: await runBenchmarkIteration('videos', () =>
      prisma.video.findMany({
        where: { title: { contains: 'math', mode: 'insensitive' }, status: 'ACTIVE' },
        take: 20,
      }),
    ),
    leaderboard: await runBenchmarkIteration('leaderboard', () =>
      prisma.testAttempt.findMany({
        where: { submittedAt: { not: null } },
        include: { result: true, student: { select: { fullName: true } } },
        take: 50,
      }),
    ),
    comments: await runBenchmarkIteration('comments', () =>
      prisma.postComment.findMany({
        include: { user: { select: { fullName: true } } },
        take: 30,
        orderBy: { createdAt: 'desc' },
      }),
    ),
  };

  // 6. Summary Comparison Table
  console.log('\n========================================================================');
  console.log('📊 DATABASE QUERY OPTIMIZATION & LATENCY COMPARISON MATRIX:');
  console.log('========================================================================');
  console.table([
    {
      Query: 'Students Listing',
      'Before p50 (ms)': beforeMetrics.students.p50,
      'After p50 (ms)': afterMetrics.students.p50,
      'Before p95 (ms)': beforeMetrics.students.p95,
      'After p95 (ms)': afterMetrics.students.p95,
      'Before p99 (ms)': beforeMetrics.students.p99,
      'After p99 (ms)': afterMetrics.students.p99,
    },
    {
      Query: 'Video Trigram Search',
      'Before p50 (ms)': beforeMetrics.videos.p50,
      'After p50 (ms)': afterMetrics.videos.p50,
      'Before p95 (ms)': beforeMetrics.videos.p95,
      'After p95 (ms)': afterMetrics.videos.p95,
      'Before p99 (ms)': beforeMetrics.videos.p99,
      'After p99 (ms)': afterMetrics.videos.p99,
    },
    {
      Query: 'Leaderboards Ranking',
      'Before p50 (ms)': beforeMetrics.leaderboard.p50,
      'After p50 (ms)': afterMetrics.leaderboard.p50,
      'Before p95 (ms)': beforeMetrics.leaderboard.p95,
      'After p95 (ms)': afterMetrics.leaderboard.p95,
      'Before p99 (ms)': beforeMetrics.leaderboard.p99,
      'After p99 (ms)': afterMetrics.leaderboard.p99,
    },
    {
      Query: 'Post Comments Retrieval',
      'Before p50 (ms)': beforeMetrics.comments.p50,
      'After p50 (ms)': afterMetrics.comments.p50,
      'Before p95 (ms)': beforeMetrics.comments.p95,
      'After p95 (ms)': afterMetrics.comments.p95,
      'Before p99 (ms)': beforeMetrics.comments.p99,
      'After p99 (ms)': afterMetrics.comments.p99,
    },
  ]);

  await prisma.$disconnect();
}

optimizeAndAuditDatabase().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
