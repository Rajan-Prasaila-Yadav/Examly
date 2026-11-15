// Read-only inspection; never creates, seeds or modifies records.
require('dotenv').config({ path: require('node:path').join(__dirname, '../apps/api/.env'), quiet: true });
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  const report = await db.$transaction(async tx => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    const tables = await tx.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('User','UserSession','StudentProfile','Batch','SupportTicket','PdfAnnotation','Bookmark','AppDataRevision') ORDER BY table_name`;
    const invalidEnrollments = await tx.$queryRaw`SELECT count(*)::int AS count FROM "StudentProfile" p JOIN "User" u ON u.id=p."userId" JOIN "Batch" b ON b.id=p."batchId" WHERE u."instituteId" IS DISTINCT FROM b."instituteId"`;
    return { tables: tables.map(row => row.table_name), crossInstituteEnrollments: invalidEnrollments[0].count };
  }, { timeout: 15000 });
  console.log(JSON.stringify(report, null, 2));
})().catch(error => { console.error('Database inspection failed:', error.code || error.name); process.exitCode = 1; }).finally(() => db.$disconnect());
