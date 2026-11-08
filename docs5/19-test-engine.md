# Test engine

Runner source uses local state and answer persistence endpoints. Race, timer, resume and scoring behavior remain NOT VERIFIED.

## Real runtime verification — 2026-09-03

PASS: A controlled student registered through `/auth/register`, logged in, listed published tests, and fetched a test detail response without `isCorrect` option fields. The real student flow then started an attempt, resumed the same open attempt, autosaved an answer, submitted it, read the result, and queried the database. PostgreSQL confirmed a non-null submission time, 50 persisted answers, and one persisted result. The second identical submit returned `isDuplicateSubmission: true`.

FIXED: the browser runner calls `POST /tests/:id/start`, but the API only exposed a different attempt-start route. Added the runner contract plus `POST /tests/attempts/:attemptId/answer` with attempt ownership and option/test validation.

FIXED: submission accepted an answer array while the runner sends an answer object keyed by question ID. Submission now normalizes both formats and bulk-replaces authoritative answer rows inside one transaction; the old one-upsert-per-question design exceeded Prisma's interactive transaction timeout against the configured remote database.

PASS: a second controlled student received 403 when requesting the first student's result or saving an answer to that student's attempt.

PASS: authoring and publish APIs are registered and database-verified. A deliberately short published test was started by the controlled student; after its server end time, both answer save and submission returned 409 `Test time has expired`.

FIXED: answer saving and submission now re-check the authoritative test end time after an attempt starts. Two truly concurrent submissions of a controlled attempt returned one scored result and one idempotent duplicate response for the same result, with no 500 response or double result.

NOT VERIFIED: answer-key/review UI calls and live browser runner flow remain incomplete.
