// scripts/forensic-db-latency.js
const { PrismaClient } = require('@prisma/client');
const dns = require('dns').promises;
const net = require('net');
const tls = require('tls');
const { performance } = require('perf_hooks');

async function runDatabaseForensics() {
  console.log('========================================================================');
  console.log('🔬 FORENSIC DATABASE READINESS & LATENCY DIAGNOSTIC SUITE');
  console.log('========================================================================\n');

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  // Parse Database URL
  const parsedUrl = new URL(dbUrl);
  const host = parsedUrl.hostname;
  const port = parseInt(parsedUrl.port || '5432', 10);

  console.log(`Database Host: ${host}`);
  console.log(`Database Port: ${port}`);
  console.log(`Direct / Pooled: ${host.includes('pooler') ? 'PgBouncer Pooler' : 'Direct Supabase Node'}\n`);

  // 1. Measure DNS Lookup Latency
  const dnsStart = performance.now();
  const dnsRecords = await dns.lookup(host);
  const dnsDuration = performance.now() - dnsStart;
  console.log(`1. DNS Resolution:          ${dnsDuration.toFixed(2)} ms (IP: ${dnsRecords.address})`);

  // 2. Measure TCP Handshake Latency
  const tcpDuration = await new Promise((resolve) => {
    const start = performance.now();
    const socket = net.createConnection({ host, port }, () => {
      const dur = performance.now() - start;
      socket.destroy();
      resolve(dur);
    });
    socket.on('error', () => resolve(-1));
  });
  console.log(`2. TCP 3-Way Handshake:     ${tcpDuration.toFixed(2)} ms (Geographic RTT)`);

  // 3. Measure TLS Handshake Latency
  const tlsDuration = await new Promise((resolve) => {
    const start = performance.now();
    const socket = tls.connect({ host, port, rejectUnauthorized: false }, () => {
      const dur = performance.now() - start;
      socket.destroy();
      resolve(dur);
    });
    socket.on('error', () => resolve(-1));
  });
  console.log(`3. TLS Session Negotiation: ${tlsDuration.toFixed(2)} ms`);

  // 4. Measure Prisma Connection Lifecycle & Queries
  console.log('\n--- 4. Prisma Connection Pool & Query Execution Latencies ---');

  const prisma = new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'stdout', level: 'error' },
    ],
  });

  const queryEvents = [];
  prisma.$on('query', (e) => {
    queryEvents.push({ query: e.query, duration: e.duration });
  });

  // Cold Start Connection + First Query
  const coldStart = performance.now();
  await prisma.$connect();
  const connectDuration = performance.now() - coldStart;
  console.log(`Prisma $connect() Warmup:   ${connectDuration.toFixed(2)} ms`);

  // First Query (Cold pool checkout)
  const q1Start = performance.now();
  await prisma.$queryRaw`SELECT 1 as test`;
  const q1Duration = performance.now() - q1Start;
  console.log(`First Query (SELECT 1):     ${q1Duration.toFixed(2)} ms (includes TCP+TLS+Auth over internet)`);

  // Subsequent Queries (Warm connection in pool)
  const warmLatencies = [];
  for (let i = 0; i < 5; i++) {
    const start = performance.now();
    await prisma.$queryRaw`SELECT 1 as test`;
    warmLatencies.push(performance.now() - start);
  }

  const avgWarm = (warmLatencies.reduce((a, b) => a + b, 0) / warmLatencies.length).toFixed(2);
  const minWarm = Math.min(...warmLatencies).toFixed(2);
  const maxWarm = Math.max(...warmLatencies).toFixed(2);
  console.log(`Warm Queries (SELECT 1 x5): Avg: ${avgWarm} ms | Min: ${minWarm} ms | Max: ${maxWarm} ms`);

  // Real Table Select Latency (Indexed vs Non-Indexed)
  const userQueryStart = performance.now();
  await prisma.user.findFirst({ select: { id: true, email: true } });
  const userQueryDur = performance.now() - userQueryStart;
  console.log(`Warm Model Query (User.findFirst): ${userQueryDur.toFixed(2)} ms`);

  await prisma.$disconnect();

  console.log('\n========================================================================');
  console.log('💡 DIAGNOSTIC ROOT CAUSE SUMMARY:');
  console.log(`- Base Internet Latency (TCP RTT to Cloud DB): ~${tcpDuration.toFixed(2)} ms`);
  console.log(`- Connection Establishment Overhead (TCP+TLS): ~${(tcpDuration + tlsDuration).toFixed(2)} ms`);
  console.log(`- Single Query Overhead over Public WAN: ~${minWarm} ms`);
  console.log('========================================================================\n');
}

runDatabaseForensics()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Diagnostic failed:', err);
    process.exit(1);
  });
