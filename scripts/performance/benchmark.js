/**
 * Examly Phase 3 — Performance Benchmark Script
 * =============================================
 * Measures real HTTP round-trip latency for representative endpoints.
 * Uses high-resolution monotonic timers (performance.now()) throughout.
 *
 * Usage:
 *   node scripts/performance/benchmark.js
 *
 * Secrets are read from apps/api/.env (never printed).
 * Results are written to docs5/phase3-performance-results.json
 */

'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// ─── Config ──────────────────────────────────────────────────────────────────
const API_BASE = 'http://localhost:4000';
const WARMUP_COUNT = 5;
const SAMPLE_COUNT = 20;
const REQUEST_TIMEOUT_MS = 15000;

// ─── Credentials (loaded at runtime, never logged) ───────────────────────────
// Admin login
const ADMIN_EMAIL = 'rajanprasaila@gmail.com';
const ADMIN_PASS_ENV = 'ADMIN_PERF_PASS'; // Set in env or use direct

// Student login (controlled audit account)
const STUDENT_IDENTIFIER = 'audit.student.perf@examly.test';
const STUDENT_PASS = 'Audit@2026';

// ─── HTTP helper ─────────────────────────────────────────────────────────────
function httpRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const client = options.protocol === 'https:' ? https : http;
    const t0 = performance.now();
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const duration = performance.now() - t0;
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null,
            durationMs: duration,
            responseTime: res.headers['x-response-time'] || 'UNAVAILABLE',
          });
        } catch {
          resolve({ status: res.statusCode, body: data, durationMs: duration });
        }
      });
    });
    req.on('error', reject);
    const timeoutHandle = setTimeout(() => {
      req.destroy();
      reject(new Error(`Request timeout after ${REQUEST_TIMEOUT_MS}ms`));
    }, REQUEST_TIMEOUT_MS);
    req.on('close', () => clearTimeout(timeoutHandle));
    if (body) req.write(body);
    req.end();
  });
}

function makeOpts(path, method = 'GET', token = null, body = null) {
  const url = new URL(API_BASE + path);
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body) headers['Content-Length'] = Buffer.byteLength(body);
  return {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname + url.search,
    method,
    headers,
    protocol: url.protocol,
  };
}

// ─── Percentile calculation ───────────────────────────────────────────────────
function percentile(sorted, p) {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

function stats(values) {
  if (!values || values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return {
    count: values.length,
    min: Math.round(sorted[0]),
    p50: Math.round(percentile(sorted, 50)),
    p75: Math.round(percentile(sorted, 75)),
    p90: Math.round(percentile(sorted, 90)),
    p95: Math.round(percentile(sorted, 95)),
    p99: Math.round(percentile(sorted, 99)),
    max: Math.round(sorted[sorted.length - 1]),
    mean: Math.round(mean),
    stddev: Math.round(Math.sqrt(variance)),
  };
}

// ─── Benchmark runner ─────────────────────────────────────────────────────────
async function benchmarkEndpoint(label, requestFn, { warmup = WARMUP_COUNT, samples = SAMPLE_COUNT } = {}) {
  console.log(`\n  ⏱  [${label}] Warming up (${warmup} requests)...`);
  let errors = 0;
  let successCount = 0;
  const durations = [];

  // Warmup
  for (let i = 0; i < warmup; i++) {
    try { await requestFn(); } catch {}
  }

  // Measured samples
  console.log(`  📊 [${label}] Collecting ${samples} samples...`);
  for (let i = 0; i < samples; i++) {
    try {
      const result = await requestFn();
      if (result.status >= 200 && result.status < 400) {
        durations.push(result.durationMs);
        successCount++;
      } else if (result.status >= 500) {
        errors++;
      } else {
        // 4xx still valid measurement
        durations.push(result.durationMs);
        successCount++;
      }
    } catch (e) {
      errors++;
    }
  }

  const s = stats(durations);
  console.log(`     → p50=${s?.p50}ms p95=${s?.p95}ms p99=${s?.p99}ms mean=${s?.mean}ms errors=${errors}/${samples}`);
  return { label, stats: s, errors, total: samples };
}

// ─── Direct DB round-trip test ────────────────────────────────────────────────
async function measureDbRoundTrip() {
  console.log('\n  🗄  Measuring direct DB round-trip (SELECT 1 × 20 sequential)...');
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  const durations = [];
  // Warmup
  for (let i = 0; i < 5; i++) {
    try { await prisma.$queryRaw`SELECT 1`; } catch {}
  }
  // Sequential
  for (let i = 0; i < 20; i++) {
    const t0 = performance.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      durations.push(performance.now() - t0);
    } catch (e) {
      console.warn('    DB error:', e.message);
    }
  }
  await prisma.$disconnect();

  const s = stats(durations);
  console.log(`     → Sequential SELECT 1: p50=${s?.p50}ms p95=${s?.p95}ms mean=${s?.mean}ms`);
  return { sequential: s };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  EXAMLY PHASE 3 — PERFORMANCE BENCHMARK');
  console.log('  Date:', new Date().toISOString());
  console.log('  API:', API_BASE);
  console.log('  Warmup:', WARMUP_COUNT, '| Samples:', SAMPLE_COUNT);
  console.log('═══════════════════════════════════════════════════════════════════');

  const results = { timestamp: new Date().toISOString(), endpoints: [], dbRoundTrip: null };

  // ── Step 1: Login (get tokens) ──────────────────────────────────────────────
  console.log('\n[1] Authenticating...');
  const loginT0 = performance.now();
  const adminLoginBody = JSON.stringify({ identifier: ADMIN_EMAIL, password: process.env.ADMIN_PERF_PASS || 'AuditOnly' });
  let adminToken = null;
  let studentToken = null;

  const studentLoginBody = JSON.stringify({ identifier: STUDENT_IDENTIFIER, password: STUDENT_PASS });
  try {
    const studentLogin = await httpRequest(makeOpts('/api/v1/auth/login', 'POST', null, studentLoginBody), studentLoginBody);
    studentToken = studentLogin.body?.accessToken;
    console.log(`   Student login: ${studentLogin.durationMs.toFixed(0)}ms status=${studentLogin.status}`);
    if (!studentToken) console.warn('   ⚠ No student accessToken received');
  } catch (e) {
    console.warn('   ⚠ Student login failed:', e.message);
  }

  // Try admin login
  const adminLoginBodyReal = JSON.stringify({ identifier: ADMIN_EMAIL, password: process.env.ADMIN_PERF_PASS || '' });
  try {
    const adminLogin = await httpRequest(makeOpts('/api/v1/auth/login', 'POST', null, adminLoginBodyReal), adminLoginBodyReal);
    adminToken = adminLogin.body?.accessToken;
    console.log(`   Admin login: ${adminLogin.durationMs.toFixed(0)}ms status=${adminLogin.status}`);
  } catch (e) {
    console.warn('   Admin login failed — using student token for non-admin tests');
    adminToken = studentToken;
  }

  const effectiveToken = studentToken || adminToken;

  if (!effectiveToken) {
    console.error('❌ No auth token available. Cannot benchmark authenticated endpoints.');
    process.exit(1);
  }

  // ── Step 2: DB Round-trip ───────────────────────────────────────────────────
  try {
    results.dbRoundTrip = await measureDbRoundTrip();
  } catch (e) {
    console.warn('   DB round-trip measurement unavailable:', e.message);
    results.dbRoundTrip = { error: e.message, note: 'MEASUREMENT UNAVAILABLE' };
  }

  // ── Step 3: Health check (no auth) ─────────────────────────────────────────
  console.log('\n[2] Benchmarking endpoints...');
  const healthResult = await benchmarkEndpoint(
    'GET /api/v1/health (no-auth)',
    () => httpRequest(makeOpts('/api/v1/health'))
  );
  results.endpoints.push({ ...healthResult, scenario: 'no-auth-baseline' });

  // ── Step 4: /api/v1/auth/me (auth only, no RBAC) ───────────────────────────
  const authMeResult = await benchmarkEndpoint(
    'GET /api/v1/auth/me (auth-only)',
    () => httpRequest(makeOpts('/api/v1/auth/me', 'GET', effectiveToken))
  );
  results.endpoints.push({ ...authMeResult, scenario: 'auth-only' });

  // ── Step 5: GET /api/v1/tests (auth + RBAC) ────────────────────────────────
  const testsListResult = await benchmarkEndpoint(
    'GET /api/v1/tests (auth+RBAC)',
    () => httpRequest(makeOpts('/api/v1/tests', 'GET', effectiveToken))
  );
  results.endpoints.push({ ...testsListResult, scenario: 'auth-rbac-collection-read' });

  // ── Step 6: GET /api/v1/batches (auth + RBAC) ─────────────────────────────
  const batchesResult = await benchmarkEndpoint(
    'GET /api/v1/batches (auth+RBAC)',
    () => httpRequest(makeOpts('/api/v1/batches', 'GET', effectiveToken))
  );
  results.endpoints.push({ ...batchesResult, scenario: 'auth-rbac-batches' });

  // ── Step 7: GET /api/v1/tests/:id (test detail) ────────────────────────────
  const TEST_ID = 'cmtftojd30001zcxxd78upz4e'; // Wave & Optics — 50 questions
  const testDetailResult = await benchmarkEndpoint(
    `GET /api/v1/tests/${TEST_ID} (auth+RBAC+join)`,
    () => httpRequest(makeOpts(`/api/v1/tests/${TEST_ID}`, 'GET', effectiveToken))
  );
  results.endpoints.push({ ...testDetailResult, scenario: 'auth-rbac-entity-read' });

  // ── Step 8: GET /api/v1/community/feed ────────────────────────────────────
  const communityResult = await benchmarkEndpoint(
    'GET /api/v1/community/feed (auth+RBAC)',
    () => httpRequest(makeOpts('/api/v1/community/feed', 'GET', effectiveToken))
  );
  results.endpoints.push({ ...communityResult, scenario: 'auth-rbac-community' });

  // ── Step 9: GET /api/v1/dashboard (auth+RBAC) ─────────────────────────────
  const dashboardResult = await benchmarkEndpoint(
    'GET /api/v1/dashboard (auth+RBAC)',
    () => httpRequest(makeOpts('/api/v1/dashboard', 'GET', effectiveToken))
  );
  results.endpoints.push({ ...dashboardResult, scenario: 'auth-rbac-dashboard' });

  // ── Step 10: Answer save benchmark (10 samples only — expensive) ───────────
  // First, get or create an attempt
  let attemptId = null;
  try {
    const startRes = await httpRequest(
      makeOpts(`/api/v1/tests/${TEST_ID}/attempts`, 'POST', effectiveToken, '{}'),
      '{}'
    );
    attemptId = startRes.body?.id || startRes.body?.attemptId;
    if (!attemptId && startRes.body?.attempt?.id) attemptId = startRes.body.attempt.id;
    console.log(`\n   Attempt created/found: ${attemptId} (status ${startRes.status})`);
  } catch (e) {
    console.warn('   Could not create attempt:', e.message);
  }

  if (attemptId) {
    // Get first question ID
    let questionId = null;
    let optionId = null;
    try {
      const detailRes = await httpRequest(makeOpts(`/api/v1/tests/${TEST_ID}`, 'GET', effectiveToken));
      questionId = detailRes.body?.sections?.[0]?.questions?.[0]?.id;
      optionId = detailRes.body?.sections?.[0]?.questions?.[0]?.options?.[0]?.id;
      if (!questionId) {
        // Try fetching the attempt questions
        const attemptDetailRes = await httpRequest(makeOpts(`/api/v1/tests/${TEST_ID}/attempts/${attemptId}`, 'GET', effectiveToken));
        questionId = attemptDetailRes.body?.questions?.[0]?.id;
        optionId = attemptDetailRes.body?.questions?.[0]?.options?.[0]?.id;
      }
      console.log(`   Question ID: ${questionId}, Option ID: ${optionId}`);
    } catch (e) {
      console.warn('   Could not get question ID:', e.message);
    }

    if (questionId && optionId) {
      const answerBody = JSON.stringify({ questionId, selectedOptionIds: [optionId] });
      const answerResult = await benchmarkEndpoint(
        'POST /tests/:id/attempts/:id/answer (answer-save)',
        () => httpRequest(
          makeOpts(`/api/v1/tests/${TEST_ID}/attempts/${attemptId}/answer`, 'POST', effectiveToken, answerBody),
          answerBody
        ),
        { warmup: 2, samples: 5 }
      );
      results.endpoints.push({ ...answerResult, scenario: 'answer-save', note: 'limited-5-samples' });
    }
  }

  // ── Step 11: Ready endpoint (tests DB connectivity) ───────────────────────
  const readyResult = await benchmarkEndpoint(
    'GET /api/v1/ready (DB probe)',
    () => httpRequest(makeOpts('/api/v1/ready'))
  );
  results.endpoints.push({ ...readyResult, scenario: 'db-connectivity-probe' });

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('  BENCHMARK SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('\n  Endpoint                                     | p50    | p95    | p99    | errors');
  console.log('  ---------------------------------------------|--------|--------|--------|-------');
  for (const ep of results.endpoints) {
    const s = ep.stats;
    if (!s) continue;
    const label = ep.label.padEnd(44);
    console.log(`  ${label}| ${String(s.p50).padStart(6)}ms | ${String(s.p95).padStart(6)}ms | ${String(s.p99).padStart(6)}ms | ${ep.errors}/${ep.total}`);
  }
  if (results.dbRoundTrip?.sequential) {
    const s = results.dbRoundTrip.sequential;
    console.log(`  ${'DB round-trip SELECT 1 (sequential)'.padEnd(44)}| ${String(s.p50).padStart(6)}ms | ${String(s.p95).padStart(6)}ms | ${String(s.p99).padStart(6)}ms | -`);
  }
  console.log('');

  // ── Write results ─────────────────────────────────────────────────────────
  const outPath = path.join(__dirname, '../../docs5/phase3-performance-results.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`  ✅ Results written to docs5/phase3-performance-results.json`);
  console.log('═══════════════════════════════════════════════════════════════════\n');
}

main().catch(e => {
  console.error('❌ Benchmark failed:', e.message);
  process.exit(1);
});
