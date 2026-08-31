const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const attempt = await prisma.testAttempt.findUnique({
    where: { id: 'cmthjw2nm0001svygsypgdr4a' },
    include: { result: true, answers: true, student: true }
  });
  console.log('Attempt ID:', attempt?.id);
  console.log('Test ID:', attempt?.testId);
  console.log('Student ID:', attempt?.studentId, attempt?.student?.fullName);
  console.log('Submitted At:', attempt?.submittedAt);
  console.log('Result:', JSON.stringify(attempt?.result, null, 2));
  console.log('Answers Count:', attempt?.answers?.length);
  if (attempt?.answers?.length) {
    console.log('Sample answer 0:', JSON.stringify(attempt.answers[0], null, 2));
  }

  // Also check all attempts for this test
  const allAttempts = await prisma.testAttempt.findMany({
    where: { testId: 'cmthhmrl6000150nutbtyhprq' },
    include: { result: true }
  });
  console.log('Total attempts for test:', allAttempts.length);
  allAttempts.forEach(a => {
    console.log(`- Attempt ${a.id} (Att #${a.attemptNumber}): submittedAt=${a.submittedAt}, score=${a.result?.totalScore}`);
  });
}

check().catch(console.error).finally(() => prisma.$disconnect());
