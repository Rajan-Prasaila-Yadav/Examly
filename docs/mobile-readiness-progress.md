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

1. Complete foundation acceptance on the running website: fresh login, profile completion, assigned enrollment, renewal and logout. Review remaining content authorization paths, including annotations/bookmarks, before exposing their mobile screens.
2. Batches, subjects and lessons: verify admin publishing, student visibility, hidden/deleted states, access revocation and refresh behavior using shared API contracts.
3. Video learning: player, watch progress, comments and timestamped personal notes.
4. Notes/PDF: annotations, reading position, search and permitted downloads.
5. Tests: attempts, recovery, submission confirmation, result publishing and history.
6. Bookmarks, activity, notifications, profile/settings and support conversations.
7. Implement the matching mobile screens and navigation, checking each against the supplied designs on the connected Android phone. Use real API responses and explicit empty/error states.
8. Downloads/offline recovery and release validation; iOS device verification follows Android.

Each module must include database/API access checks, usable admin and student website flows, and validation before it is considered complete. Shared database access alone is not a guarantee that every open client screen refreshes automatically.
