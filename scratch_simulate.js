const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simulate() {
  const testId = 'cmthhmrl6000150nutbtyhprq';
  const studentId = 'cmtfvhpzg0001n5sqx2dhur8j';
  const attemptId = 'cmthjw2nm0001svygsypgdr4a';

  // 1. Check with attemptId
  let att1 = await prisma.testAttempt.findUnique({
    where: { id: attemptId },
    include: { result: true, answers: true }
  });
  console.log('1. Query with attemptId:', att1?.id, 'Score:', att1?.result?.totalScore, 'Answers:', att1?.answers?.length);

  // 2. Check without attemptId (latest submitted)
  let att2 = await prisma.testAttempt.findFirst({
    where: { testId, studentId, submittedAt: { not: null } },
    include: { result: true, answers: true },
    orderBy: { submittedAt: 'desc' }
  });
  console.log('2. Query without attemptId (latest submitted):', att2?.id, 'Score:', att2?.result?.totalScore, 'Answers:', att2?.answers?.length);

  // 3. Check what happens if query is just testId and studentId (WITHOUT submittedAt filter, old logic)
  let att3 = await prisma.testAttempt.findFirst({
    where: { testId, studentId },
    include: { result: true, answers: true },
    orderBy: [{ submittedAt: 'desc' }, { startedAt: 'desc' }]
  });
  console.log('3. Old query with NULLS FIRST (in-progress):', att3?.id, 'submittedAt:', att3?.submittedAt, 'Score:', att3?.result?.totalScore);
}

simulate().catch(console.error).finally(() => prisma.$disconnect());
