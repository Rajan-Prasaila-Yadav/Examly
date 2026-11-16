// Read-only inspection; never creates, seeds or modifies records.
require('dotenv').config({ path: require('node:path').join(__dirname, '../apps/api/.env'), quiet: true });
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  const report = await db.$transaction(async tx => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    const tables = await tx.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('User','UserSession','StudentProfile','Batch','BatchFaculty','BatchClass','ClassAttendance','SupportTicket','PdfAnnotation','Bookmark','AppDataRevision','Lesson','Subject','ResourceNode') ORDER BY table_name`;
    const invalidEnrollments = await tx.$queryRaw`SELECT count(*)::int AS count FROM "StudentProfile" p JOIN "User" u ON u.id=p."userId" JOIN "Batch" b ON b.id=p."batchId" WHERE u."instituteId" IS DISTINCT FROM b."instituteId"`;
    const activeInvalidEnrollments = await tx.$queryRaw`SELECT count(*)::int AS count FROM "StudentProfile" p JOIN "User" u ON u.id=p."userId" JOIN "Batch" b ON b.id=p."batchId" WHERE b.status = 'ACTIVE' AND u."instituteId" IS DISTINCT FROM b."instituteId"`;
    const deletedBatchEnrollments = await tx.$queryRaw`SELECT count(*)::int AS count FROM "StudentProfile" p JOIN "Batch" b ON b.id=p."batchId" WHERE b.status = 'DELETED'`;
    const inactiveBatchEnrollments = await tx.$queryRaw`SELECT count(*)::int AS count FROM "StudentProfile" p JOIN "Batch" b ON b.id=p."batchId" WHERE b.status <> 'ACTIVE'`;
    const activeStudentProfiles = await tx.$queryRaw`SELECT count(*)::int AS count FROM "StudentProfile" p JOIN "User" u ON u.id=p."userId" JOIN "Batch" b ON b.id=p."batchId" WHERE u.status = 'ACTIVE' AND b.status = 'ACTIVE'`;
    const activeStudentsWithoutSubjects = await tx.$queryRaw`SELECT count(*)::int AS count FROM "StudentProfile" p JOIN "User" u ON u.id=p."userId" JOIN "Batch" b ON b.id=p."batchId" WHERE u.status = 'ACTIVE' AND b.status = 'ACTIVE' AND NOT EXISTS (SELECT 1 FROM "Subject" s WHERE s."batchId" = b.id AND s.status = 'ACTIVE')`;
    const invalidClassSubjects = await tx.$queryRaw`SELECT count(*)::int AS count FROM "BatchClass" c JOIN "Subject" s ON s.id=c."subjectId" WHERE s."batchId" IS DISTINCT FROM c."batchId"`;
    const invalidClassTeachers = await tx.$queryRaw`SELECT count(*)::int AS count FROM "BatchClass" c LEFT JOIN "BatchFaculty" f ON f."batchId"=c."batchId" AND f."userId"=c."teacherId" WHERE f."userId" IS NULL`;
    const invalidAttendance = await tx.$queryRaw`SELECT count(*)::int AS count FROM "ClassAttendance" a JOIN "BatchClass" c ON c.id=a."classId" LEFT JOIN "StudentProfile" p ON p."userId"=a."userId" AND p."batchId"=c."batchId" WHERE p."userId" IS NULL`;
    const activeInvalidClassSubjects = await tx.$queryRaw`SELECT count(*)::int AS count FROM "BatchClass" c JOIN "Batch" b ON b.id=c."batchId" JOIN "Subject" s ON s.id=c."subjectId" WHERE b.status = 'ACTIVE' AND s."batchId" IS DISTINCT FROM c."batchId"`;
    const activeInvalidClassTeachers = await tx.$queryRaw`SELECT count(*)::int AS count FROM "BatchClass" c JOIN "Batch" b ON b.id=c."batchId" LEFT JOIN "BatchFaculty" f ON f."batchId"=c."batchId" AND f."userId"=c."teacherId" WHERE b.status = 'ACTIVE' AND f."userId" IS NULL`;
    const activeInvalidAttendance = await tx.$queryRaw`SELECT count(*)::int AS count FROM "ClassAttendance" a JOIN "BatchClass" c ON c.id=a."classId" JOIN "Batch" b ON b.id=c."batchId" LEFT JOIN "StudentProfile" p ON p."userId"=a."userId" AND p."batchId"=c."batchId" WHERE b.status = 'ACTIVE' AND p."userId" IS NULL`;
    const invalidFolders = await tx.$queryRaw`SELECT count(*)::int AS count FROM "ResourceNode" child JOIN "ResourceNode" parent ON parent.id=child."parentId" WHERE child."lessonId" <> parent."lessonId" OR parent."isFolder" = false`;
    return {
      invalidResourceFolders: invalidFolders[0].count,
      tables: tables.map(row => row.table_name),
      crossInstituteEnrollments: invalidEnrollments[0].count,
      activeCrossInstituteEnrollments: activeInvalidEnrollments[0].count,
      deletedBatchEnrollments: deletedBatchEnrollments[0].count,
      inactiveBatchEnrollments: inactiveBatchEnrollments[0].count,
      activeStudentProfiles: activeStudentProfiles[0].count,
      activeStudentsWithoutSubjects: activeStudentsWithoutSubjects[0].count,
      invalidClassSubjects: invalidClassSubjects[0].count,
      invalidClassTeachers: invalidClassTeachers[0].count,
      invalidAttendance: invalidAttendance[0].count,
      activeInvalidClassSubjects: activeInvalidClassSubjects[0].count,
      activeInvalidClassTeachers: activeInvalidClassTeachers[0].count,
      activeInvalidAttendance: activeInvalidAttendance[0].count,
    };
  }, { timeout: 15000 });
  console.log(JSON.stringify(report, null, 2));
})().catch(error => { console.error('Database inspection failed:', error.code || error.name); process.exitCode = 1; }).finally(() => db.$disconnect());
