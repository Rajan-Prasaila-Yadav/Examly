# Migration Plan & NestJS Migration Matrix — Examly Platform

## 1. Executive Strategy

The transformation of Examly into an ultra-fast, zero-trust, highly responsive learning and examination platform will proceed incrementally in **21 structured phases (Phases 0 to 20)**.

To preserve stability and data integrity:
1. **No Destructive Database Rewrites**: Database schema changes will follow expand/contract patterns with backward compatibility.
2. **Dual-Stack Coexistence During Migration**: NestJS and Fastify will operate side-by-side during module migration.
3. **Zero Trust by Default**: All authentication, tenant isolation, permissions, and validations will be authoritatively checked at the backend layer.
4. **Full Test & Performance Gates**: Every phase will conclude with automated lint, typecheck, test suites, and performance benchmarking before proceeding to the next phase.

---

## 2. NestJS to Fastify Modular Migration Matrix

| # | Current NestJS Component | Target Fastify / Modular Component | Database Operations & Models | Tests Required | Status |
| :- | :--- | :--- | :--- | :--- | :--- |
| **1** | `app.module.ts`, `main.ts` | Fastify Server (`fastify`, `@fastify/cors`, `@fastify/cookie`, `@fastify/rate-limit`) | None | Server boot, health check, CORS & security header tests | **Planned (Phase 3)** |
| **2** | `AuthModule`, `AuthController`, `AuthService`, `JwtStrategy` | `modules/auth/` (Fastify plugin, Zod schemas, `@fastify/jwt`, `bcrypt`) | `User`, `UserSession`, `Role`, `StudentProfile`, `TeacherProfile` | Login, Google OAuth, Refresh, Register, Onboarding, Token Blacklist | **Planned (Phase 3)** |
| **3** | `PermissionGuard`, `@RequirePermission` | `platform/rbac/` (Fastify hook / preHandler, Redis permission cache) | `RolePermission`, `PermissionGrant`, `User` | Role checks, custom grants, tenant isolation tests | **Planned (Phase 3)** |
| **4** | `BatchesController`, `BatchesService` | `modules/catalog/batches/` (Fastify plugin, Zod DTOs, cursor pagination) | `Batch`, `Subject`, `StudentProfile` | Batch CRUD, cloning, paginated student listings | **Planned (Phase 5)** |
| **5** | `SubjectsController`, `SubjectsService` | `modules/catalog/subjects/` (Fastify plugin, Zod DTOs) | `Subject`, `Lesson` | Subject CRUD, sort reordering | **Planned (Phase 5)** |
| **6** | `LessonsController`, `LessonsService` | `modules/catalog/lessons/` (Fastify plugin, Zod DTOs) | `Lesson`, `Video`, `Note`, `ResourceNode` | Lesson CRUD, video reactions, comments, note upload | **Planned (Phase 5)** |
| **7** | `TestsController`, `TestsService` | `modules/test-engine/` (Fastify plugin, Zod DTOs, scoring engine) | `Test`, `TestConfig`, `Section`, `Question`, `QuestionOption`, `QuestionSolution` | Test creation wizard, questions bulk import, publishing lifecycle | **Planned (Phase 5)** |
| **8** | `TestsController` (Attempts / Scoring) | `modules/test-engine/attempts/` (High-concurrency submission engine) | `TestAttempt`, `AttemptAnswer`, `TestResult` | Start attempt, save answer, anti-cheat strikes, scoring, rank calculation | **Planned (Phase 13)** |
| **9** | `AiQuestionImportService` | `modules/ai-import/` (BullMQ background job worker + Gemini SDK) | None (Job queue metadata) | Multi-format parser, OCR, JSON question schema validation | **Planned (Phase 16)** |
| **10** | `StorageController`, `StorageService` | `modules/storage/` (Fastify plugin, Pre-signed R2/S3 upload generator) | None | Presigned upload URL generation, MIME validation | **Planned (Phase 9)** |
| **11** | `UsersController`, `UsersService` | `modules/users/` (Fastify plugin, Zod DTOs, cursor pagination) | `User`, `StudentProfile`, `TeacherProfile`, `PermissionGrant` | Paginated students/teachers, status toggling, CSV imports | **Planned (Phase 8)** |
| **12** | `CommunityController`, `CommunityService`| `modules/community/` (Fastify plugin, Zod DTOs) | `CommunityPost`, `BatchPoll`, `PollOption`, `PollVote`, `PostComment`, `PostReaction` | Post feeds, poll voting, reactions, threaded replies | **Planned (Phase 10)** |
| **13** | `ChatController`, `ChatGateway`, `ChatService` | `modules/chat/` (Fastify plugin + Socket.IO / WS Server + Redis adapter) | `ChatMessage` | 1-on-1 messaging, read receipts, real-time message dispatch | **Planned (Phase 10)** |
| **14** | `AuditController`, `AuditService` | `modules/system/audit/` (Fastify plugin, Async logging worker) | `AuditLog`, `Notification` | System audit trail querying, action logging | **Planned (Phase 17)** |
| **15** | PDF & Excel Export Handlers | `modules/exports/` (BullMQ async worker + S3/R2 direct link) | None (Reads via streaming cursor) | Attempts export, leaderboard export, answer-key export | **Planned (Phase 15)** |

---

## 3. Phase-by-Phase Roadmap & Complexity Estimates

```
Phase 0: Audit & Architecture Baseline [DONE]
Phase 1: Performance Baseline & Telemetry Setup (Complexity: Low)
Phase 2: Security & Authentication Hardening (Complexity: High)
Phase 3: Fastify Modular Backend Architecture (Complexity: High)
Phase 4: Database & Schema Optimization (Complexity: Medium)
Phase 5: API Ergonomics & Validation (Complexity: Medium)
Phase 6: Frontend State & Data Fetching (Complexity: High)
Phase 7: Skeletons & Layout Shift Optimization (Complexity: Medium)
Phase 8: Student & Teacher Management Views (Complexity: Medium)
Phase 9: Video Streaming & Direct Uploads (Complexity: High)
Phase 10: Comments, Reactions & Doubt Forums (Complexity: Medium)
Phase 11: Watch History & Recommendations (Complexity: Medium)
Phase 12: YouTube Import & Drag-and-Drop Ordering (Complexity: Medium)
Phase 13: Live Test Engine & Scoring Optimization (Complexity: High)
Phase 14: Server-Driven Search & Filters (Complexity: Medium)
Phase 15: Asynchronous PDF & Excel Export Workers (Complexity: High)
Phase 16: Background Job Queue (BullMQ) (Complexity: High)
Phase 17: Observability & Audit Logging (Complexity: Medium)
Phase 18: Zero-Downtime CI/CD & Deployment (Complexity: Medium)
Phase 19: Load Testing & Concurrency Validation (Complexity: High)
Phase 20: Final Security & Performance Verification (Complexity: Medium)
```

---

## 4. Comprehensive Risk Register

| Risk ID | Risk Description | Probability | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **RSK-01** | Data corruption or student score desynchronization during live test migration | Low | Critical | Dual-write validation and staging test simulator before cutover. |
| **RSK-02** | Breaking API contracts with mobile / client apps | Medium | High | Maintain route-level compatibility (`/api/v1/*`) and run comprehensive API integration tests. |
| **RSK-03** | Upstash Redis connection exhaustion under high concurrency | Medium | Medium | Implement local LRU memory layer (`lru-cache`) fallback with short TTLs and connection pooling. |
| **RSK-04** | Cloudflare R2 presigned URL signature mismatches on client direct uploads | Low | Medium | Standardize client upload helper with automated retry and MIME verification. |
| **RSK-05** | Migration downtime affecting active student examinations | Low | Critical | Implement zero-downtime rolling deployments and lock schema migrations to backward-compatible steps. |

---

## 5. Definition of Done (DoD) for Every Phase

Every phase must satisfy the following checklist before merging:
- [ ] TypeScript compilation passes with zero type errors (`tsc --noEmit`).
- [ ] ESLint rules pass with zero warnings/errors.
- [ ] 100% of unit and integration tests for modified components pass.
- [ ] Security checks confirm no authentication or permission regressions.
- [ ] Performance benchmarks demonstrate no latency or memory regressions.
- [ ] Documentation (`walkthrough.md` and relevant guides) updated.
