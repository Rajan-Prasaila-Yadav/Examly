# Change log

| File | Change | Reason | Verification | Risk |
|---|---|---|---|---|
| `apps/api/src/fastify/routes/subjects.routes.ts` | Added batch-scoped list/create aliases, soft delete, and tenancy-checked reorder | The frontend called routes absent from the Fastify plugin | `npm run build:api` | Database E2E pending |
| `apps/api/src/fastify/routes/lessons.routes.ts` | Added subject-scoped create and tenancy-checked reorder | The frontend called routes absent from the Fastify plugin | `npm run build:api` | Database E2E pending |
| `apps/api/src/fastify/routes/lessons.routes.ts` | Added nested video, note and resource persistence routes | Real API calls returned 404 | Real admin create/read/cleanup verified |
| `apps/web/src/app/(dashboard)/lessons/[id]/page.tsx` | Removed fallback sample note/resource URLs | Production UI was able to create fake content | API and web production builds pass |
| `apps/api/src/fastify/routes/tests.routes.ts` | Added runner-compatible start/autosave endpoints; normalized answer payload; bulk-persisted final answers | Real student test submit timed out and runner/API contracts disagreed | Real API + PostgreSQL lifecycle verified |
| `apps/web/src/app/(dashboard)/tests/[id]/runner/page.tsx` | Reads nested submit result object | API returns `{ result }`, but runner expected result at top level | API and web production builds pass |
| `apps/api/src/fastify/routes/tests.routes.ts` | Added test authoring/create/publish/section/question APIs | Existing authoring UI calls had no matching Fastify routes | Real admin create/publish + PostgreSQL + student availability verified |
| `apps/api/src/fastify/routes/tests.routes.ts` | Secured legacy attempt-start endpoint | Alternate endpoint bypassed student/published/live checks | Admin receives 403; student start succeeds |
| `apps/api/src/fastify/routes/tests.routes.ts` | Added builder update/delete/section-delete/question-update/question-delete/reorder/bulk-import APIs | Existing authoring UI contract had incomplete server coverage | Real admin create → mutate → reload → cleanup persistence verification |
| `apps/api/src/fastify/routes/tests.routes.ts` | Enforced server end time on autosave/submit and handled unique-result submission race | A started attempt could otherwise continue past its schedule and concurrent submissions could surface a uniqueness error | Expired controlled attempt returns 409; parallel submit returns one result and one idempotent duplicate |
| `apps/api/src/fastify/routes/tests.routes.ts` | Maps create-wizard local section IDs to persisted sections and saves the supplied builder configuration/diagram URL | The wizard's `sec-*` IDs were not database IDs, so valid authored questions could be rejected | Exact wizard-shaped two-section payload persisted questions in their intended sections |
| `docs5/*` | Added built-in browser Super Admin builder/community/performance evidence | Actual browser actions and diagnostics became available | Visible section/question authoring, reload persistence, 201 responses, request timing, and console inspection |
