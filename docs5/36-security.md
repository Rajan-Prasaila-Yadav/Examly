# Security

Fixed source findings: credentialed CORS uses an explicit allow-list and production JWT secrets are mandatory. Authentication, object authorization, uploads and rate limits need further live verification.

PASS: unauthenticated batch access returned 401. PASS: controlled Student B received 403 for Student A's attempt result and answer mutation. This verifies those two attempt IDOR paths only; broader object-level authorization remains PARTIAL.

FIXED/REGRESSION VERIFIED: the legacy `POST /tests/:id/attempts` route previously allowed any authenticated role to start unpublished or non-live tests. It now requires STUDENT plus ACTIVE/published/LIVE/available test state. Admin test returned 403; a controlled student test returned a real attempt.
