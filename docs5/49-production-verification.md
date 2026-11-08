# Production verification

PASS: API TypeScript build and Next.js production build. PARTIAL: in-memory Fastify health/CORS check. NOT VERIFIED: database, Redis, email, and browser E2E.

Latest regression: `npm run build:api` and `npm run build:web` both passed after the nested lesson-route and no-fake-URL changes.

Runtime: Fastify ran at `http://127.0.0.1:4000`, `/api/v1/ready` reported database connected, and authenticated database-backed test attempt lifecycle verification passed after the Phase 3 fixes.

Regression after Phase 3 test-engine changes: `npm run build:api` and `npm run build:web` both passed.

Phase 4 regression: API build passed. An initial web build failed because a running `next dev` process concurrently wrote to `apps/web/.next`; after stopping that local development process, the clean web production build passed.

Phase 5 regression: API build passed after test-builder and assessment-integrity changes. The live API restarted cleanly and `/api/v1/ready` again reported database connected.
