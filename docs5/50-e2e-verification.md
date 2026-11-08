# E2E verification

No mutation or full user flow is recorded as passed until database state and visible UI state are verified.

## Runtime evidence — 2026-09-03

PASS: real API at `http://127.0.0.1:4000` returned readiness 200 with `database: connected`. Seeded admin login passed. Authenticated admin requests returned 200 for `/auth/me`, `/batches`, `/community/feed`, `/users/roles`, `/users/teachers`, `/users/students`, `/tests`, and batch detail/students/teachers/tests.

PASS: an admin created a temporary subject and lesson through the real API. Before the fix, POST lesson video/note/resource returned 404. After the fix, each returned 201; GET lesson returned one persisted video, note and resource; cleanup endpoints completed successfully.

BLOCKED: seeded student login (`12A-034`) returned 401 `Account is blocked or deactivated`; student-role runtime verification was not performed.

Resolved test-account blocker: database metadata showed other active students. A controlled active student was created through the real registration endpoint and used for API E2E. The complete test API flow passed: register/login → tests list/detail → start → resume → autosave → submit → duplicate submit → result read → database verification. Browser UI E2E remains NOT VERIFIED because no browser login automation was performed in this pass.

Browser evidence: BLOCKED — browser automation timed out/reset while attempting to inspect the local Examly tab. No browser login or UI-flow PASS is claimed.

Browser smoke evidence: PASS — the clean production web server loaded `http://localhost:3000/login` and the visible Examly Portal email/password login form. No browser authentication or dashboard flow is claimed; that next action requires explicit user confirmation because it would sign in a controlled account.

Additional API/database E2E PASS: admin authored a draft test with section/question/options → published it → student saw and read it; admin community post/poll/reaction/comment/reply/vote → API reload → database persistence.

Additional API/database E2E PASS: test-builder update, bulk import, reorder, and deletion persisted. A concurrent submit pair produced one result and one duplicate-result response. A controlled expired attempt rejected both autosave and submit with 409.

Role-boundary API PASS: the controlled student can list tests (200) but is denied test creation, publish, and section mutation (403). An admin is denied the student-only runner start endpoint (403). This does not replace teacher/employee/browser role verification.

## Built-in browser E2E evidence — 2026-09-03

PASS (partial browser E2E): the isolated in-app browser was controlled directly at `/`, `/tests`, `/tests/:id`, and `/community` using its existing Super Admin session. The dashboard showed the Super Admin identity and Test Suite entry; the test list showed five persisted tests and management actions. In the visible builder, section creation returned 201 and survived a full reload; a question with four options returned 201, visibly appeared under that section, and survived a second full reload. The Community page visibly rendered persisted posts, poll counts, reactions, and comments. No console errors/warnings were captured on these pages.

NOT VERIFIED: controlled-student browser login and runner lifecycle, teacher/employee browser sessions, browser role-denial states, community mutations, and browser test creation/publish/reorder/soft-delete. The already authenticated session was Super Admin; it was used only after the user explicitly directed use of the existing signed-in session.
