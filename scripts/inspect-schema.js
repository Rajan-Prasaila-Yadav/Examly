require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const tables = ['Subject', 'Batch', 'User', 'Lesson', 'Test', 'Video', 'Role'];
  for (const table of tables) {
    const cols = await p.$queryRawUnsafe(
      `SELECT column_name FROM information_schema.columns WHERE table_name = '${table}' ORDER BY ordinal_position`
    );
    console.log(`${table}: ${cols.map(c => c.column_name).join(', ')}`);
  }
  await p.$disconnect();
})();
