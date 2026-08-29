# 06 — Roles & Permissions System (Dynamic RBAC)

Examly implements a strict **Dynamic Role-Based Access Control (RBAC)** architecture supporting 4 primary system roles with per-user explicit permission grants and zero-trust verification.

---

## 6.1 Role Definitions & Authority Hierarchy

```
┌─────────────────┬─────────────────────────────────────────────────────────────┐
│ Role            │ Primary Purpose & Security Boundaries                       │
├─────────────────┼─────────────────────────────────────────────────────────────┤
│ **SUPER_ADMIN** │ Platform Owner. Hardcoded superuser access across all       │
│                 │ institutes. Cannot be deleted, restricted, or overridden.   │
├─────────────────┼─────────────────────────────────────────────────────────────┤
│ **ADMIN**       │ Institute Manager. Complete authority within assigned       │
│                 │ institute: Batches, Teachers, Students, Tests, Settings.    │
├─────────────────┼─────────────────────────────────────────────────────────────┤
│ **TEACHER**     │ Course Instructor. Creates and publishes tests, uploads     │
│                 │ video lectures/notes, views student performance in assigned │
│                 │ batches. Permissions can be customized by Admin.            │
├─────────────────┼─────────────────────────────────────────────────────────────┤
│ **STUDENT**     │ Enrolled Learner. Baseline floor: Attends batch lessons,     │
│                 │ streams videos, takes tests, views personal scorecards.     │
└─────────────────┴─────────────────────────────────────────────────────────────┘
```

---

## 6.2 Default Role-Permission Matrix

| Resource | Action | Super Admin | Admin | Teacher | Student |
|---|---|:---:|:---:|:---:|:---:|
| **Institutes** | `create / read / update / delete` | ✅ All | ❌ None | ❌ None | ❌ None |
| **Batches** | `create / update / delete / reorder` | ✅ All | ✅ Institute | ❌ None | ❌ None |
| | `view / browse` | ✅ All | ✅ Institute | ✅ Assigned | ✅ Enrolled |
| **Subjects / Lessons** | `create / edit / soft-delete` | ✅ All | ✅ Institute | ✅ Assigned | ❌ None |
| | `view / read content` | ✅ All | ✅ Institute | ✅ Assigned | ✅ Enrolled |
| **Videos / Notes** | `upload / edit / delete` | ✅ All | ✅ Institute | ✅ Assigned | ❌ None |
| | `stream / view PDF` | ✅ All | ✅ Institute | ✅ Assigned | ✅ Enrolled |
| **Test Wizard** | `create / configure / publish` | ✅ All | ✅ Institute | ✅ Assigned | ❌ None |
| | `take / submit attempt` | ❌ N/A | ❌ N/A | ❌ N/A | ✅ Enrolled |
| **Question Bank** | `create / bulk-import / edit` | ✅ All | ✅ Institute | ✅ Assigned | ❌ None |
| **Results & Key** | `publish / view all results` | ✅ All | ✅ Institute | ✅ Assigned | ❌ None |
| | `view personal result & key` | ✅ All | ✅ Institute | ✅ Assigned | ✅ Own Only |
| **Teacher Accounts** | `create / assign / toggle perms` | ✅ All | ✅ Institute | ❌ None | ❌ None |
| **Student Accounts** | `enroll / block / unblock` | ✅ All | ✅ Institute | 👁 Read-only | ❌ None |
| **Role Matrix** | `customize role permissions` | ✅ All | ✅ Institute | ❌ None | ❌ None |

---

## 6.3 Dynamic Permission Overrides (`PermissionGrant`)

An Admin can override permissions for individual teachers directly via the Teacher Profile view (as seen in mockup `admin-27-teacher-detail.png`):

```
Teacher: Dr. Arun Mehta (Physics Faculty)
Assigned Batches: [ NEET 2026 Dropper, JEE Foundation 11th ]

Granular Permission Toggles:
  [x] Create tests
  [x] Upload videos
  [x] View student performance data
  [ ] Manage fee & payment records
  [ ] Delete subjects / batch content
```

### Effective Permission Resolution Formula
```
User Effective Permission for (Resource R, Action A) =
    IF User is SUPER_ADMIN -> ALLOW (Hardcoded)
    ELSE IF User is BLOCKED or LOCKED -> DENY
    ELSE IF PermissionGrant exists for (User, R, A) -> PermissionGrant.isAllowed
    ELSE -> RolePermission exists for (User.RoleId, R, A)
```

---

## 6.4 Immediate Session Revocation on Block

When an administrator toggles a user state to `BLOCKED`:
1. Database record `User.status` is updated to `BLOCKED`.
2. Redis blacklist key `blacklist:user:{userId}` is written with a 7-day TTL.
3. WebSockets and SSE streams for the user are immediately severed.
4. Next API call from the user's mobile app or browser receives `403 Forbidden` with a localized message:
   > *"Your account has been suspended by the institute administration. Please contact support."*
5. The client app automatically clears stored tokens and transitions to the Login screen.
