const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const batch = await prisma.batch.findUnique({
    where: { id: 'cmwiezq2k0001n0xwcy2t1rao' },
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
      }
    }
  });

  console.log('Batch:', batch.name);
  for (const s of batch.subjects) {
    console.log(`\nSubject: ${s.name} (${s.id})`);
    for (const l of s.lessons) {
      console.log(`  Lesson: "${l.name || l.title}" (${l.id}) - status: ${l.status}`);
      for (const v of l.videos) {
        console.log(`    Video: "${v.title}" (${v.id}), durationSeconds: ${v.durationSeconds}, status: ${v.status}`);
      }
      for (const n of l.notes) {
        console.log(`    Note: "${n.title}" (${n.id}), status: ${n.status}`);
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
