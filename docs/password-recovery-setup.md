# Password recovery email setup

Recovery emails are sent and awaited within the API request. They do not depend on Redis workers. Reset tokens expire after one hour, are stored as SHA-256 hashes, and are consumed transactionally with the password change and session revocation. A successful reset invalidates all other reset links for that account.

## Gmail option (no custom domain)

Use a Gmail account dedicated to sending Examly emails where possible. Enable Google 2-Step Verification and generate an App Password at https://myaccount.google.com/apppasswords. App Password availability depends on account policy. Gmail sending limits still apply; delivery from Vercel must be tested after configuration.

Set these variables in the backend Vercel project and local `apps/api/.env`:

```dotenv
MAIL_PROVIDER=gmail
GMAIL_USER=your-sending-account@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password
FRONTEND_URL=https://examly-web-tawny.vercel.app
```

Do not put these credentials in the frontend, NEXT_PUBLIC variables, source control or chat. Redeploy the backend after changing Vercel variables. The sender address comes from GMAIL_USER. Do not use your normal Google password.

## Resend option

Set MAIL_PROVIDER=resend, RESEND_API_KEY, MAIL_FROM_ADDRESS (using a verified sending domain), and FRONTEND_URL. The shared resend.dev test sender is rejected by the production configuration because it cannot deliver reset emails to arbitrary students.

## Verification and errors

- Submit Forgot Password for an authorized active account, check inbox/spam, then let the account owner choose the new password in the email-linked page.
- Verify the new password signs in, the old password fails, and the reset link cannot be reused.
- Public recovery responses do not reveal account existence or account-specific delivery failures. A generic response is not proof of delivery. Operators should inspect PASSWORD_RESET_EMAIL_ACCEPTED, PASSWORD_RESET_EMAIL_REJECTED and PASSWORD_RESET_DELIVERY_FAILED logs. Accepted means the provider accepted the message, not that it reached the inbox.
- Missing configuration returns 503 before account lookup. No raw reset links, passwords or email bodies are logged.
- Current real test: Resend rejected the authorized email with HTTP 403; configured sender was resend.dev and the provider had zero verified domains. The attempted new reset token was invalidated; the account password was not changed. Gmail delivery remains pending sender credentials.

References: https://support.google.com/accounts/answer/185833 and https://nodemailer.com/guides/using-gmail
