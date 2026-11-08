# Email and password reset

Password-reset routes use tokens and Resend is conditionally configured. Provider acceptance/delivery is NOT VERIFIED.

LOCAL PIPELINE PARTIAL PASS: a controlled student's password-reset request returned the anti-enumeration success response and created one persisted reset-token row. EXTERNAL DELIVERY NOT VERIFIED: raw token is intentionally not readable from the hash, and no provider delivery evidence was collected.
