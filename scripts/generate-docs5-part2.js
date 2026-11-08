// scripts/generate-docs5-part2.js
const fs = require('fs');
const path = require('path');

const docs5Dir = path.join(__dirname, '..', 'docs5');
if (!fs.existsSync(docs5Dir)) fs.mkdirSync(docs5Dir, { recursive: true });

function writeDoc(filename, content) {
  fs.writeFileSync(path.join(docs5Dir, filename), content.trim() + '\n', 'utf-8');
  console.log(`✅ Written: docs5/${filename}`);
}

// 18-test-engine.md
writeDoc('18-test-engine.md', `# Live Test Execution Engine & Scoring Math

## 1. Test Engine Runtime
The test engine is engineered for low latency and high resilience during live exams:
- **Zero Roundtrip Option Toggles**: Option selections are held in client state and synchronized asynchronously via \`POST /api/v1/tests/attempts/:id/answer\`.
- **Anti-Cheat Strike Tracking**: Fullscreen exit, tab switching, and blur events register cheat strikes via \`POST /api/v1/tests/attempts/:id/strike\`. Upon exceeding \`antiCheatLevel\` (default 3), the attempt is automatically submitted with \`isAutoSubmitted: true\`.
- **Resume Protection**: If connection is severed, refreshing the browser calls \`POST /api/v1/tests/:id/start\`, which returns the existing active attempt, current question answers, and synchronized remaining timer seconds.
`);

// 19-test-taking-flow.md
writeDoc('19-test-taking-flow.md', `# End-to-End Test Taking User Flow

The complete candidate exam lifecycle follows this sequence:
\`\`\`
1. Student enters /tests
   └── Clicks "Start Exam" on active test card
2. System invokes POST /api/v1/tests/:id/start
   └── Verifies batch eligibility & start/end windows
   └── Creates or resumes TestAttempt record
3. Test Runner UI Mounts (/tests/[id]/runner)
   └── Fullscreen prompt triggered
   └── Countdown timer initialized
   └── Question palette rendered by section
4. Question Navigation & Answering
   └── Student clicks Option A/B/C/D
   └── UI updates immediately (0ms latency)
   └── Background call to /tests/attempts/:id/answer persists choice
5. Final Submission (Manual or Timeout)
   └── Invokes POST /api/v1/tests/attempts/:id/submit
   └── Server evaluates answers against correct options
   └── Generates TestResult record with score & rank
   └── Redirects to /tests/[id]?tab=results
\`\`\`
`);

// 20-test-attempts.md
writeDoc('20-test-attempts.md', `# Test Attempt Management & Audit Trails

## 1. Data Integrity & Concurrency
- Multiple attempts per test are governed by test settings.
- Attempts store \`startedAt\`, \`submittedAt\`, \`durationSeconds\`, and \`cheatStrikes\`.
- Each answer is uniquely keyed by \`@@unique([attemptId, questionId])\` in \`AttemptAnswer\` table, preventing duplicate records.
`);

// 21-test-results-analytics.md
writeDoc('21-test-results-analytics.md', `# Test Results, Scoring Analytics & Leaderboards

## 1. Automated Scoring Pipeline
Upon submission, Fastify executes server-side evaluation:
\`\`\`typescript
totalScore = (totalCorrect * marksPositive) - (totalWrong * marksNegative);
percentage = (totalScore / totalMarks) * 100;
isPassed = totalScore >= passMarks;
\`\`\`
- Result is persisted in \`TestResult\` table.
- Leaderboard ranking is computed dynamically or fetched via \`GET /api/v1/tests/:id/leaderboard\`.
`);

// 22-students.md
writeDoc('22-students.md', `# Student Management & 360 Degree Profile

## 1. Student Directory & Search
- Paginated roster accessed via \`GET /api/v1/users/students\` with search filtering across name, phone, roll number, and batch.
- Defensively handles data wrappers (\`{ data: students, meta }\`) with \`Array.isArray\` guards to eliminate client-side map exceptions.

## 2. Student 360 View (\`/students/[id]\`)
Displays total test attempts, average score, watch completion percentage, and batch enrollment history.
`);

// 23-teachers.md
writeDoc('23-teachers.md', `# Faculty & Teacher Management System

## 1. Faculty Profiles
- Faculty records maintain \`facultyCode\`, \`designation\`, and \`specialization\`.
- Assigned to batches via \`assignedBatchIds\` array.
- Faculty 360 profile accessed via \`GET /api/v1/users/teachers/:id/360\`.
`);

// 24-admin.md
writeDoc('24-admin.md', `# Institutional Administration & Operations

## 1. Administrative Capabilities
- Full lifecycle management of cohorts, curriculum, tests, and student rosters.
- Access to institutional security audit logs via \`/settings/audit\`.
- Bulk YouTube playlist ingestion via \`/api/v1/youtube/import\`.
`);

// 25-super-admin.md
writeDoc('25-super-admin.md', `# Super Admin & Multi-Tenancy Governance

## 1. Platform-Wide Governance
- Unrestricted cross-tenant oversight across all registered educational institutes.
- Dynamic role permission tuning and permission grant management.
- Subscription tier allocation and tenant seat limits.
`);

// 26-employees.md
writeDoc('26-employees.md', `# Employee & Operational Staff Architecture

## 1. Operational Support Roles
- Staff members handling student admissions, fee verification, and test proctoring operate under scoped ADMIN permissions without access to billing or system settings.
`);

// 27-community.md
writeDoc('27-community.md', `# Institutional Community Wall & Interactive Polls

## 1. Community Engine Implementation
Implemented in \`apps/api/src/fastify/routes/community.routes.ts\`:
- \`GET /api/v1/community/feed\` — Returns announcements, polls, and pinned faculty posts.
- \`POST /api/v1/community/posts\` — Publishes rich notices with KaTeX math.
- \`POST /api/v1/community/posts/:id/react\` — Enforces single reaction per user with toggle support.
- \`POST /api/v1/community/polls/:pollId/vote\` — Records and updates student poll votes.
- \`GET /api/v1/community/posts/:id/comments\` — Retrieves threaded discussions.
`);

// 28-notifications.md
writeDoc('28-notifications.md', `# Notifications & BullMQ Asynchronous Dispatch

## 1. Notification Architecture
- Background queue \`notificationsQueue\` handles email and push notifications.
- High-priority events: Password reset tokens, test start reminders, and institutional notices.
- Push delivery is routed through Firebase Cloud Messaging (FCM).
`);

// 29-search-filter-sort-pagination.md
writeDoc('29-search-filter-sort-pagination.md', `# Server-Driven Search & PostgreSQL Trigram Indexing

## 1. Trigram Fuzzy Search (\`pg_trgm\`)
PostgreSQL GIN trigram indexes power server-driven fuzzy search across students, batches, and tests:
\`\`\`sql
SELECT id, "fullName", identifier FROM "User"
WHERE "fullName" % $1 OR identifier ILIKE $2
LIMIT 20;
\`\`\`
- Benchmark performance: **2.17ms p50** under 10 concurrent requests.
`);

// 30-import-export.md
writeDoc('30-import-export.md', `# Data Import & Export Pipeline

## 1. Export Capabilities
- CSV export for student rosters and test scorecards.
- Excel (XLSX via \`xlsx\` package) and PDF reports (via \`jspdf\` and \`jspdf-autotable\`).
- Handled asynchronously via \`exportQueue\` for massive cohorts (> 1000 students).
`);

// 31-file-storage.md
writeDoc('31-file-storage.md', `# Cloudflare R2 Object Storage Infrastructure

## 1. Storage Specifications
- **Provider**: Cloudflare R2 (S3-compatible).
- **Bucket**: \`examly-media\`.
- **Egress Fees**: $0.00.
- **Upload Flow**: Fastify \`storage.routes.ts\` accepts multipart/form-data, verifies MIME types and file signatures, and uploads directly to R2.
`);

// 32-email-and-password-reset.md
writeDoc('32-email-and-password-reset.md', `# Transactional Email Delivery & Password Reset

## 1. Password Reset Flow
\`\`\`
POST /api/v1/auth/forgot-password
  │
  ├── 1. Cryptographic token generation (crypto.randomBytes(32))
  ├── 2. SHA-256 hash stored in PostgreSQL PasswordResetToken
  ├── 3. BullMQ job enqueued to notificationsQueue
  └── 4. Notification worker dispatches email via Resend API
\`\`\`

## 2. Resend Sandbox Constraints
- Sending Address: \`Examly <onboarding@resend.dev>\`.
- In Resend Sandbox Mode, emails can only be delivered to the verified account owner (\`lalusirji420@gmail.com\`).
- Production cutover requires verifying an institutional custom sending domain in the Resend dashboard.
`);

// 33-redis-bullmq-workers.md
writeDoc('33-redis-bullmq-workers.md', `# Upstash Redis & BullMQ Background Workers

## 1. Registered Queues
1. \`notificationsQueue\` — Password reset emails and transactional notices.
2. \`exportQueue\` — PDF and Excel scorecard generation.
3. \`youtubeImportQueue\` — YouTube playlist batch metadata extraction.
4. \`analyticsQueue\` — Daily test attempt aggregation and percentile calculations.
`);

// 34-security-audit.md
writeDoc('34-security-audit.md', `# Comprehensive Security & Hardening Audit

## 1. Vulnerability Assessment
- **SQL Injection**: Eliminated via Prisma parameterized SQL queries.
- **Brute Force Protection**: Global rate limiting of 300 req/min with strict limits on auth endpoints.
- **IDOR Protection**: Database queries enforce \`where: { instituteId }\` multi-tenant boundaries.
- **Header Hardening**: Helmet enforces \`X-Frame-Options: DENY\`, \`X-Content-Type-Options: nosniff\`, and strict referrer policy.
`);

// 35-performance-audit.md
writeDoc('35-performance-audit.md', `# Master Performance Audit & Concurrency Benchmark

## 1. Benchmark Results (125 Concurrent Requests)
| Route | Type | p50 | p95 | p99 | RPS | Error Rate |
|---|---|---|---|---|---|---|
| Health Check | In-Memory Fastify | 3.46 ms | 6.63 ms | 6.65 ms | 5,395 | 0.00% |
| Authenticated Me | DB-Backed Read | 1,917 ms | 1,957 ms | 1,957 ms | 13.0 | 0.00% |
| Global Search | GIN Trigram Search | 3.84 ms | 5.13 ms | 5.14 ms | 6,418 | 0.00% |
| Batches Catalog | Cached / DB Read | 3,048 ms | 4,348 ms | 4,350 ms | 7.0 | 0.00% |

All 125 concurrent requests completed with **0 errors (0.00% error rate)**.
`);

console.log('Part 2 completed.');
