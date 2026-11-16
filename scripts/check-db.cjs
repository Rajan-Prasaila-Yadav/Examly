const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const institutes = await prisma.institute.findMany();
  console.log('INSTITUTES:', institutes.map(i => ({ id: i.id, name: i.name })));

  const batches = await prisma.batch.findMany({
    include: {
      subjects: {
        include: {
          lessons: {
            include: {
              videos: true,
              notes: true,
              tests: true
            }
          }
        }
      },
      students: true
    }
  });
  console.log('BATCHES COUNT:', batches.length);
  for (const b of batches) {
    console.log(`- Batch [${b.id}] "${b.name}" (${b.code}), examType=${b.examType}, status=${b.status}`);
    for (const s of b.subjects) {
      console.log(`   Subject: "${s.name}" (${s.id}) - ${s.lessons.length} lessons`);
      for (const l of s.lessons) {
        console.log(`     Lesson: "${l.title}" - ${l.videos.length} videos, ${l.notes.length} notes, ${l.tests.length} tests`);
      }
    }
  }

  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, studentProfile: true }
  });
  console.log('USERS:');
  for (const u of users) {
    console.log(`- ${u.email} (${u.role}), studentProfile:`, u.studentProfile);
  }

  const tests = await prisma.test.findMany({
    select: { id: true, title: true, type: true, status: true, totalQuestions: true, durationMinutes: true, totalMarks: true }
  });
  console.log('TESTS:', tests);
}

main().catch(console.error).finally(() => prisma.$disconnect());
