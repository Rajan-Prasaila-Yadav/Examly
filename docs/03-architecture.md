# 03 — System Architecture & Security Flows

## 3.1 High-Level System Architecture

Examly is designed with a **Zero-Trust Frontend** philosophy. The mobile and web frontends adapt their UI based on the user's role and permission grants, but **every API request is re-authenticated and verified server-side**.

```
[Flutter Mobile App] (iOS / Android)     [Next.js Web Admin] (Desktop Browser)
           │                                          │
           └──────────────────┬───────────────────────┘
                              │ HTTPS / JSON / WebSockets
                              ▼
            ┌───────────────────────────────────┐
            │       Nginx / Cloudflare Edge     │
            │   (SSL Termination & Rate Limit)  │
            └─────────────────┬─────────────────┘
                              │
                              ▼
            ┌───────────────────────────────────┐
            │          NestJS Gateway           │
            │  Global ValidationPipe & CORS     │
            └─────────────────┬─────────────────┘
                              │
                              ▼
            ┌───────────────────────────────────┐
            │        Security Pipeline          │
            │  1. JwtAuthGuard (Verify Token)   │
            │  2. TenantGuard (Check Institute) │
            │  3. RoleGuard (Verify Active Role)│
            │  4. PermissionGuard (Check Action)│
            └─────────────────┬─────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
│   Auth Module     │ │  Catalog Module   │ │    Test Module    │
│  - Login / Tokens │ │  - Batches/Topics │ │  - Wizard / Engine│
│  - Multi-session  │ │  - Videos & Notes │ │  - Live Scoring   │
│  - Block & Purge  │ │  - Master Cloning │ │  - Leaderboards   │
└─────────┬─────────┘ └─────────┬─────────┘ └─────────┬─────────┘
          │                     │                     │
          └─────────────────────┼─────────────────────┘
                                │
                                ▼
            ┌───────────────────────────────────┐
            │     Prisma Service (PostgreSQL)   │
            │   - Row-level multi-tenancy       │
            │   - Soft-delete filter extension  │
            │   - Auto Audit Logging            │
            └───────────────────────────────────┘
```

---

## 3.2 Security Pipeline & Dynamic RBAC Guard Chain

Every incoming HTTP request traverses a 4-layer validation pipeline before executing controller logic:

```
Incoming Request
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. JwtAuthGuard                                             │
│    - Extracts Bearer JWT from Authorization Header.         │
│    - Decodes token, validates expiration & signature.       │
│    - Checks Redis blacklist to ensure token not revoked.    │
└──────────────────────────────┬──────────────────────────────┘
                               │ Valid
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. TenantIsolationGuard                                     │
│    - Extracts `instituteId` from JWT payload.               │
│    - Verifies institute is ACTIVE and not suspended.        │
│    - Injects tenant context into Prisma query scope.        │
└──────────────────────────────┬──────────────────────────────┘
                               │ Verified
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. UserStatusGuard                                          │
│    - Validates user `status === ACTIVE`.                    │
│    - If `BLOCKED` or `LOCKED`, immediately returns 403      │
│      Forbidden and revokes active session in Redis.         │
└──────────────────────────────┬──────────────────────────────┘
                               │ Active
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. PermissionGuard (@RequirePermission('resource', 'action')│
│    - Resolves user's effective permissions:                 │
│      Base Role Permissions + User Custom Permission Grants  │
│    - Evaluates: Does user possess permission for target     │
│      resource in requested scope (INSTITUTE / ASSIGNED)?    │
└──────────────────────────────┬──────────────────────────────┘
                               │ Authorized
                               ▼
                   [ Execute Controller Method ]
```

---

## 3.3 Multi-Tenant Row-Level Data Isolation

Examly achieves strict logical data separation across multiple institutes using a single PostgreSQL database via **Tenant Scoping**:

1. **Foreign Key Attachment:** Every major entity (`Batch`, `Subject`, `Lesson`, `Test`, `User`, `Question`) contains an `instituteId` column.
2. **Prisma Client Extension:** A centralized Prisma middleware automatically injects `{ where: { instituteId: currentTenantId, status: { not: 'DELETED' } } }` on all `findMany`, `findFirst`, `update`, and `delete` operations.
3. **Super Admin Bypass:** Super Admin requests bypass institute scoping to view cross-tenant system metrics and tenant billing.

---

## 3.4 Live Test Lifecycle & Concurrency Flow

The Live Examination engine is built to guarantee fairness, server-authoritative timings, and high-concurrency resilience:

```
[ Student Mobile App ]                                        [ NestJS Test Server ]
          │                                                             │
          │ 1. POST /tests/:id/start-attempt                            │
          ├────────────────────────────────────────────────────────────►│
          │                                                             │ 2. Calculates real time:
          │                                                             │    min(duration, endTime - now)
          │                                                             │ 3. Creates `TestAttempt` in DB
          │                                                             │ 4. Caches state in Redis
          │ 5. Returns Questions (options shuffled per student)         │
          │◄────────────────────────────────────────────────────────────┤
          │                                                             │
          │ 6. POST /tests/attempts/:id/answer (Save question choice)   │
          ├────────────────────────────────────────────────────────────►│ 7. Upserts `AttemptAnswer`
          │                                                             │    in Redis + Batched DB sync
          │ 8. Ack (200 OK)                                             │
          │◄────────────────────────────────────────────────────────────┤
          │                                                             │
          │ 9. POST /tests/attempts/:id/submit OR Timer Expiry          │
          ├────────────────────────────────────────────────────────────►│
          │                                                             │ 10. Computes final score
          │                                                             │ 11. Stores `TestResult`
          │                                                             │ 12. Updates Redis Leaderboard
          │ 13. Returns Submission Confirmation & Summary               │
          │◄────────────────────────────────────────────────────────────┤
```
