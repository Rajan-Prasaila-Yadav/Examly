# EXAMLY — PHASE 17: FAST, SAFE PRODUCTION DEPLOYMENT GUIDE

**Author:** Antigravity Lead DevOps & Systems Architect  
**Date:** September 1, 2026  
**Status:** **PHASE 17 COMPLETE — ZERO-DOWNTIME CI/CD PIPELINE, HEALTH PROBES & DEPLOYMENT ARCHITECTURE DEPLOYED**  
**Target:** Production CI/CD (`.github/workflows/production-deploy.yml`, `scripts/smoke-test.js`, `apps/api/src/fastify/routes/system.routes.ts`)

---

## 1. Executive Summary

Phase 17 established a zero-downtime production deployment lifecycle, automated multi-stage CI/CD validation gates, Kubernetes-ready readiness/liveness probes, and rollback procedures.

Key architecture highlights:
1. **Multi-Stage Quality Gates:** CI runs typecheck, schema validation, zero-trust security checks (`5/5 passed`), API/Web builds, and automated smoke test injection before granting deployment authorization.
2. **Deep Health & Readiness Probes:**
   - `GET /api/v1/health`: Basic uptime and server engine metadata.
   - `GET /api/v1/ready`: Deep readiness probe executing `SELECT 1` against PostgreSQL pool to ensure connection readiness before load balancer traffic routing.
   - `GET /api/v1/live`: Liveness probe reporting heap memory allocation and runtime responsiveness.
3. **Graceful Shutdown & Connection Draining:** Fastify `onClose` hooks cleanly drain active HTTP connections, flush in-memory buffers, and disconnect Redis/BullMQ worker pools without dropping in-flight requests.
4. **Direct CDN Media Architecture:** Static assets and videos bypass the Node.js API server entirely, streaming via Cloudflare CDN and presigned cloud storage URLs.

---

## 2. Production CI/CD Pipeline Flow

```mermaid
graph TD
    Push[Git Push to main / PR] --> Validate[Stage 1: Validation & Security]
    Validate --> Lint[Lint & Typecheck]
    Validate --> SecTest[Zero-Trust Security Suite (5/5)]
    Validate --> DBCheck[Prisma Schema Validation]

    Lint & SecTest & DBCheck --> Build[Stage 2: Artifact Compilation]
    Build --> FastifyBuild[Build Fastify API]
    Build --> WebBuild[Build Next.js Frontend Bundle]

    FastifyBuild & WebBuild --> Smoke[Stage 3: Automated Smoke Tests]
    Smoke --> Probes[Run scripts/smoke-test.js (5/5 Probes Passed)]

    Probes --> Deploy[Stage 4: Zero-Downtime Rolling Deployment]
    Deploy --> Edge[Deploy Web to Cloudflare CDN]
    Deploy --> Rolling[Rolling Update of API Container Pods]
    Rolling --> HealthGate{Readiness /ready Passes?}
    HealthGate -->|Yes| TrafficSwitch[Route 100% Production Traffic]
    HealthGate -->|No| AutoRollback[Trigger Instant Container Rollback]
```

---

## 3. Deployment Health Probes

| Endpoint | Purpose | Target / Metric | Failure Action |
| :--- | :--- | :--- | :--- |
| `/api/v1/health` | Process Status | Status 200, Uptime | Container restarted if non-responsive |
| `/api/v1/ready` | Traffic Readiness | PostgreSQL `SELECT 1` query | Pod removed from load balancer rotation |
| `/api/v1/live` | Memory Liveness | Status 200, Heap Memory < 1GB | Container recycled if memory threshold exceeded |

---

## 4. Verification & Smoke Test Status

```bash
$ node scripts/smoke-test.js
====================================================
  EXAMLY PRODUCTION DEPLOYMENT SMOKE TEST RUNNER   
====================================================

[PASS] Public Health Check                           | Status: 200 | Latency: 28.99ms
[PASS] API v1 Health Probe                           | Status: 200 | Latency: 0.85ms
[PASS] Database Readiness Probe (/ready)             | Status: 200 | Latency: 1400.21ms
[PASS] Process Liveness Probe (/live)                | Status: 200 | Latency: 1.15ms
[PASS] Unauthenticated Protected Route 401 Check     | Status: 401 | Latency: 1.26ms

----------------------------------------------------
Smoke Test Results: 5 Passed, 0 Failed
----------------------------------------------------
```

- `npm run security:test`: **5/5 PASSED**
- `npm run build:api`: **PASSED (Exit code 0)**
- `npm run build:web`: **PASSED (Next.js 14 production bundle)**
- **Report Artifact**: [`docs/production-deployment-guide.md`](file:///c:/Users/rajan/Desktop/Examly/docs/production-deployment-guide.md)

---

## 5. Next Steps (Phases 18–20: Load Testing, Concurrency & Final Sign-Off)

We will proceed to final load benchmarking, high-concurrency validation, and production sign-off.
