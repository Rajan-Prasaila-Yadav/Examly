// scripts/test-pooler-port.js
const { PrismaClient } = require('@prisma/client');

async function testPooler() {
  const transactionUrl = 'postgresql://postgres.feqzagofwttmwtffyrrp:bhHSfjWlCJZFWkK9@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=15&pool_timeout=30';
  const prisma = new PrismaClient({
    datasources: { db: { url: transactionUrl } },
  });

  try {
    const res = await prisma.$queryRaw`SELECT 1 as test, current_database() as db`;
    console.log('✅ Connected to Supabase Transaction Pooler (Port 6543) successfully:', res);
  } catch (err) {
    console.error('❌ Port 6543 error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

testPooler();
