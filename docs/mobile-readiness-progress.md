# Shared backend and website readiness

Work order: finish shared database/API/security and the corresponding website workflows before expanding mobile screens. Use the existing connected data; do not seed demo content or reset the database. Android physical-device testing comes first. Mobile designs are in `Examly_Student_App_All_Images/Examly_Student_App_All_Images`.

## Foundation update — implemented and regression checked

- Password, signup and Google authentication all create saved refresh sessions.
- Refresh requires an active, unexpired saved session and an active account/institute. Tokens rotate with a conditional update, so a reused token cannot renew the session again.
- Existing bcrypt session hashes remain readable; successful renewal upgrades them to SHA-256 hashes. Previously issued Google/signup refresh tokens without a stored session require a new sign-in.
- Student signup and self-service onboarding cannot assign or remove enrollment. Institute administrators continue to manage enrollment through the existing student-management workflow.
- Website onboarding uses the API's PATCH method and displays assigned enrollment rather than offering self-enrollment.
- Home-feed queries require an active enrollment in the student's institute, exclude hidden learning content, restrict classes to the current Nepal calendar day, and exclude unreleased scores from averages.
- Batch-test detail access rejects missing or inactive enrollment.
- Support administration requires ADMIN/SUPER_ADMIN; institute administrators can only list/reply to tickets belonging to users in their institute.

## Verification performed

- Read-only connected-database transaction confirmed the required foundation tables exist and found zero cross-institute student enrollment mismatches. No schema or record changes were made.
- API and website TypeScript checks passed.
- `node --test scripts/test-foundation-security.cjs scripts/test-google-token-verification.cjs` passed all nine tests. Fixtures are isolated from the connected database.
- These results do not certify all existing authorization paths or the complete website. A fresh signed-in browser walkthrough and deployment verification remain outstanding. Existing access tokens retain their normal expiry; this change enforces revocation when refreshing.

## Remaining sequence

### Password form and recovery repair

- Deployed frontend contains the public-auth 401 bypass. Added protection against background session checks reloading login/recovery forms; form submission now reads actual input values to support browser/password-manager autofill. Recovery errors/successes and loading actions are announced, and reset success stays visible until the user returns to login.
- Removed password recovery's Redis dependency. Email sending is awaited during the HTTP request. Added Gmail App Password sending for development without a custom domain, alongside Resend with a verified sender. Configuration guide: `docs/password-recovery-setup.md`.
- Reset token consumption, password update, invalidation of other reset links and refresh-session revocation now share an interactive transaction with a conditional token claim. Rate limits apply to recovery/reset routes.
- Real authorized Resend test was rejected (403); current sender is the shared resend.dev test domain and the account has no verified domain. Failed new token invalidated; no password changed. Gmail credentials and live receipt/reset/sign-in remain pending.
- API/web TypeScript checks and 35 isolated regressions passed. Tests send no live emails or reset real passwords.

### Signed-in walkthrough and background-job security — November 16

- Verified the existing Chrome Super Admin session: real subject library, five existing lessons, and lesson Videos, Notes, Tests and Resources tabs. Opened/cancelled Add Resource without saving. No records were created, edited or deleted. Student visibility, publishing and actual resource mutations remain unverified.
- Redis DNS still returns ENOTFOUND for the configured endpoint. Email provider and sender configuration are present, but delivery has not been exercised. A working REDIS_URL is needed; no credentials were printed or changed.
- Restricted global job-status and dead-letter endpoints to Super Admin with system.read permission. Responses expose operational metadata only, excluding email bodies, reset links, payloads, raw errors and provider results.
- Password recovery now checks email-provider configuration and queue presence before account lookup. Missing email configuration fails uniformly with 503. Email workers throw on missing configuration and use BullMQ UnrecoverableError for permanent provider rejection rather than recording a successful job or modifying retry options at runtime.
- Added isolated job-security tests for tenant-role denial, sensitive-field omission and missing-provider recovery. API type check and the four focused queue/security tests passed. No emails were sent and no live Redis jobs were inserted.
- Existing import/export worker processors are placeholders and analytics has no worker here. Restoring Redis alone does not make these modules complete; implement/verify them before exposing queued workflows.
- The broader regression run caught a newer home-feed fallback allowing unenrolled students to preview an arbitrary active batch. Restored mandatory active same-institute enrollment for students, retaining administrator-only preview with tenant restrictions. Updated the isolated video fixture to cover the newer first-video fallback and its enrollment scope.
- Final combined security regression suite: 23 passed; API TypeScript passed. Restarted the local API to load these fixes. Redis DNS remains unavailable.

### Curriculum access update

- Extended the shared hierarchy guard to every legacy lesson-editor alias: creation, reorder, cached reads, video/note updates and deletion, and resources. Requests check access before reading cache or writing records.
- Fixed main-library lesson reorder for subjects without a batch. Resource parents must be folders in the same lesson. Successful writes invalidate lesson/subject caches.
- Added the website lesson Resources tab, backed by existing ResourceNode records: folder browsing, HTTP(S) resource links, permission-controlled folder/link creation and removal, and empty/error states. Both lesson-read APIs omit resource records when resource-read permission is absent.
- Read-only database inspection confirmed the lesson/resource tables and found zero cross-lesson or non-folder resource parents. No live records were changed.
- API and website type checks passed. The foundation, curriculum and lesson-alias suite passed 19 tests; an additional queue-outage test passed.
- Restarted the local API with these changes. Redis DNS resolution failed on startup. Removed the old fake job-acceptance fallback: unavailable background processing now fails with 503. Password recovery reports the same temporary-unavailability response before looking up an account. Redis connectivity and actual delivery/worker behavior remain outstanding; core API health is not evidence that background jobs work.

- Extracted shared curriculum hierarchy checks so annotation and bookmark access follows the same active enrollment, institute and published-content restrictions as the content API.
- Added annotation/bookmark payload validation. Saved bookmarks are filtered against current access, including withdrawn permissions.
- Student curriculum counts exclude hidden lessons and unpublished tests.
- Curriculum views refresh from the API every 15 seconds while visible, refresh on focus, pause while editing, and clear previously displayed content when access is denied.
- Removed frontend quick-login buttons containing embedded administrator passwords. Affected credentials need rotation outside source control; removing the UI does not invalidate passwords or older deployed bundles.
- Verified real superadmin navigation from the dashboard to the subject library and an existing subject's five lessons. No publishing, enrollment or content records were changed. Lesson-detail, student-account and publishing walkthroughs are still pending.
- The browser later lost its session after network suspension and a rejected refresh. Local Google Identity Services also reported that the current origin is not authorized for its client ID; verify the web OAuth client's authorized JavaScript origins before certifying Google web login.
- Added five curriculum regression tests, bringing the isolated foundation/Google/curriculum suite to 14 tests. No test fixtures are inserted into the connected database.

1. Complete foundation acceptance on the running website: fresh login, profile completion, assigned enrollment, renewal and logout. Review remaining content authorization paths, including annotations/bookmarks, before exposing their mobile screens.
2. Batches, subjects and lessons: verify admin publishing, student visibility, hidden/deleted states, access revocation and refresh behavior using shared API contracts.
3. Video learning: player, watch progress, comments and timestamped personal notes.
4. Notes/PDF: annotations, reading position, search and permitted downloads.
5. Tests: attempts, recovery, submission confirmation, result publishing and history.
6. Bookmarks, activity, notifications, profile/settings and support conversations.
7. Implement the matching mobile screens and navigation, checking each against the supplied designs on the connected Android phone. Use real API responses and explicit empty/error states.
8. Downloads/offline recovery and release validation; iOS device verification follows Android.

Each module must include database/API access checks, usable admin and student website flows, and validation before it is considered complete. Shared database access alone is not a guarantee that every open client screen refreshes automatically.
