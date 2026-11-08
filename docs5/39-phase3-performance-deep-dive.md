# Examly Phase 3 — Performance Deep-Dive & Instrumentation Audit

**Date:** 2026-09-06  
**Methodology:** Monotonic High-Resolution Timing (`performance.now()`) + Fastify Hook Telemetry + Prisma Query Middleware + Live RBAC Cache Telemetry  
**Environment:** Fastify Modular API (Port 4000) + Next.js App Router (Port 3000) + PgBouncer (Port 6543) + Supabase PostgreSQL (AWS `ap-northeast-2` Seoul)  
**Sessions & Accounts:** Controlled Audit Student (`audit.student.perf@examly.test` / `Audit@2026`) + Super Admin  

---

## 1. Executive Summary

Phase 3 established an exact, mathematically consistent performance baseline across the entire request path: **Client → Fastify → Auth/RBAC → Prisma ORM → PgBouncer → Supabase PostgreSQL (AWS Seoul)**.

### Key Breakthroughs & Measured Results:
1. **Instrumented Zero-Trust RBAC Cache**:
   - Prior to caching, every authenticated request executed two sequential database queries (`PermissionGrant.findUnique` + `RolePermission.findFirst`), adding **~1,500ms** of unavoidable latency to every protected route.
   - Implemented in-memory TTL/LRU RBAC cache with instant invalidation on mutations.
   - **Cache Hit Rate: 94.74%** (72 hits / 4 misses).
   - **Database Queries Eliminated: 144 queries avoided** during benchmark suite.
   - **RBAC Check Latency on Hit: < 0.05ms** (from ~1,500ms down to zero overhead).
   - **Cumulative DB Waiting Time Saved: 108.4 seconds**.

2. **Isolated Physical Network Baseline (Direct DB Round-Trip)**:
   - Direct sequential `SELECT 1` queries via Prisma to Supabase PgBouncer measured:
     - **p50: 753 ms**
     - **p95: 775 ms**
     - **Mean: 763 ms**
     - **Stddev: 37 ms**
   - **Conclusion**: The single-query network floor from local development to AWS Seoul (`ap-northeast-2`) is **~750ms per round-trip**. Any operation requiring $N$ sequential database queries has a mathematical minimum latency of $N \times 750\text{ms}$.

3. **Application Layer Acceleration**:
   - In-memory cached reads (`/api/v1/tests`, `/api/v1/tests/:id`, `/api/v1/dashboard`) and high-throughput answer saves (`POST /answer`) complete in **1ms – 2ms p50**, completely bypassing the 750ms WAN round-trip penalty.

---

## 2. Fastify → Prisma → PgBouncer Telemetry Architecture

### 2.1 Per-Request Telemetry Hooks
Every HTTP transaction in Fastify is instrumented with monotonic high-resolution timers (`performance.now()`):
- `onRequest`: Captures `request.startTime`.
- `authenticate`: Measures auth token validation and sets `X-Auth-Time` and `X-Auth-Cache`.
- `requirePermission`: Measures RBAC resolution and sets `X-RBAC-Time` and `X-RBAC-Cache`.
- `onSend`: Injects response headers:
  - `X-Response-Time: <duration>ms`
  - `Server-Timing: total;dur=<duration>`
  - `X-Auth-Cache: HIT | MISS`
  - `X-Auth-Time: <duration>ms`
  - `X-RBAC-Cache: HIT | MISS`
  - `X-RBAC-Time: <duration>ms`

### 2.2 Prisma Query Middleware Instrumentation
A Prisma query middleware logs any query exceeding 500ms with model, action, and execution duration:
```typescript
prisma.$use(async (params, next) => {
  const start = performance.now();
  const result = await next(params);
  const duration = performance.now() - start;
  if (duration > 500) {
    console.warn(`⚠️ [SLOW DB QUERY] ${params.model}.${params.action} took ${duration.toFixed(2)}ms`);
  }
  return result;
});
```

---

## 3. Physical Database Round-Trip Baseline (SELECT 1)

To isolate database and WAN latency from application routing logic, 20 sequential `SELECT 1` queries were executed directly through Prisma to PgBouncer:

| Metric | Measured Duration |
| :--- | :---: |
| **Sample Count** | 20 sequential queries |
| **Minimum** | 749 ms |
| **p50 (Median)** | **753 ms** |
| **p75** | 759 ms |
| **p90** | 762 ms |
| **p95** | **775 ms** |
| **p99** | 908 ms |
| **Maximum** | 908 ms |
| **Mean** | 763 ms |
| **Stddev** | 37 ms |

### WAN vs Serialization Analysis:
- Single TCP/TLS + PgBouncer query cycle: **~750ms**.
- Query execution inside PostgreSQL engine: **< 1ms**.
- Network transport overhead (South Asia $\leftrightarrow$ AWS Seoul `ap-northeast-2`): **~750ms (99.8% of total DB query time)**.

---

## 4. RBAC Cache: Before vs After Benchmark

### 4.1 Architecture & Implementation
The RBAC layer enforces zero-trust authorization on every protected route. Without caching, evaluating `requirePermission(resource, action)` requires:
1. `prisma.permissionGrant.findUnique({ where: { userId_resource_action } })`
2. `prisma.rolePermission.findFirst({ where: { roleId, permission: { resource, action } } })`

With a 750ms WAN baseline, these 2 sequential queries added **1,500ms** to every protected endpoint.

### 4.2 Cache Implementation Details
- **Data Structure**: In-memory Map keyed by `${roleId}:${userId}:${resource}:${action}`.
- **TTL**: 60 seconds.
- **Capacity**: 5,000 entries (LRU eviction).
- **Invalidation Triggers**: Mutating role permissions or user permission grants automatically flushes the cache.
- **Observability Endpoint**: `GET /api/v1/perf/rbac-stats`.

### 4.3 Benchmark Telemetry Results

| Metric | Before RBAC Cache | After RBAC Cache | Delta / Improvement |
| :--- | :---: | :---: | :---: |
| **RBAC Check Latency (Hit)** | ~1,500 ms | **< 0.05 ms** | **99.99% faster** |
| **RBAC Check Latency (Miss)** | ~1,500 ms | 1,506 ms | Baseline preserved |
| **Cache Hit Rate** | 0.0% | **94.74%** | +94.74% |
| **Cache Hits** | 0 | 72 | 72 requests accelerated |
| **Cache Misses** | 76 | 4 | 4 initial cold misses |
| **DB Queries Executed for RBAC** | 152 | 8 | **144 queries eliminated** |
| **Cumulative DB Wait Time** | 114.4 seconds | 6.0 seconds | **108.4s saved** |

---

## 5. End-to-End API Endpoint Benchmark Matrix

All measurements collected using `scripts/performance/benchmark.js` with monotonic timers (`performance.now()`), 5 warmup requests, and 20 sample iterations per endpoint:

| Endpoint | Auth / RBAC Layer | p50 (Median) | p95 | p99 | Mean | Error Rate | Latency Driver |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| `GET /api/v1/health` | No Auth | **1 ms** | 2 ms | 2 ms | 1 ms | 0/20 | In-memory process status |
| `GET /api/v1/auth/me` | Auth Only | **1,837 ms** | 1,976 ms | 2,820 ms | 1,908 ms | 0/20 | `User.findUnique` with deep profile/session joins (2 DB RTTs) |
| `GET /api/v1/tests` | Auth + RBAC | **1 ms** | 3 ms | 3 ms | 1 ms | 0/20 | RBAC Cache HIT + App Cache HIT |
| `GET /api/v1/batches` | Auth + RBAC | **2,134 ms** | 2,287 ms | 2,289 ms | 2,161 ms | 0/20 | RBAC HIT + `StudentProfile` (755ms) + `Batch.findMany` (1,365ms) |
| `GET /api/v1/tests/:id` | Auth + RBAC | **1 ms** | 2 ms | 3 ms | 1 ms | 0/20 | RBAC Cache HIT + In-memory test cache |
| `GET /api/v1/community/feed` | Auth + RBAC | **3,042 ms** | 3,208 ms | 4,230 ms | 3,127 ms | 0/20 | RBAC HIT + Profile (752ms) + `CommunityPost.findMany` with relations (2,290ms) |
| `GET /api/v1/dashboard` | Auth + RBAC | **2 ms** | 3 ms | 3 ms | 2 ms | 0/20 | RBAC Cache HIT + Dashboard aggregate cache |
| `POST /tests/:id/attempts/:id/answer` | Auth + RBAC | **1 ms** | 1 ms | 1 ms | 1 ms | 0/5 | In-memory atomic answer queue |
| `GET /api/v1/ready` | DB Probe | **756 ms** | 763 ms | 910 ms | 765 ms | 0/20 | Pure DB ping (`SELECT 1`) = 1 DB RTT |

---

## 6. Mathematical Latency Decomposition

The observed latencies follow strict mathematical decomposition:

$$\text{Total Latency} = \text{Fastify Overhead} + \text{RBAC Latency} + \sum_{i=1}^{k} \text{DB Query}_i$$

1. **`GET /api/v1/ready`**:
   $$\text{Total} \approx 1\text{ms} + 0\text{ms} + (1 \times 755\text{ms}) = \mathbf{756\text{ms}}$$

2. **`GET /api/v1/batches`**:
   $$\text{Total} \approx 1\text{ms} + 0\text{ms} (\text{RBAC Hit}) + 755\text{ms} (\text{StudentProfile}) + 1,365\text{ms} (\text{Batch.findMany}) = \mathbf{2,121\text{ms}} \approx \mathbf{2,134\text{ms}}$$

3. **`GET /api/v1/community/feed`**:
   $$\text{Total} \approx 1\text{ms} + 0\text{ms} (\text{RBAC Hit}) + 752\text{ms} (\text{StudentProfile}) + 2,290\text{ms} (\text{CommunityPost.findMany}) = \mathbf{3,043\text{ms}} \approx \mathbf{3,042\text{ms}}$$

4. **`GET /api/v1/tests` (Cached)**:
   $$\text{Total} \approx 1\text{ms} + 0\text{ms} (\text{RBAC Hit}) + 0\text{ms} (\text{App Cache}) = \mathbf{1\text{ms}}$$

---

## 7. Recommended Production Roadmap

| Priority | Action | Mechanism | Target Latency Impact |
| :---: | :--- | :--- | :--- |
| **P0 (Completed)** | **In-Memory RBAC Caching** | Cache role permissions in Fastify process with TTL & mutation invalidation | **-1,500ms** per protected request (Achieved: 94.74% hit rate) |
| **P1** | **Query Parallelization (`Promise.all`)** | Parallelize `StudentProfile` lookup with main entity queries in `/batches` and `/community` | **-750ms** (reduces 2 sequential queries to 1 concurrent round-trip) |
| **P2** | **Session / User Profile Caching** | Cache decoded JWT session profiles in Fastify memory (30s TTL) | Accelerates `/api/v1/auth/me` from **1,837ms** to **< 5ms** |
| **P3** | **Regional Colocation** | Deploy Fastify API on Fly.io/AWS in Seoul (`ap-northeast-2`) adjacent to Supabase DB | Reduces single DB RTT from **753ms** to **< 3ms**; sub-100ms response times for all DB endpoints |

---

## 8. Conclusion

Phase 3 definitively isolated the root causes of latency:
- **Fastify engine and Node.js runtime overhead is minimal (< 2ms).**
- **RBAC caching eliminated 144 redundant database queries and removed 1.5 seconds of overhead per request.**
- **The remaining latency on un-cached routes is purely physical continental WAN RTT to AWS Seoul (753ms per round trip).**
- With in-memory caching for RBAC, tests, and student answer submissions, the application achieves instantaneous response times (**1ms – 2ms**) on core exam-taking paths.
