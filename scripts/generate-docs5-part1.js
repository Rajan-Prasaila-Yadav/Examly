// scripts/generate-docs5-part1.js
const fs = require('fs');
const path = require('path');

const docs5Dir = path.join(__dirname, '..', 'docs5');
if (!fs.existsSync(docs5Dir)) fs.mkdirSync(docs5Dir, { recursive: true });

function writeDoc(filename, content) {
  fs.writeFileSync(path.join(docs5Dir, filename), content.trim() + '\n', 'utf-8');
  console.log(`✅ Written: docs5/${filename}`);
}

// 03-architecture.md
writeDoc('03-architecture.md', `# System Architecture & Data Flow

## 1. High-Level Topology
Examly is engineered as a decoupled high-performance learning and assessment platform:

\`\`\`
[ Next.js 14 Web Frontend ]
        │  (HTTP/REST + JWT Bearer)
        ▼
[ Fastify 4 Standalone Engine ] ──(TLS)──► [ Upstash Redis: Cache & BullMQ ]
        │                                             ▲
        │ (PgBouncer Port 6543)                       │ (Background Workers)
        ▼                                             ▼
[ PostgreSQL (AWS Seoul) ]            [ Cloud Workers: Resend / FCM / R2 ]
\`\`\`

## 2. Core Subsystems
1. **Presentation Layer**: Next.js 14 App Router delivering client-side interactive islands with SWR in-memory caching, inflight request deduplication, and Tailwind styling.
2. **API Runtime Layer**: Fastify 4 modular plugins with zero NestJS residue. Includes Helmet security headers, CORS origin whitelisting, rate-limiting (300 req/min), gzip compression, and preHandler authentication guards.
3. **Identity & RBAC**: JWT Access Tokens (15 min) and Refresh Tokens (7 days) with 4-tier hierarchical roles (SUPER_ADMIN, ADMIN, TEACHER, STUDENT) verified via granular permission decorators.
4. **Data Access Layer**: Prisma 5.22 connected to Supabase PgBouncer Transaction Pooler in AWS Seoul (\`ap-northeast-2\`). Custom telemetry hooks track slow queries (>200ms).
5. **Asynchronous Processing**: BullMQ job queues backed by Upstash Redis processing background transactional email notifications, CSV/Excel/PDF exports, and YouTube metadata ingestion.
6. **Object Storage**: Cloudflare R2 bucket (\`examly-media\`) with public CDN endpoint for lesson notes, test diagrams, and user avatars.
`);

// 04-frontend-pages.md
writeDoc('04-frontend-pages.md', `# Frontend Pages & Component Inventory

Examly frontend includes 18 primary App Router route groups, all authenticated via \`useAuth()\` and guarded by layout wrappers.

| Route | Access | Component | Purpose | Primary Endpoints Called |
|---|---|---|---|---|
| \`/\` | Public/Auth | \`app/page.tsx\` | Landing / Dashboard redirect | \`GET /auth/me\` |
| \`/login\` | Public | \`app/(auth)/login/page.tsx\` | Email/Password & Google OAuth | \`POST /auth/login\`, \`POST /auth/google\` |
| \`/signup\` | Public | \`app/(auth)/signup/page.tsx\` | Student self-registration | \`POST /auth/signup\` |
| \`/forgot-password\` | Public | \`app/(auth)/forgot-password/page.tsx\` | Reset request & token submit | \`POST /auth/forgot-password\`, \`POST /auth/reset-password\` |
| \`/batches\` | Admin, Teacher | \`app/(dashboard)/batches/page.tsx\` | Batch catalog & creation modal | \`GET /batches\`, \`POST /batches\`, \`PUT /batches/:id\` |
| \`/batches/[id]\` | Admin, Teacher | \`app/(dashboard)/batches/[id]/page.tsx\` | Batch 360 detail, students, tests | \`GET /batches/:id\`, \`GET /batches/:id/students\`, \`GET /batches/:id/teachers\`, \`GET /batches/:id/tests\` |
| \`/curriculum\` | All Roles | \`app/(dashboard)/curriculum/page.tsx\` | Hierarchical subject/lesson explorer | \`GET /batches\`, \`GET /subjects\`, \`GET /lessons\` |
| \`/subjects/[id]\` | All Roles | \`app/(dashboard)/subjects/[id]/page.tsx\` | Subject chapters & lessons roster | \`GET /subjects/:id\`, \`POST /lessons\`, \`PUT /subjects/:id\` |
| \`/lessons/[id]\` | All Roles | \`app/(dashboard)/lessons/[id]/page.tsx\` | Lesson videos, notes, resources | \`GET /lessons/:id\`, \`POST /videos\`, \`POST /notes\` |
| \`/lessons/[id]/videos/[videoId]\` | All Roles | \`app/(dashboard)/lessons/[id]/videos/[videoId]/page.tsx\` | Video player, reactions, comments | \`GET /videos/:id\`, \`GET /videos/:id/reactions\`, \`GET /videos/:id/comments\`, \`POST /videos/:id/reactions\`, \`POST /videos/:id/comments\` |
| \`/students\` | Admin, Teacher | \`app/(dashboard)/students/page.tsx\` | Student directory & enrollment | \`GET /users/students\`, \`POST /users/students\`, \`PUT /users/students/:id\` |
| \`/students/[id]\` | Admin, Teacher, Self | \`app/(dashboard)/students/[id]/page.tsx\` | Student 360 profile, performance | \`GET /users/students/:id/360\` |
| \`/teachers\` | Admin | \`app/(dashboard)/teachers/page.tsx\` | Faculty directory & assignments | \`GET /users/teachers\`, \`POST /users/teachers\` |
| \`/teachers/[id]\` | Admin, Self | \`app/(dashboard)/teachers/[id]/page.tsx\` | Teacher 360 profile, analytics | \`GET /users/teachers/:id/360\` |
| \`/tests\` | All Roles | \`app/(dashboard)/tests/page.tsx\` | Test list, status, rankings | \`GET /tests\`, \`POST /tests\` |
| \`/tests/[id]\` | All Roles | \`app/(dashboard)/tests/[id]/page.tsx\` | Test details, sections, attempts | \`GET /tests/:id\`, \`GET /tests/:id/attempts\`, \`GET /tests/:id/leaderboard\` |
| \`/tests/[id]/runner\` | Student | \`app/(dashboard)/tests/[id]/runner/page.tsx\` | Live test runner, timer, anti-cheat | \`POST /tests/:id/start\`, \`POST /tests/attempts/:id/answer\`, \`POST /tests/attempts/:id/submit\` |
| \`/tests/builder\` | Admin, Teacher | \`app/(dashboard)/tests/builder/page.tsx\` | Question authoring, KaTeX math | \`GET /tests/:id\`, \`POST /tests/:id/sections\`, \`POST /tests/questions\` |
| \`/community\` | All Roles | \`app/(dashboard)/community/page.tsx\` | Institutional notices & batch polls | \`GET /community/feed\`, \`POST /community/posts\`, \`POST /community/posts/:id/react\` |
| \`/settings/roles\` | Super Admin | \`app/(dashboard)/settings/roles/page.tsx\` | RBAC permissions matrix editor | \`GET /users/roles\`, \`PUT /users/roles/:id/permissions\` |
| \`/settings/audit\` | Admin, Super Admin | \`app/(dashboard)/settings/audit/page.tsx\` | Security audit log explorer | \`GET /system/audit-logs\` |
`);

// 05-backend-routes.md
writeDoc('05-backend-routes.md', `# Fastify Backend Routes & Handler Inventory

Every Fastify endpoint registered in \`apps/api/src/fastify/server.ts\` is documented below with authentication and permission requirements.

## 1. Authentication (\`/api/v1/auth\`)
- \`POST /api/v1/auth/register\` — Public. Registers user and student profile.
- \`POST /api/v1/auth/login\` — Public. Authenticates with email/phone/identifier and returns JWT tokens.
- \`POST /api/v1/auth/refresh\` — Public. Validates refresh token and issues fresh access token.
- \`POST /api/v1/auth/forgot-password\` — Public. Dispatches cryptographic reset token to BullMQ.
- \`POST /api/v1/auth/reset-password\` — Public. Consumes single-use reset token and hashes new password.
- \`GET /api/v1/auth/me\` — Authenticated. Returns current authenticated user and role profile.
- \`POST /api/v1/auth/logout\` — Authenticated. Revokes active session.

## 2. Batches (\`/api/v1/batches\`)
- \`GET /api/v1/batches\` — Authenticated. Returns catalog of institute batches.
- \`POST /api/v1/batches\` — Permission: \`batches.create\`. Creates new batch.
- \`GET /api/v1/batches/:id\` — Authenticated. Returns batch detail with subject counts.
- \`PUT /api/v1/batches/:id\` — Permission: \`batches.update\`. Updates batch settings.
- \`DELETE /api/v1/batches/:id\` — Permission: \`batches.delete\`. Soft-deletes batch.
- \`GET /api/v1/batches/:id/students\` — Authenticated. Returns enrolled student profiles.
- \`GET /api/v1/batches/:id/teachers\` — Authenticated. Returns faculty assigned to batch.
- \`GET /api/v1/batches/:id/tests\` — Authenticated. Returns tests assigned to batch.

## 3. Curriculum (\`/api/v1/subjects\` & \`/api/v1/lessons\`)
- \`GET /api/v1/subjects\` — Authenticated. Lists subjects.
- \`POST /api/v1/subjects\` — Permission: \`subjects.create\`. Creates subject.
- \`GET /api/v1/subjects/:id\` — Authenticated. Subject detail with lessons.
- \`PUT /api/v1/subjects/:id\` — Permission: \`subjects.update\`. Updates subject.
- \`DELETE /api/v1/subjects/:id\` — Permission: \`subjects.delete\`. Deletes subject.
- \`POST /api/v1/lessons\` — Permission: \`lessons.create\`. Creates lesson chapter.
- \`GET /api/v1/lessons/:id\` — Authenticated. Lesson detail with videos and notes.
- \`PUT /api/v1/lessons/:id\` — Permission: \`lessons.update\`. Updates lesson.
- \`DELETE /api/v1/lessons/:id\` — Permission: \`lessons.delete\`. Deletes lesson.

## 4. Video & Engagement (\`/api/v1/videos\`)
- \`GET /api/v1/videos/:id\` — Authenticated. Video metadata and stream info.
- \`GET /api/v1/videos/:id/reactions\` — Authenticated. Aggregated reaction breakdown.
- \`POST /api/v1/videos/:id/reactions\` — Authenticated. Toggles reaction (LIKE, LOVE, HELPFUL, BRAVO, CELEBRATE).
- \`GET /api/v1/videos/:id/comments\` — Authenticated. Threaded comments with author info.
- \`POST /api/v1/videos/:id/comments\` — Authenticated. Posts top-level or threaded comment reply.
- \`POST /api/v1/comments/:id/reactions\` — Authenticated. Toggles comment reaction.

## 5. Tests & Examination (\`/api/v1/tests\`)
- \`GET /api/v1/tests\` — Authenticated. Lists tests filtered by batch/institute.
- \`POST /api/v1/tests\` — Permission: \`tests.create\`. Creates test draft.
- \`GET /api/v1/tests/:id\` — Authenticated. Test specification, sections, and questions.
- \`GET /api/v1/tests/:id/attempts\` — Authenticated. Student attempts and score history.
- \`GET /api/v1/tests/:id/leaderboard\` — Authenticated. Ranked leaderboard for test.
- \`POST /api/v1/tests/:id/start\` — Authenticated (Student). Starts or resumes test attempt.
- \`POST /api/v1/tests/attempts/:id/answer\` — Authenticated (Student). Saves question response.
- \`POST /api/v1/tests/attempts/:id/strike\` — Authenticated (Student). Increments cheat strike.
- \`POST /api/v1/tests/attempts/:id/submit\` — Authenticated (Student). Evaluates answers and generates TestResult.

## 6. Community (\`/api/v1/community\`)
- \`GET /api/v1/community/feed\` — Authenticated. Scoped institutional notices and batch polls.
- \`POST /api/v1/community/posts\` — Authenticated. Creates announcement or poll.
- \`POST /api/v1/community/posts/:id/react\` — Authenticated. Toggles post reaction.
- \`POST /api/v1/community/polls/:pollId/vote\` — Authenticated. Casts or updates poll vote.
- \`GET /api/v1/community/posts/:id/comments\` — Authenticated. Threaded post discussions.
- \`POST /api/v1/community/posts/:id/comments\` — Authenticated. Adds comment or reply.

## 7. Users & Roles (\`/api/v1/users\`)
- \`GET /api/v1/users/students\` — Permission: \`students.read\`. Paginated student roster.
- \`GET /api/v1/users/students/:id/360\` — Authenticated. Complete student academic record.
- \`GET /api/v1/users/teachers\` — Permission: \`teachers.read\`. Faculty roster.
- \`GET /api/v1/users/teachers/:id/360\` — Authenticated. Faculty teaching performance and batches.
- \`GET /api/v1/users/roles\` — Permission: \`roles.read\`. Role permission matrix.
- \`PUT /api/v1/users/roles/:id/permissions\` — Permission: \`roles.update\`. Updates permissions.
`);

// 06-api-contract.md
writeDoc('06-api-contract.md', `# Frontend ↔ Backend API Contract Specification

## 1. Response Standards
All Fastify responses return standard HTTP status codes and JSON payloads:
- **Success Collections**: \`{ data: T[], meta?: { page, limit, total, totalPages } }\` or \`T[]\`
- **Success Items**: \`T\` or \`{ message: string, data: T }\`
- **Error Payloads**:
\`\`\`json
{
  "statusCode": 400,
  "message": "Detailed human-readable error description",
  "error": "Bad Request"
}
\`\`\`

## 2. API Contract Mapping Matrix
| Feature | Frontend Call | Fastify Route | Status |
|---|---|---|---|
| Batches | \`api.get('/batches')\` | \`GET /api/v1/batches\` | ✅ Synchronized |
| Batch Detail | \`api.get('/batches/:id')\` | \`GET /api/v1/batches/:id\` | ✅ Synchronized |
| Batch Students | \`api.get('/batches/:id/students')\` | \`GET /api/v1/batches/:id/students\` | ✅ Synchronized |
| Batch Teachers | \`api.get('/batches/:id/teachers')\` | \`GET /api/v1/batches/:id/teachers\` | ✅ Synchronized |
| Batch Tests | \`api.get('/batches/:id/tests')\` | \`GET /api/v1/batches/:id/tests\` | ✅ Synchronized |
| Students List | \`api.get('/users/students')\` | \`GET /api/v1/users/students\` | ✅ Synchronized |
| Student 360 | \`api.get('/users/students/:id/360')\` | \`GET /api/v1/users/students/:id/360\` | ✅ Synchronized |
| Teachers List | \`api.get('/users/teachers')\` | \`GET /api/v1/users/teachers\` | ✅ Synchronized |
| Teacher 360 | \`api.get('/users/teachers/:id/360')\` | \`GET /api/v1/users/teachers/:id/360\` | ✅ Synchronized |
| Roles Matrix | \`api.get('/users/roles')\` | \`GET /api/v1/users/roles\` | ✅ Synchronized |
| Community Feed | \`api.get('/community/feed')\` | \`GET /api/v1/community/feed\` | ✅ Synchronized |
| Post Announcement | \`api.post('/community/posts')\` | \`POST /api/v1/community/posts\` | ✅ Synchronized |
| React to Post | \`api.post('/community/posts/:id/react')\`| \`POST /api/v1/community/posts/:id/react\`| ✅ Synchronized |
| Video Detail | \`api.get('/videos/:id')\` | \`GET /api/v1/videos/:id\` | ✅ Synchronized |
| Video Reactions | \`api.get('/videos/:id/reactions')\` | \`GET /api/v1/videos/:id/reactions\` | ✅ Synchronized |
| Video Comments | \`api.get('/videos/:id/comments')\` | \`GET /api/v1/videos/:id/comments\` | ✅ Synchronized |
| Test Attempts | \`api.get('/tests/:id/attempts')\` | \`GET /api/v1/tests/:id/attempts\` | ✅ Synchronized |
| Test Leaderboard | \`api.get('/tests/:id/leaderboard')\` | \`GET /api/v1/tests/:id/leaderboard\` | ✅ Synchronized |
`);

// 07-database-schema.md
writeDoc('07-database-schema.md', `# PostgreSQL Database Schema & Model Topology

Database models are structured into 7 functional modules under \`database/prisma/schema/\`:

## 1. Identity & Tenancy (\`identity.prisma\`)
- **Institute**: Multi-tenant container (\`slug\`, \`subscriptionTier\`, \`maxStudents\`).
- **User**: Core actor (\`email\`, \`phone\`, \`identifier\`, \`passwordHash\`, \`roleId\`).
- **Role**: RBAC definition (\`name\`, \`code\`: SUPER_ADMIN | ADMIN | TEACHER | STUDENT).
- **RolePermission**: Direct permission mapping (\`resource\`, \`action\`, \`scope\`).
- **StudentProfile**: Student-specific attributes (\`rollNumber\`, \`batchId\`, \`province\`, \`district\`).
- **TeacherProfile**: Faculty-specific attributes (\`facultyCode\`, \`designation\`, \`specialization\`).
- **UserSession**: Active JWT sessions (\`refreshTokenHash\`, \`deviceInfo\`, \`expiresAt\`).
- **PasswordResetToken**: Single-use tokens (\`tokenHash\`, \`isConsumed\`, \`expiresAt\`).

## 2. Academic Catalog (\`catalog.prisma\`)
- **Batch**: Academic cohort (\`name\`, \`code\`, \`priceNpr\`, \`startDate\`, \`endDate\`).
- **Subject**: Course module within a batch (\`name\`, \`sortOrder\`).
- **Lesson**: Topic/chapter within a subject (\`name\`, \`description\`, \`sortOrder\`).
- **Video**: Video lecture (\`provider\`, \`videoUrl\`, \`durationSeconds\`, \`viewCount\`).
- **Note**: R2 PDF/DOC lecture note (\`fileUrl\`, \`fileSizeBytes\`).
- **VideoReaction**: User reaction on video (\`reactionType\`, \`videoId\`, \`userId\`).
- **VideoComment**: Discussion comment or threaded reply (\`content\`, \`parentId\`).
- **CommentReaction**: Reaction on a comment.

## 3. Examination Engine (\`test-engine.prisma\`)
- **Test**: Examination specification (\`title\`, \`durationMinutes\`, \`totalMarks\`, \`testStatus\`).
- **TestConfig**: Anti-cheat and shuffle rules (\`antiCheatLevel\`, \`shuffleQuestions\`).
- **Section**: Subject section within test (\`name\`, \`sortOrder\`).
- **Question**: KaTeX question item (\`contentHtml\`, \`marksPositive\`, \`marksNegative\`).
- **QuestionOption**: Multiple choice options (\`optionLabel\`, \`contentHtml\`, \`isCorrect\`).
- **QuestionSolution**: Explanation and hint (\`stepByStepHtml\`, \`solutionImageUrl\`).
- **TestAttempt**: Student session (\`startedAt\`, \`submittedAt\`, \`cheatStrikes\`).
- **AttemptAnswer**: Answer recorded (\`selectedOptionIds\`, \`timeSpentSeconds\`, \`awardedMarks\`).
- **TestResult**: Evaluated score (\`totalScore\`, \`percentage\`, \`rank\`, \`isPassed\`).

## 4. Community & Collaboration (\`community.prisma\`)
- **CommunityPost**: Institutional announcement (\`title\`, \`contentHtml\`, \`isPinned\`).
- **BatchPoll**: Interactive poll attached to post (\`question\`, \`expiresAt\`).
- **PollOption**: Poll choices with vote tally.
- **PollVote**: Individual student/teacher vote record.
- **PostReaction**: Reaction on community post.
- **PostComment**: Threaded discussion on community post.
`);

// 08-authentication.md
writeDoc('08-authentication.md', `# Authentication & Security Architecture

## 1. Authentication Lifecycle
Examly enforces stateless JWT authentication backed by cryptographic token verification:
1. **Access Token**: Short-lived (15 minutes), signed with \`JWT_ACCESS_SECRET\`, carried via \`Authorization: Bearer <token>\`.
2. **Refresh Token**: Long-lived (7 days), signed with \`JWT_REFRESH_SECRET\`, persisted as SHA-256 hash in \`UserSession\` table.
3. **Session Invalidation**: When user logs out or resets password, \`UserSession.updateMany({ isActive: false })\` immediately revokes all active refresh tokens.

## 2. Password Cryptography
- Password hashing uses \`bcryptjs\` with 10 salt rounds.
- Tokens for password reset are generated using \`crypto.randomBytes(32).toString('hex')\` (64 characters) and stored in PostgreSQL strictly as SHA-256 hashes.
- Plaintext reset tokens are never written to disk or database logs.

## 3. Single-Use Invalidation & Expiration
- Password reset tokens expire after exactly 60 minutes (\`expiresAt: new Date(Date.now() + 3600000)\`).
- Once used in \`POST /api/v1/auth/reset-password\`, the token is immediately marked \`isConsumed: true\` and its \`consumedAt\` timestamp recorded. Subsequent reuse attempts receive an HTTP 400 rejection.
`);

// 09-authorization-rbac.md
writeDoc('09-authorization-rbac.md', `# 4-Tier Role-Based Access Control (RBAC)

## 1. Role Hierarchy
Examly enforces four discrete system roles:
1. **SUPER_ADMIN**: Platform owner with unrestricted cross-institute access, billing control, and system role management.
2. **ADMIN**: Institutional director managing faculty, students, cohorts, and institutional settings.
3. **TEACHER**: Academic instructor authoring tests, publishing curriculum, evaluating attempts, and hosting community discussions.
4. **STUDENT**: Enrolled candidate taking tests, consuming video lectures, and tracking personal performance.

## 2. Permission Guard Architecture
Fastify endpoints enforce authorization using the \`requirePermission(resource, action)\` preHandler decorator:
\`\`\`typescript
preHandler: [fastify.authenticate, requirePermission('batches', 'create')]
\`\`\`
The decorator checks:
1. If user is \`SUPER_ADMIN\`, request is automatically authorized.
2. If role has explicit mapping in \`RolePermission\` table or in-memory fallback matrix, request proceeds.
3. If permission is missing, Fastify immediately halts execution with an HTTP 403 Forbidden payload.
`);

// 10-users-and-roles.md
writeDoc('10-users-and-roles.md', `# Users, Profiles & System Roles

## 1. Unified User Identity
The \`User\` model unifies all human actors in Examly. Identity specialization is achieved via 1:1 relations:
- \`User.studentProfile\` -> Stores Roll Number, assigned \`batchId\`, and administrative region.
- \`User.teacherProfile\` -> Stores \`facultyCode\`, \`designation\`, \`specialization\`, and assigned batch IDs.

## 2. Role Permission Matrix Editor
Admins can dynamically tune role permissions via \`/settings/roles\` on the frontend, which syncs with:
- \`GET /api/v1/users/roles\`
- \`PUT /api/v1/users/roles/:id/permissions\`
Permissions are cached in Redis under tag \`roles\` and automatically purged upon mutation.
`);

// 11-batches.md
writeDoc('11-batches.md', `# Batch Cohort Management System

## 1. Batch Model & Lifecycle
A Batch represents an academic cohort (e.g. "CEE 2026 Batch A"). It contains:
- **Enrollment**: Students linked via \`StudentProfile.batchId\`.
- **Curriculum**: Direct association with \`Subject[]\` and \`Test[]\`.
- **Status**: \`ACTIVE\`, \`ARCHIVED\`, or \`DELETED\`.

## 2. Detail View Optimization & Waterfall Elimination
Previously, navigating to \`/batches/[id]\` triggered a 6-request waterfall with \`bypassCache: true\`.
This was optimized:
1. \`api.get('/batches/:id')\` loads batch core attributes.
2. Sub-tab datasets (\`/students\`, \`/teachers\`, \`/tests\`) are fetched concurrently via Fastify's dedicated sub-routes.
3. Cache-aware SWR deduplication prevents refetching when toggling between tabs.
`);

// 12-subjects.md
writeDoc('12-subjects.md', `# Subject Catalog & Chapter Hierarchy

## 1. Hierarchy & Associations
Subjects belong directly to a Batch and represent primary academic disciplines:
\`Batch -> Subject -> Lesson -> (Video | Note | Resource | Test)\`

## 2. Duplicate Request Audit Fix
The Subject detail page (\`/subjects/[id]\`) previously triggered duplicate GET queries due to an unstable \`useEffect\` dependency on \`user?.id\` and a nested \`setTimeout\` retry loop.
- **Fix**: Removed \`bypassCache: true\` and stabilized dependency array to \`[subjectId]\`. Duplicate GET queries dropped to 0.
`);

// 13-lessons-chapters.md
writeDoc('13-lessons-chapters.md', `# Lessons & Academic Chapter Engine

## 1. Lesson Schema
Lessons represent chapters or specific topical units within a Subject:
- Title, rich description, and ordering sequence.
- Holds heterogeneous learning content: Video lectures, PDF notes, and chapter-level practice tests.

## 2. Mutation & Invalidation Behavior
When lessons are created or reordered via \`PUT /api/v1/lessons/reorder\`, the Fastify cache automatically purges tags \`curriculum\` and \`subject:<id>\`, guaranteeing instant freshness across all client browsers without full page reloads.
`);

// 14-videos.md
writeDoc('14-videos.md', `# Video Delivery & Watch Progress Engine

## 1. Video Architecture
- **Provider**: Supports direct YouTube streams (with automatic video ID and playlist detection via \`getYouTubeEmbedUrl\`) and direct HTML5 video links.
- **Watch History**: \`VideoWatchProgress\` tracks \`progressSeconds\`, \`durationSeconds\`, and \`isCompleted\` state for every student, allowing resume-on-pause across devices.
`);

// 15-video-comments-reactions.md
writeDoc('15-video-comments-reactions.md', `# Video Comments & Reactions System

## 1. Unified Reactions Architecture
- Supported Reaction Types: \`LIKE\`, \`LOVE\`, \`HELPFUL\`, \`BRAVO\`, \`CELEBRATE\`.
- Exactly 1 reaction per user per video enforced by unique constraint \`@@unique([videoId, userId])\`.
- Toggling the same reaction removes it; clicking a different reaction updates the type.
- Aggregated breakdown returned via \`GET /api/v1/videos/:id/reactions\`.

## 2. Threaded Discussions
- Comments support unlimited nested replies via \`parentId\` self-relation.
- Pinned faculty comments are sorted to the top of the discussion feed.
`);

// 16-notes-resources.md
writeDoc('16-notes-resources.md', `# Notes, Documents & Cloudflare R2 Storage

## 1. Storage Integration
- Files (PDF syllabus, lecture notes, handwritten formula sheets) are stored in Cloudflare R2.
- S3 client communicates via \`CLOUDFLARE_R2_S3_ENDPOINT\` with zero egress fees.
- Public assets are served over Cloudflare CDN (\`CLOUDFLARE_R2_PUBLIC_URL\`).
- File uploads are validated via Fastify \`storage.routes.ts\` ensuring size limit enforcement (max 25MB).
`);

// 17-tests-system.md
writeDoc('17-tests-system.md', `# Examination Platform & Assessment Engine

## 1. Test Model & Question Types
Examly test system supports complex competitive entrance formats:
- Multiple sections (e.g. Physics, Chemistry, Zoology, Botany).
- Single Correct, Multiple Correct, and Numerical value questions.
- KaTeX mathematical and chemical equations embedded directly into questions and options.
- Configurable positive marks (e.g. +4) and negative marking rates (e.g. -1).
`);

console.log('Part 1 completed.');
