// scripts/test-prisma-token.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const count = await prisma.passwordResetToken.count();
    console.log('PasswordResetToken count:', count);
  } catch (err) {
    console.error('Prisma test error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
