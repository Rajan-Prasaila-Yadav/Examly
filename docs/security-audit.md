# Security & Zero-Trust Audit — Examly Platform

## 1. Executive Summary

This security audit performs an in-depth vulnerability assessment of the authentication, authorization, multi-tenant isolation, session lifecycle, and data protection mechanisms in Examly. The audit identified **critical authentication bypass**, **privilege escalation**, **hardcoded cryptographic fallbacks**, and **IDOR / multi-tenant cross-talk vulnerabilities** that must be remediated in early phases.

---

## 2. Vulnerability Severity Matrix

| ID | Vulnerability Finding | Severity | File / Location | Attack Vector & Impact |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | **Unverified JWT Signature Fallback in Google OAuth** | **CRITICAL** | `auth.service.ts:128-137` | **Complete Auth Bypass**: If token verification throws an error, the code falls back to raw Base64 decoding of the JWT payload without verifying the Google RSA signature. Any attacker can craft an arbitrary unsigned JWT containing any administrator's email and achieve instant account takeover. |
| **SEC-02** | **Mass Assignment Privilege Escalation on Registration** | **CRITICAL** | `auth.service.ts:403-447`, `auth.controller.ts:39` | **Admin Account Creation**: `/api/v1/auth/register` accepts `dto: any` without class validation. An attacker sending `{"role": "SUPER_ADMIN", "email": "attacker@evil.com"}` will be granted full `SUPER_ADMIN` privileges. |
| **SEC-03** | **Hardcoded Cryptographic JWT Secrets in Codebase** | **HIGH** | `auth.service.ts:382,494,628`, `jwt.strategy.ts:44` | **Token Forgery**: If `JWT_ACCESS_SECRET` or `JWT_REFRESH_SECRET` environment variables are missing, the server falls back to static string literals (`examly_jwt_access_super_secret_key_...`), allowing offline token generation. |
| **SEC-04** | **Broken Session Revocation & Inactive Token Refresh** | **HIGH** | `auth.service.ts:379-401` | **Session Fixation / Zombie Tokens**: While refresh tokens are hashed in `UserSession`, the `/auth/refresh` endpoint never queries `UserSession.refreshTokenHash` or verifies `isActive == true`. Blocked or logged-out users can refresh tokens indefinitely. |
| **SEC-05** | **IDOR & Cross-Student Test Review Exposure** | **HIGH** | `tests.controller.ts:393-398`, `tests.service.ts` | **Information Disclosure**: `GET /api/v1/tests/attempts/:attemptId/review` does not verify that the requesting student ID matches `attempt.studentId`. Any student can inspect other students' private answers, questions, and marks. |
| **SEC-06** | **Cross-Tenant Test Analytics & Export Leaks** | **MEDIUM** | `tests.controller.ts:236-248, 282-352` | **Multi-Tenant Leak**: Export and analytics endpoints accept `:id` without validating that the test belongs to `user.instituteId`. Institute A can access test results of Institute B. |
| **SEC-07** | **Unrestricted Batch Enrollment Override via Onboarding** | **MEDIUM** | `auth.service.ts:309-377` | **Access Control Bypass**: `POST /auth/onboarding` accepts `dto: any` allowing any student to overwrite their `batchId` to a paid/restricted batch without authorization. |
| **SEC-08** | **Static In-Memory Cache Desynchronization** | **MEDIUM** | `permission.guard.ts:11`, `jwt.strategy.ts:31` | **Stale Revocation**: Permissions and user blocked statuses are cached in static Node.js Maps for up to 3 minutes without pub/sub cluster invalidation. |
| **SEC-09** | **Missing Strict Input Validation (Zod/DTO)** | **MEDIUM** | Across all Controllers | Handlers accept unvalidated `body: any` payloads, risking prototype pollution, unexpected type conversions, and SQL/parameter injection. |

---

## 3. Detailed Vulnerability Descriptions & Proof of Impact

### 3.1 SEC-01: Critical Google Auth Signature Bypass
**Code Location**: `apps/api/src/modules/auth/auth.service.ts` (Lines 127–137):
```typescript
try {
  const ticket = await this.googleClient.verifyIdToken({
    idToken: dto.idToken,
    audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
  });
  payload = ticket.getPayload();
} catch (err: any) {
  // CRITICAL VULNERABILITY: Fallback decoder without signature verification
  try {
    const parts = dto.idToken.split('.');
    if (parts.length === 3) {
      payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    }
  } catch {}
}
```
**Exploit Scenario**:
1. An attacker sends a forged JWT header and payload where `email: "superadmin@institute.edu"`.
2. `this.googleClient.verifyIdToken` fails due to invalid signature and throws an error.
3. The catch block executes, parses the untrusted base64 payload, and logs the attacker in as the superadmin user.

**Remediation**: Eliminate all insecure catch fallback decoders. If cryptographic verification fails, immediately throw `UnauthorizedException('Invalid OAuth identity token')`.

---

### 3.2 SEC-02: Mass Assignment in Registration
**Code Location**: `apps/api/src/modules/auth/auth.service.ts` (Lines 403–447):
```typescript
async register(dto: any, ipAddress?: string) {
  const { fullName, email, phone, password, role } = dto;
  const userRole = await this.prisma.role.findFirst({
    where: { code: role || 'STUDENT' }, // Accepts client-provided role directly!
  });
  ...
}
```
**Exploit Scenario**:
Any external user can submit `{"role": "SUPER_ADMIN"}` during public signup to grant themselves root system permissions.

**Remediation**:
1. Public registration must strictly enforce `RoleType.STUDENT`.
2. Creation of `TEACHER`, `ADMIN`, or `SUPER_ADMIN` accounts must be restricted to authenticated administrative endpoints guarded by `RequirePermission('users', 'create')`.
3. Use authoritative Zod schemas on all incoming requests.

---

### 3.3 SEC-04: Session Revocation Deficit
**Code Location**: `apps/api/src/modules/auth/auth.service.ts` (Lines 379–401):
```typescript
async refresh(dto: RefreshTokenDto) {
  const payload = this.jwtService.verify(dto.refreshToken, { secret: ... });
  const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
  // FATAL: Never checks UserSession table to verify if session was revoked!
  return this.generateTokens(user);
}
```
**Exploit Scenario**:
When an admin clicks "Block Student" or a user clicks "Logout All Devices", `UserSession.isActive` is set to `false`, but the `/auth/refresh` route continues issuing valid 15-minute access tokens because it never queries `UserSession`.

**Remediation**:
Verify `UserSession` record exists, is active, and the hashed refresh token matches before issuing new tokens. Invalidate user tokens in Redis blacklist immediately on revocation.

---

## 4. Multi-Tenant Scope & RBAC Zero-Trust Enforcement

The target architecture must enforce a **Zero-Trust Multi-Tenant Pipeline**:

```
HTTP REQUEST
    │
    ▼
1. Authentication (JWT Signature & Redis Revocation Blacklist Check)
    │
    ▼
2. Tenant Isolation (Validate req.user.instituteId against resource.instituteId)
    │
    ▼
3. RBAC & Granular Permission Resolution (Cached in Redis, invalidatable on change)
    │
    ▼
4. Resource-Level Authorization (Validate student batch enrollment & attempt ownership)
    │
    ▼
5. Authoritative Zod Validation (Strip non-whitelisted properties, type coercion)
    │
    ▼
6. Business Logic & Isolated Database Query
```
