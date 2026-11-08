# Test builder

Builder, create and detail pages are built by Next.js. Route/persistence integration requires database E2E verification.

## Runtime evidence — 2026-09-03

PASS: an admin used `POST /api/v1/tests` to create a real draft test with one section, question, and two options. `POST /tests/:id/publish` made it LIVE. PostgreSQL confirmed published state, one question, and two options. A controlled student saw it in `/tests` and could read it without answer-key fields.

FIXED: the frontend authoring endpoints had no registered Fastify routes. Added create, publish, add-section, add-question, update-test, delete-test, delete-section, update-question, delete-question, question reorder, and bulk-import routes with validation and RBAC guards.

## Phase 5 runtime evidence — 2026-09-03

PASS: a disposable real test was created, updated, given a second section and question, bulk-imported with two questions, reordered, then had the extra question/section removed and the test soft-deleted. Reloading the test before cleanup confirmed the persisted title, two sections, four questions, option records, and changed sort order.

FIXED: the create wizard sends local section IDs (`sec-1` and similar) while persistence generates database section IDs. The API now maps those client section IDs to their newly created database sections in the same transaction. An exact create-wizard-shaped payload with two sections and two assigned questions was persisted correctly; its diagram URL and selected configuration fields also survived the response.

## Built-in browser evidence — 2026-09-03

PASS (Super Admin browser session): the visible dashboard → Test Suite → live test detail flow rendered. In the real split-pane builder, a section named `Browser E2E Section` was created, appeared after a full page reload, then received a four-option single-correct question. A second full refresh retained the section, one question, all four options, and the question count of two for the test. Browser diagnostics recorded the section `POST` as 201 and the question `POST` as 201.

PARTIAL: this proves browser authoring and refresh persistence for a signed-in Super Admin session. Browser creation of a brand-new test, edit/reorder/bulk import/publish/soft-delete, and controlled student visibility are not yet browser-verified.
