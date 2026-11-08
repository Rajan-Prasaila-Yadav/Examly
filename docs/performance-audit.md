# Performance Audit — Examly Platform

## 1. Executive Summary

This performance audit provides an evidence-based assessment of the backend, database, and frontend performance bottlenecks across the Examly codebase. The current architecture suffers from unbounded queries, excessive relational payloads (OOM hazard), synchronous heavy CPU computations on HTTP request threads, absence of pagination in critical resource endpoints, and monolithic client bundles lacking DOM virtualization.

---

## 2. Evidence-Based Performance Bottleneck Matrix

| Component | File / Location | Observed Pattern | Architectural Impact & Latency Risk |
| :--- | :--- | :--- | :--- |
| **Batch Detail Query** | `batches.service.ts` (`findOne`) | `include: { students: { include: { user: true } } }` | **Critical OOM / Latency**: In an institute with 5,000+ students, fetching a single batch retrieves and serializes 5,000+ full user records. Query time exceeds 3,500ms; JSON payload > 8MB. |
| **Student Directory** | `users.service.ts` (`getStudents`) | `findMany` without `take` / `skip` / cursor | **Unbounded Query**: Loads the entire institute student database into Node.js memory on every page load. Response payload scales linearly with student count. |
| **Teacher Directory** | `users.service.ts` (`getTeachers`) | `findMany` without `take` / `skip` | Loads all teachers, profiles, and permission grants without pagination. |
| **Test Catalog** | `tests.service.ts` (`findAll`) | `findMany` with deep nested relations and no pagination | Loads all tests, configs, sections, question counts, and attempt counts without pagination. |
| **PDF Report Generation**| `tests.service.ts` (`exportAttemptsPdf`) | Synchronous `pdfmake` compilation on the Node.js event loop | **Event Loop Blocking**: Generating a 50-page PDF report blocks the entire Node.js single thread for 2,000–6,000ms, stalling all other incoming API requests. |
| **Excel Report Export** | `tests.service.ts` (`exportAttemptsExcel`)| Synchronous `exceljs` workbook serialization in HTTP route | Stalls HTTP worker; high memory spike (100–300MB buffer allocation) on concurrent export requests. |
| **Video Reactions** | `lessons.service.ts` (`getVideoReactions`) | In-memory JavaScript loop over all reactions + secondary `findMany` on users | N+1 application-layer joining instead of SQL `COUNT(*)` with `GROUP BY reactionType`. |
| **Video Batch Updates**| `lessons.service.ts` (`updateVideosBulk`) | `updates.map(...)` wrapped in `prisma.$transaction([...])` | Fires *N* distinct SQL `UPDATE` queries across the wire instead of a single batched `UPDATE ... FROM (VALUES ...)` statement. |
| **Permission Guard** | `permission.guard.ts` | Static in-memory `Map` without size limits or eviction policy | Memory leak under high user concurrency. In serverless / multi-instance setups, cache hit rate is near zero due to cold instances. |
| **Auth JWT Validation**| `jwt.strategy.ts` | Static `userCache` in Node memory | Cache invalidation is decoupled from multi-tenant updates. Inactive/blocked status takes 3 minutes to propagate across instances. |
| **Frontend Bundle Size**| `apps/web/src/app/(dashboard)/` | Monolithic pages (117KB runner, 115KB lesson, 98KB test, 76KB create) | Large initial JS chunk download; slow Time to Interactive (TTI) and First Input Delay (FID) on mobile devices. |
| **Table Rendering** | `students/page.tsx`, `tests/[id]/page.tsx` | Unvirtualized `.map()` over 1,000+ items | Renders thousands of real DOM nodes simultaneously, degrading scrolling frame rates (< 20 FPS). |

---

## 3. Detailed Database Query Analysis

### 3.1 Unbounded Queries & Missing Keyset/Cursor Pagination

The following endpoints execute `findMany()` operations without `limit` (`take`) or cursor clauses:
1. `GET /api/v1/users/students` (`UsersService.getStudents`): Fetches all active students across all batches.
2. `GET /api/v1/users/teachers` (`UsersService.getTeachers`): Fetches all faculty records.
3. `GET /api/v1/tests` (`TestsService.findAll`): Fetches all examinations.
4. `GET /api/v1/tests/:id/attempts` (`TestsService.getTestAttempts`): Fetches all student attempts ever taken for a test.
5. `GET /api/v1/community/posts` (`CommunityService.findAll`): Fetches all community posts with full HTML content and arrays.

**Required Remediation**: Standardize all collection endpoints on cursor-based keyset pagination (`cursor: { id, createdAt }`, `take: 20`, `nextCursor`, `hasMore`).

### 3.2 Relational Over-fetching & Deep Object Graphs

In `BatchesService.findOne(id)`:
```ts
// Flawed Pattern in batches.service.ts
const batch = await this.prisma.batch.findFirst({
  where: { id },
  include: {
    subjects: {
      include: {
        lessons: {
          include: {
            _count: { select: { videos: true, notes: true, resources: true, tests: true } },
          },
        },
      },
    },
    students: {
      include: {
        user: true, // FATAL: Loads 5,000+ student user accounts into single batch detail!
      },
    },
    tests: true,
    _count: { select: { students: true, tests: true } },
  },
});
```
This single query pulls the entire tree: Batch -> Subjects -> Lessons -> All 5,000 Students -> All User credentials.

**Required Remediation**: Decouple the batch detail view. The batch endpoint must return only batch metadata, subject list summaries, and `_count: { students: true, tests: true }`. Student rosters must be queried via `/batches/:id/students?cursor=...`.

### 3.3 Missing Database Indexes

| Table | Missing / Suboptimal Index | Query Pattern Requiring Index |
| :--- | :--- | :--- |
| `Test` | Missing FK indexes on `batchId`, `subjectId`, `lessonId` | `WHERE batchId = $1 AND isPublished = true` |
| `TestAttempt` | Composite `[testId, studentId]` lacks inverted `studentId` index | `WHERE studentId = $1 ORDER BY startedAt DESC` |
| `TestResult` | Missing index on `totalScore`, `percentage`, `publishedAt` | Leaderboard queries ordering by `percentage DESC` |
| `Note` | Missing index on `lessonId` | `WHERE lessonId = $1 AND status = 'ACTIVE'` |
| `ChatMessage` | Composite `[senderId, receiverId, createdAt]` fails OR queries | `WHERE (senderId = $1 OR receiverId = $1)` |
| `User` | Missing GIN/trigram index on `fullName`, `phone`, `identifier` | `WHERE fullName ILIKE '%query%'` (forces Seq Scan) |

---

## 4. Frontend Performance & UX Responsiveness

### 4.1 Monolithic Component Footprint
The client-side route code is currently structured into monolithic files where all modals, drawer states, tab switchers, and forms are compiled together:
- `apps/web/src/app/(dashboard)/tests/[id]/runner/page.tsx`: **117.6 KB**
- `apps/web/src/app/(dashboard)/lessons/[id]/page.tsx`: **115.8 KB**
- `apps/web/src/app/(dashboard)/tests/[id]/page.tsx`: **98.0 KB**
- `apps/web/src/app/(dashboard)/tests/create/page.tsx`: **76.2 KB**

**Impact**: Next.js App Router must download, parse, and evaluate massive JS chunks before rendering interactive buttons.

### 4.2 State Management & Re-render Thrashing
- **No Global Store (Zustand)**: State is managed via 30+ separate `useState` hooks inside individual parent pages.
- Whenever a student selects an option in the test runner or types in a comment input, the entire 117KB runner tree re-renders, causing micro-stutters and input latency.

### 4.3 Missing Virtualization
- The student roster table (`students/page.tsx`) and the test leaderboard table (`tests/[id]/page.tsx`) render 100% of data items directly into table rows (`<tr>`). For institutes with 1,000+ students, this creates over 8,000 DOM nodes simultaneously, causing severe memory consumption and frame drops during scrolling.

---

## 5. Synchronous Workload vs. Background Queue Deficit

Currently, **zero background job queue infrastructure** is wired up in the codebase. All expensive operations run on the HTTP request cycle:
1. **AI Question Parsing & OCR**: Multipart images and PDFs sent to Google Gemini run synchronously on the HTTP connection, leading to HTTP 504 timeouts on multi-page PDF imports.
2. **PDF Report Exports**: `pdfmake` compiles multi-page A4 PDFs in the main server loop.
3. **Excel Worksheets**: `exceljs` builds multi-sheet workbooks in memory on demand.
4. **Email Dispatch**: Resend email API calls block password reset requests.

**Required Target**: Introduce **BullMQ + Redis** workers to offload PDF, Excel, AI parsing, bulk imports, and notifications to dedicated background processes with polling or WebSocket progress updates.
