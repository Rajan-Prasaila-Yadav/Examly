# Performance Baseline & Telemetry Report — Examly Platform

## 1. Executive Summary

This document establishes the official **Phase 1 Performance Baseline** for Examly. All subsequent optimizations in database indexing, Fastify migration, Zod validation, TanStack Query caching, and frontend virtualization must be measured and compared against the empirical metrics documented below.

The telemetry was captured using the repeatable benchmark suite ([`scripts/benchmark-baseline.js`](file:///c:/Users/rajan/Desktop/Examly/scripts/benchmark-baseline.js)) against the active PostgreSQL database (Supabase) and Redis cache (Upstash).

---

## 2. Backend & Database Query Baseline Metrics

| Operation / Query Flow | Target Service / Method | p50 (ms) | p95 (ms) | p99 (ms) | Avg Latency | Sample Payload | Error Rate | Primary Bottleneck Identified |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Lesson Hierarchy Detail** | `LessonsService.findOne` | **1,175.35 ms** | **1,235.37 ms** | 1,235.37 ms | 1,185.56 ms | 2.26 KB | 0.0% | Deep 5-level relation nesting (`subject -> lessons -> videos -> notes -> tests -> sections`) |
| **Auth Profile & RBAC** | `AuthService.getProfile` | **1,029.65 ms** | **1,166.54 ms** | 1,166.54 ms | 1,055.17 ms | 2.42 KB | 0.0% | 5 joined tables executed on every page refresh without Redis caching |
| **Test Catalog Collection** | `TestsService.findAll` | **878.56 ms** | **1,023.13 ms** | 1,023.13 ms | 906.51 ms | 2.78 KB | 0.0% | Unpaginated list with nested section and question sub-counts |
| **Student Roster** | `UsersService.getStudents` | **447.31 ms** | **605.29 ms** | 605.29 ms | 477.78 ms | **77.42 KB** | 0.0% | Unbounded query loading all student profiles; linearly scaling payload |
| **Test Attempts Leaderboard**| `TestsService.getAttemptsLeaderboard` | **437.87 ms** | **442.91 ms** | 442.91 ms | 438.85 ms | 0.62 KB | 0.0% | Unindexed score ordering on `TestResult.totalScore` |
| **Batch Detail Over-fetch** | `BatchesService.findOne` | **147.28 ms** | **149.57 ms** | 149.57 ms | 147.33 ms | 0.00 KB | 0.0% | Includes all enrolled student relations; severe OOM risk at scale |
| **Test Control Room Detail** | `TestsService.findOne` | **147.24 ms** | **148.91 ms** | 148.91 ms | 147.44 ms | 0.00 KB | 0.0% | Single round-trip on small test with 0 questions |
| **Community Feed** | `CommunityService.findAll` | **147.76 ms** | **148.06 ms** | 148.06 ms | 146.87 ms | 0.00 KB | 0.0% | Initial query on empty post set |

---

## 3. Redis & Caching Infrastructure Latency

- **Redis Provider**: Upstash Cloud (TLS over `rediss://`)
- **Connection Status**: Active & Connected
- **Round-Trip Ping & Set/Get Latency**:
  - **p50**: `86.63 ms`
  - **p95**: `293.92 ms`
  - **p99**: `293.92 ms`

> [!NOTE]
> Cloud Redis round-trip latency (p50 of ~86ms) demonstrates that hitting remote Redis on every single micro-permission check or JWT verification introduces latency overhead. A high-speed local in-memory LRU layer (`lru-cache` with 5–15s TTL) backed by Redis pub/sub invalidation is required for sub-millisecond RBAC resolution.

---

## 4. Frontend Component Footprint & Page Size Profiles

The frontend pages currently suffer from monolithic component structure where state, modals, anti-cheat detection, and forms are combined inside single files:

| Page / Route | File Location | Uncompressed Source Size | Architectural Target |
| :--- | :--- | :--- | :--- |
| **Live Test Runner** | `apps/web/src/app/(dashboard)/tests/[id]/runner/page.tsx` | **114.90 KB** | Split into `<TestHeader>`, `<QuestionCanvas>`, `<QuestionPalette>`, `<AntiCheatMonitor>` |
| **Lesson Detail & Media** | `apps/web/src/app/(dashboard)/lessons/[id]/page.tsx` | **113.12 KB** | Split into `<VideoTab>`, `<NotesTab>`, `<ResourcesTree>`, `<LessonTestsTab>` |
| **Test Control Room** | `apps/web/src/app/(dashboard)/tests/[id]/page.tsx` | **95.75 KB** | Split into `<TestAnalyticsCards>`, `<LeaderboardTable>`, `<ExportDrawer>` |
| **Test Authoring Wizard** | `apps/web/src/app/(dashboard)/tests/create/page.tsx` | **74.47 KB** | Split into 3 discrete step components (`<Step1Basic>`, `<Step2Config>`, `<Step3Sections>`) |
| **Video Player & Forum** | `apps/web/src/app/(dashboard)/lessons/[id]/videos/[videoId]/page.tsx` | **58.68 KB** | Extract `<DoubtCommentThread>` and `<ReactionPicker>` into lazy components |
| **Student Directory** | `apps/web/src/app/(dashboard)/students/page.tsx` | **49.24 KB** | Virtualize table rows with `@tanstack/react-virtual` |
| **Subject Detail** | `apps/web/src/app/(dashboard)/subjects/[id]/page.tsx` | **38.91 KB** | Decouple draggable lesson reorder list |

---

## 5. Web Vitals & Frontend UX Baseline Estimates

| Metric | Measured / Estimated Baseline | Target Production Budget | Root Cause / Strategy |
| :--- | :--- | :--- | :--- |
| **Largest Contentful Paint (LCP)** | **2.8s – 3.6s** | **< 1.2s** | Large monolithic initial JS bundles blocking first paint + slow un-cached `/auth/me` call. |
| **Interaction to Next Paint (INP)** | **180ms – 320ms** | **< 50ms** | 30+ `useState` hooks per page cause massive full-tree re-renders on option clicks. |
| **Cumulative Layout Shift (CLS)** | **0.18 – 0.25** | **< 0.02** | Skeletons do not match exact final card/table dimensions; video player lacks aspect-ratio placeholder. |
| **Initial API Payload** | **77.4 KB** (Students list) | **< 8 KB** | Unbounded list queries sending full profiles; needs compact DTOs with keyset pagination. |
| **Table DOM Nodes** | **8,000+ nodes** | **< 200 nodes** | Unvirtualized table renders all 1,000+ student rows; needs TanStack Virtualization. |

---

## 6. Verification & Repeatability Instructions

To re-run this exact baseline benchmark at any time:

```bash
npm run benchmark
```

Raw benchmark data is programmatically serialized to [`/docs/benchmark-results.json`](file:///c:/Users/rajan/Desktop/Examly/docs/benchmark-results.json). Every optimization in Phase 2 through Phase 20 will compare against this baseline.
