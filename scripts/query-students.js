const { PrismaClient } = require('./node_modules/@prisma/client');
const p = new PrismaClient();

async function main() {
  const students = await p.user.findMany({
    where: { role: { name: 'STUDENT' } },
    select: { id: true, email: true, fullName: true, status: true },
    take: 5
  });
  console.log('STUDENTS:');
  console.log(JSON.stringify(students, null, 2));

  const tests = await p.test.findMany({
    where: { status: 'PUBLISHED' },
    select: { id: true, title: true, status: true },
    take: 5
  });
  console.log('PUBLISHED TESTS:');
  console.log(JSON.stringify(tests, null, 2));

  const admins = await p.user.findMany({
    where: { role: { name: 'SUPER_ADMIN' } },
    select: { id: true, email: true, fullName: true },
    take: 3
  });
  console.log('SUPER_ADMINS:');
  console.log(JSON.stringify(admins, null, 2));
}

main().catch(e => console.error(e.message)).finally(() => p.$disconnect());
