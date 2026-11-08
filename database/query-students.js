const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Get ALL tests (no status filter)
  const tests = await p.test.findMany({
    select: {
      id: true, title: true, status: true,
      sections: {
        select: {
          id: true, name: true,
          _count: { select: { questions: true } }
        }
      }
    }
  });
  console.log('ALL TESTS:');
  console.log(JSON.stringify(tests, null, 2));

  // Test attempts
  const attempts = await p.testAttempt.findMany({
    select: { id: true, studentId: true, testId: true, startedAt: true },
    take: 10
  });
  console.log('TEST ATTEMPTS:');
  console.log(JSON.stringify(attempts, null, 2));

  // Batches
  const batches = await p.batch.findMany({
    select: { id: true, name: true, status: true },
    take: 5
  });
  console.log('BATCHES:', JSON.stringify(batches, null, 2));

  // Student users
  const students = await p.user.findMany({
    where: { roleId: 'role-student' },
    select: { id: true, email: true, fullName: true, status: true },
    take: 10
  });
  console.log('STUDENTS:', JSON.stringify(students, null, 2));
}

main().catch(e => console.error(e.message)).finally(() => p.$disconnect());
