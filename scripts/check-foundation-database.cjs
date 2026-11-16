// Read-only inspection; never creates, seeds or modifies records.
require('dotenv').config({ path: require('node:path').join(__dirname, '../apps/api/.env'), quiet: true });
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  const report = await db.$transaction(async tx => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    const tables = await tx.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('User','UserSession','StudentProfile','Batch','SupportTicket','PdfAnnotation','Bookmark','AppDataRevision','Lesson','Subject','ResourceNode') ORDER BY table_name`;
    const invalidEnrollments = await tx.$queryRaw`SELECT count(*)::int AS count FROM "StudentProfile" p JOIN "User" u ON u.id=p."userId" JOIN "Batch" b ON b.id=p."batchId" WHERE u."instituteId" IS DISTINCT FROM b."instituteId"`;
    const activeInvalidEnrollments = await tx.$queryRaw`SELECT count(*)::int AS count FROM "StudentProfile" p JOIN "User" u ON u.id=p."userId" JOIN "Batch" b ON b.id=p."batchId" WHERE b.status = 'ACTIVE' AND u."instituteId" IS DISTINCT FROM b."instituteId"`;
    const deletedBatchEnrollments = await tx.$queryRaw`SELECT count(*)::int AS count FROM "StudentProfile" p JOIN "Batch" b ON b.id=p."batchId" WHERE b.status = 'DELETED'`;
    const inactiveBatchEnrollments = await tx.$queryRaw`SELECT count(*)::int AS count FROM "StudentProfile" p JOIN "Batch" b ON b.id=p."batchId" WHERE b.status <> 'ACTIVE'`;
    const invalidFolders = await tx.$queryRaw`SELECT count(*)::int AS count FROM "ResourceNode" child JOIN "ResourceNode" parent ON parent.id=child."parentId" WHERE child."lessonId" <> parent."lessonId" OR parent."isFolder" = false`;
    return {
      invalidResourceFolders: invalidFolders[0].count,
      tables: tables.map(row => row.table_name),
      crossInstituteEnrollments: invalidEnrollments[0].count,
      activeCrossInstituteEnrollments: activeInvalidEnrollments[0].count,
      deletedBatchEnrollments: deletedBatchEnrollments[0].count,
      inactiveBatchEnrollments: inactiveBatchEnrollments[0].count,
    };
  }, { timeout: 15000 });
  console.log(JSON.stringify(report, null, 2));
})().catch(error => { console.error('Database inspection failed:', error.code || error.name); process.exitCode = 1; }).finally(() => db.$disconnect());
