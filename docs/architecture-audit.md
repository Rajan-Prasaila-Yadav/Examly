# Architecture Audit — Examly Platform

## 1. Executive Summary & System Overview

Examly is an educational and live examination platform designed for multi-tenant institutes, educators, and students. The platform encompasses curriculum delivery (batches, subjects, lessons, video streaming, downloadable notes, hierarchical resources), real-time examination engines with anti-cheat enforcement, automated scoring with multi-variant question types, student analytics, answer-key review, PDF/Excel reporting, community announcements, doubt forums, and direct chat.

This audit evaluates the codebase across architecture, security, performance, data layer, API ergonomics, and developer velocity.

---

## 2. Current Architectural Topology

```
                                  +------------------------------+
                                  |    Web Client (Next.js 14)   |
                                  |     (React 18 / Tailwind)    |
                                  +--------------+---------------+
                                                 |
                                     Axios + Bearer Token
                                                 |
                                                 v
                       +---------------------------------------------------+
                       |              Edge / Vercel Serverless             |
                       |       (api/index.ts -> Express -> NestJS)         |
                       +-------------------------+-------------------------+
                                                 |
                   +-----------------------------+-----------------------------+
                   |                             |                             |
                   v                             v                             v
       +-----------------------+     +-----------------------+     +-----------------------+
       |   NestJS HTTP API     |     |   Upstash Redis       |     |  Cloudflare R2 /      |
       |  (Express Platform)   |     |   (CacheService)      |     |  Supabase Storage     |
       +-----------+-----------+     +-----------------------+     +-----------------------+
                   |
                   v
       +-----------------------+
       |   Prisma ORM Client   |
       +-----------+-----------+
                   |
                   v
       +-----------------------+
       | PostgreSQL (Supabase) |
       |  Connection Pooler    |
       +-----------------------+
```

---

## 3. Technology Stack Inventory

| Component Layer | Technology Currently In Use | Target / Recommended Modern Stack |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js 14.2.24 (App Router), React 18.3.1 | Next.js 14 App Router / Vite React SPA + Fastify proxy |
| **Styling & Icons** | TailwindCSS 3.4.17, Lucide React 0.475.0, KaTeX 0.16.21 | TailwindCSS / Vanilla CSS tokens + Lucide |
| **Frontend State** | Monolithic `useState` in page components (no global store) | Zustand (UI state) + TanStack Query (Server Cache) |
| **Frontend Data Fetching** | Custom Axios wrapper with in-memory SWR cache (`api.ts`) | TanStack Query v5 + deduplication + optimistic mutations |
| **Backend Framework** | NestJS 10.4.15 on `@nestjs/platform-express` | Node.js + TypeScript + Fastify + Modular Plugin Structure |
| **Validation Layer** | `class-validator` + `class-transformer` (inconsistent DTO coverage) | Zod (Authoritative backend schemas + client type-sharing) |
| **Database & ORM** | Prisma 5.17.0 (Multi-file schemas with preview folder) | PostgreSQL 16 + Drizzle ORM / High-efficiency Typed SQL |
| **Database Provider** | Supabase Managed PostgreSQL (Session pooler on port 6543) | PostgreSQL + PgBouncer connection pooling |
| **Caching Layer** | Upstash Redis via `ioredis` + Unbounded static Node Maps | Redis Cluster / Upstash + LRU Memory Cache (lru-cache) |
| **Background Jobs** | **None** (Exports, AI parsing, batch updates run synchronously) | BullMQ + Redis for async worker queues |
| **Object Storage** | Cloudflare R2 (`@aws-sdk/client-s3`) / Supabase Storage | Cloudflare R2 / AWS S3 with Pre-signed Direct Upload URLs |
| **Realtime / WebSockets**| Socket.IO (`@nestjs/platform-socket.io`) | Socket.IO / WS Server + Redis Adapter for horizontal scale |
| **Email Service** | Resend API (`resend` SDK) | Resend / Amazon SES via background queue |
| **AI Integration** | Google Gemini (`@google/genai` / REST) | Gemini 2.5 Flash via background queue |
| **Testing** | **0% Coverage** (No Jest, Vitest, Playwright, or Supertest) | Vitest (Unit/Integration) + Playwright (E2E & Security) |

---

## 4. Backend Module & Controller Topology

The NestJS backend in `apps/api/src/modules/` is organized into 10 modules:

```
apps/api/src/
├── app.module.ts              # Root module importing all 10 feature modules + Throttler
├── main.ts                    # NestJS standalone bootstrap (Express, Swagger, CORS, ValidationPipe)
├── common/
│   └── interceptors/
│       └── logging.interceptor.ts
├── platform/
│   └── rbac/
│       ├── decorators/
│       │   ├── current-user.decorator.ts
│       │   └── require-permission.decorator.ts
│       └── guards/
│           └── permission.guard.ts
└── modules/
    ├── auth/                  # Login, Google OAuth, Refresh, Register, Onboarding, Forgot/Reset
    ├── cache/                 # Redis + Local Map caching wrapper
    ├── catalog/               # Batches, Subjects, Lessons, Notes, Resources, Video Reactions/Comments
    ├── chat/                  # 1-on-1 student-teacher doubt messaging + Socket.IO gateway
    ├── community/             # Posts, Polls, Poll Votes, Post Reactions & Comments
    ├── prisma/                # PrismaClient singleton wrapper
    ├── storage/               # Presigned URLs for Cloudflare R2 & Supabase Storage
    ├── system/                # Audit logs controller & notification service
    ├── test-engine/           # Live tests, questions, AI question parser, attempts, results, PDF/Excel
    └── users/                 # Student and Teacher management, profile updates, status toggles
```

---

## 5. Route & Screen Inventory

### 5.1 Backend REST API Endpoints (Mapped)

| HTTP Method | Route | Module | Permissions Guarded | Notes / Bottlenecks |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Auth | Public | Throttled (120 req/min). Single device policy check. |
| `POST` | `/api/v1/auth/google` | Auth | Public | **Critical Security Flaw**: Insecure JWT decoding fallback. |
| `POST` | `/api/v1/auth/refresh` | Auth | Public | Session hash verification missing. |
| `POST` | `/api/v1/auth/register` | Auth | Public | Unvalidated role assignment vulnerability (`dto: any`). |
| `POST` | `/api/v1/auth/forgot-password`| Auth | Public | Resend email dispatch. |
| `POST` | `/api/v1/auth/reset-password` | Auth | Public | JWT-based reset. |
| `GET` | `/api/v1/auth/me` | Auth | JWT Authenticated | Uncached database load + relation nesting. |
| `POST` | `/api/v1/auth/onboarding` | Auth | JWT Authenticated | `dto: any` allows arbitrary batch and roll overrides. |
| `GET` | `/api/v1/batches` | Catalog | `batches.read` | No pagination; loads all subjects & counts. |
| `GET` | `/api/v1/batches/:id` | Catalog | `batches.read` | **Severe N+1/OOM risk**: Loads all 5,000+ enrolled students. |
| `POST` | `/api/v1/batches` | Catalog | `batches.create` | Admin only. |
| `PUT` | `/api/v1/batches/:id` | Catalog | `batches.update` | Admin only. |
| `DELETE`| `/api/v1/batches/:id` | Catalog | `batches.delete` | Soft deletes batch. |
| `GET` | `/api/v1/subjects` | Catalog | `subjects.read` | Filters by `batchId`. |
| `GET` | `/api/v1/lessons/:id` | Catalog | `lessons.read` | Massive payload: includes videos, notes, tests, resources. |
| `POST` | `/api/v1/lessons/:id/videos` | Catalog | `videos.create` | Adds video metadata. |
| `GET` | `/api/v1/lessons/videos/:id/reactions`| Catalog| `videos.read` | Inefficient in-memory array filtering. |
| `GET` | `/api/v1/tests` | TestEngine | `tests.read` | Unpaginated list of tests with deep counts. |
| `GET` | `/api/v1/tests/:id` | TestEngine | `tests.read` | Loads all sections, questions, options, solutions. |
| `POST` | `/api/v1/tests` | TestEngine | `tests.create` | Heavy multi-level relational creation. |
| `POST` | `/api/v1/tests/:id/start` | TestEngine | `tests.take` | Starts or resumes student test attempt. |
| `POST` | `/api/v1/tests/attempts/:id/answer` | TestEngine | `tests.take` | Saves question answer choice. |
| `POST` | `/api/v1/tests/attempts/:id/submit` | TestEngine | `tests.take` | Calculates scores and ranks synchronously. |
| `GET` | `/api/v1/tests/:id/export/attempts/pdf` | TestEngine | `tests.read` | **Synchronous heavy CPU blocking** in HTTP thread. |
| `GET` | `/api/v1/tests/:id/export/leaderboard/excel`| TestEngine| `tests.read`| **Synchronous Excel generation** in HTTP thread. |
| `GET` | `/api/v1/users/students` | Users | `students.read` | **No pagination**; loads entire institute student base. |
| `GET` | `/api/v1/users/teachers` | Users | `teachers.read` | **No pagination**; loads all teacher profiles. |
| `GET` | `/api/v1/community/posts` | Community | `community.read`| Loads posts, poll options, comments, reactions. |
| `GET` | `/api/v1/chat/messages/:partnerId` | Chat | Authenticated | 1-on-1 message retrieval. |
| `GET` | `/api/v1/audit` | System | `settings.manage` | Audit trail querying. |

### 5.2 Frontend Web Routes (Mapped)

| Route Path | Type | State & Size | Description |
| :--- | :--- | :--- | :--- |
| `/(auth)/login` | Client Page | 18KB | Multi-credential login (ID, email, phone) + Google Sign-In |
| `/(auth)/signup` | Client Page | 14KB | Student onboarding registration |
| `/(auth)/forgot-password` | Client Page | 9KB | Reset password request & confirmation |
| `/(dashboard)` | Client Page | 21KB | Role-adaptive dashboard with quick metrics, charts, tests |
| `/(dashboard)/batches` | Client Page | 25KB | Batch grid, creation modal, filter, institute statistics |
| `/(dashboard)/batches/[id]` | Client Page | 32KB | Batch hierarchy view (subjects, lessons, student enrollments) |
| `/(dashboard)/curriculum` | Client Page | 6KB | High-level curriculum tree selector |
| `/(dashboard)/subjects` | Client Page | 15KB | Subject management list |
| `/(dashboard)/subjects/[id]` | Client Page | 40KB | Subject detail with draggable lesson reordering |
| `/(dashboard)/lessons/[id]` | Client Page | **115KB** | Massive monolithic component: video tabs, notes, resources, tests |
| `/(dashboard)/lessons/[id]/videos/[videoId]`| Client Page | **60KB** | Custom video player, doubt comments, reactions, quality selector |
| `/(dashboard)/tests` | Client Page | 28KB | Test catalog (Live, Scheduled, Draft, Closed) with filters |
| `/(dashboard)/tests/create` | Client Page | **76KB** | 3-step test authoring wizard with timepicker, marks calculation |
| `/(dashboard)/tests/builder` | Client Page | 37KB | Interactive question authoring canvas with KaTeX preview |
| `/(dashboard)/tests/[id]` | Client Page | **98KB** | Test control room: analytics, leaderboard, student attempt table, exports |
| `/(dashboard)/tests/[id]/runner` | Client Page | **117KB** | Live examination runner with anti-cheat monitor, timer, palette |
| `/(dashboard)/students` | Client Page | **50KB** | Student table, CSV import, status toggles, batch filter |
| `/(dashboard)/students/[id]` | Client Page | 23KB | Individual student performance scorecard & attempt logs |
| `/(dashboard)/teachers` | Client Page | 32KB | Faculty roster with custom permission override drawer |
| `/(dashboard)/community` | Client Page | 12KB | Announcements feed, batch polls, interactive reactions |
| `/(dashboard)/settings/audit` | Client Page | 11KB | System security and audit logs viewer |
| `/(dashboard)/settings/roles` | Client Page | 8KB | Role and granular permission matrix |

---

## 6. Structural & Code Duplication Findings

1. **Massive Monolithic Page Components**:
   - `tests/[id]/runner/page.tsx` (117KB), `lessons/[id]/page.tsx` (115KB), `tests/[id]/page.tsx` (98KB), `tests/create/page.tsx` (76KB).
   - In each of these pages, modal definitions, form states, table layouts, math renderers, audio sound generators, anti-cheat detection, and API client calls are bundled inside a single file with 30+ separate `useState` hooks.
2. **Duplicated Formatting & KaTeX Parsers**:
   - Math equations and LaTeX formatting logic are duplicated between `render-math.tsx`, `tests/builder/page.tsx`, `tests/[id]/runner/page.tsx`, and `lessons/[id]/page.tsx`.
3. **Repeated Query Parameter Parsing & Normalization**:
   - Every list page independently implements search debounce, status filter arrays, and date formatting instead of using reusable hooks (`useSearchFilter`, `usePagination`).
4. **Duplicate Role Normalization Logic**:
   - Role conversion (`rawUser.role.code || rawUser.role.name || rawUser.role`) is repeated across `auth-context.tsx`, `sidebar.tsx`, `navbar.tsx`, and all individual dashboard pages.
