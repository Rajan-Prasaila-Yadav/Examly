const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tests = await prisma.test.findMany({
    include: {
      batch: { select: { id: true, name: true } },
      sections: {
        include: {
          questions: { select: { id: true } }
        }
      }
    }
  });
  console.log('TESTS COUNT:', tests.length);
  for (const t of tests) {
    const qCount = t.sections.reduce((sum, s) => sum + s.questions.length, 0);
    console.log(`- Test [${t.id}] "${t.title}" | batchId=${t.batchId} (${t.batch?.name}) | status=${t.status}, isPublished=${t.isPublished}, testStatus=${t.testStatus} | totalQuestionsField=${t.totalQuestions}, actualQuestions=${qCount}, durationMinutes=${t.durationMinutes}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
