# EXAMLY — FORENSIC AUDIT: NESTJS RESIDUE & BACKEND RUNTIME STATUS

**Classification:** ARCHITECTURAL INTEGRITY AUDIT  
**Date:** September 1, 2026  
**Auditor:** Antigravity Principal Systems Architect  
**Status:** **CRITICAL FINDING — NESTJS RESIDUE DETECTED IN DEFAULT BOOTSTRAP & SCRIPTS**

---

## 1. Executive Summary

A forensic inspection of the backend repository revealed that while all core business domains (authentication, catalog, test engine, comments, reactions, search, YouTube imports, exports, and background queues) have been successfully written as modular Fastify route plugins in `apps/api/src/fastify/`, **the default production bootstrap entry point and build scripts remained configured for NestJS + Express**.

Specifically:
1. `apps/api/src/main.ts` still invokes `NestFactory.create(AppModule)` on startup.
2. `apps/api/package.json` contains runtime scripts `"dev": "nest start --watch"`, `"build": "nest build"`, and `"start:prod": "node dist/main"`.
3. The Fastify application was only being instantiated by standalone test runners and benchmark suites (`apps/api/src/fastify/server.ts`).

---

## 2. Dependency & Codebase Inventory

### A. NestJS Runtime Dependencies in `apps/api/package.json`
```json
"@nestjs/common": "^10.4.15",
"@nestjs/config": "^3.3.0",
"@nestjs/core": "^10.4.15",
"@nestjs/jwt": "^10.2.0",
"@nestjs/passport": "^10.0.3",
"@nestjs/platform-express": "^10.4.15",
"@nestjs/platform-socket.io": "^10.4.15",
"@nestjs/swagger": "^8.1.1",
"@nestjs/throttler": "^6.4.0",
"@nestjs/websockets": "^10.4.15",
"rxjs": "^7.8.1",
"reflect-metadata": "^0.2.2"
```

### B. Obsolete NestJS Modules in `apps/api/src/modules/`
The following NestJS module directories duplicate logic now handled by Fastify:
- `apps/api/src/modules/auth/` (Superseded by `apps/api/src/fastify/plugins/auth.plugin.ts`)
- `apps/api/src/modules/catalog/` (Superseded by `batches.routes.ts`, `subjects.routes.ts`, `lessons.routes.ts`, `videos.routes.ts`)
- `apps/api/src/modules/identity/` (Superseded by `users.routes.ts`)
- `apps/api/src/modules/test-engine/` (Superseded by `tests.routes.ts`)
- `apps/api/src/modules/community/` (Superseded by `videos.routes.ts` comments/reactions)
- `apps/api/src/modules/system/` (Superseded by `system.routes.ts`, `exports.routes.ts`, `jobs.routes.ts`)

---

## 3. Findings & Classification

| Finding ID | Component | Severity | Root Cause | Impact |
| :--- | :--- | :--- | :--- | :--- |
| **NEST-01** | `main.ts` | **CRITICAL** | `NestFactory.create(AppModule)` is default entrypoint | Starting the server with `npm start` runs legacy Express, bypassing Fastify entirely |
| **NEST-02** | `package.json` | **HIGH** | Build scripts use `nest build` | Fastify files are compiled as side-effects, retaining heavy NestJS dependencies in production |
| **NEST-03** | Dual Codebase | **HIGH** | `src/modules/` and `src/fastify/` coexist | Risk of developer confusion and duplicate maintenance |

---

## 4. Remediation Plan

1. **Create Native Fastify Entrypoint (`apps/api/src/index.ts` / `apps/api/src/main.fastify.ts`)**:
   - Instantiate `createFastifyApp()`, listen on `PORT` (default 4000).
   - Set up graceful shutdown signal handlers (`SIGTERM`, `SIGINT`).
2. **Update Package Scripts**:
   - `"build": "tsc -p tsconfig.build.json"` (or `tsup` / `esbuild` for ultra-fast bundling).
   - `"start": "node dist/index.js"`.
3. **Deprecate & Remove Legacy NestJS Packages**:
   - Remove `@nestjs/*`, `rxjs`, `reflect-metadata` once standalone entrypoint is verified in CI/CD.
