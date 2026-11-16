const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.count();
  const batches = await prisma.batch.findMany({
    select: {
      id: true,
      name: true,
      code: true,
      _count: { select: { subjects: true, students: true, tests: true } }
    }
  });
  const subjects = await prisma.subject.findMany({
    select: {
      id: true,
      name: true,
      code: true,
      batchId: true,
      _count: { select: { lessons: true } }
    }
  });
  const lessons = await prisma.lesson.findMany({
    take: 5,
    select: {
      id: true,
      name: true,
      subjectId: true,
      _count: { select: { videos: true, notes: true } }
    }
  });
  const tests = await prisma.test.findMany({
    select: {
      id: true,
      title: true,
      testType: true,
      durationMinutes: true,
      totalMarks: true,
      batchId: true,
      _count: { select: { sections: true, attempts: true } }
    }
  });
  const testQuestions = await prisma.section.findMany({
    where: { testId: "cmwif3f8l0007w8av2oubk2r7" },
    include: {
      questions: {
        include: {
          options: true
        }
      }
    }
  });
  const totalQuestions = await prisma.question.count();
  console.log('TOTAL QUESTIONS IN DB:', totalQuestions);
}

main().catch(console.error).finally(() => prisma.$disconnect());
