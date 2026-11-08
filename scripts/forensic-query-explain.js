// scripts/forensic-query-explain.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runQueryForensics() {
  console.log('========================================================================');
  console.log('🔍 FORENSIC DATABASE QUERY & EXPLAIN ANALYZE AUDIT');
  console.log('========================================================================\n');

  try {
    // 1. Audit ILIKE Search on User (fullName, email, identifier)
    console.log('--- 1. EXPLAIN ANALYZE: User ILIKE FullName Search ---');
    const userExplain = await prisma.$queryRawUnsafe(`
      EXPLAIN ANALYZE
      SELECT "id", "fullName", "email", "identifier", "status"
      FROM "User"
      WHERE "fullName" ILIKE '%admin%' OR "email" ILIKE '%admin%'
      LIMIT 20;
    `);
    console.log(userExplain.map((row) => Object.values(row)[0]).join('\n'));

    // 2. Audit Video Search on Lesson & Title
    console.log('\n--- 2. EXPLAIN ANALYZE: Video Search & Lesson Join ---');
    const videoExplain = await prisma.$queryRawUnsafe(`
      EXPLAIN ANALYZE
      SELECT "id", "title", "durationSeconds", "lessonId"
      FROM "Video"
      WHERE "title" ILIKE '%math%' AND "status" = 'ACTIVE'
      LIMIT 20;
    `);
    console.log(videoExplain.map((row) => Object.values(row)[0]).join('\n'));

    // 3. Audit Test Attempt Leaderboard Sorting
    console.log('\n--- 3. EXPLAIN ANALYZE: Test Attempt Leaderboard Index Scan ---');
    const leaderboardExplain = await prisma.$queryRawUnsafe(`
      EXPLAIN ANALYZE
      SELECT a."id", a."studentId", a."durationSeconds", r."totalScore", r."percentage"
      FROM "TestAttempt" a
      LEFT JOIN "TestResult" r ON r."attemptId" = a."id"
      WHERE a."submittedAt" IS NOT NULL
      ORDER BY r."totalScore" DESC, a."durationSeconds" ASC
      LIMIT 50;
    `);
    console.log(leaderboardExplain.map((row) => Object.values(row)[0]).join('\n'));

    // 4. Check available indexes on tables
    console.log('\n--- 4. Existing PostgreSQL Table Indexes ---');
    const indexes = await prisma.$queryRawUnsafe(`
      SELECT
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `);
    console.log(`Found ${indexes.length} total database indexes in public schema.`);
    console.log(
      indexes
        .slice(0, 15)
        .map((i) => `[${i.tablename}] ${i.indexname} -> ${i.indexdef}`)
        .join('\n'),
    );

    // 5. Check if pg_trgm extension exists
    console.log('\n--- 5. PostgreSQL Extensions Status ---');
    const extensions = await prisma.$queryRawUnsafe(`
      SELECT extname, extversion FROM pg_extension;
    `);
    console.log(extensions.map((e) => `Extension: ${e.extname} (v${e.extversion})`).join('\n'));
  } catch (err) {
    console.error('Query forensic failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runQueryForensics().then(() => process.exit(0));
