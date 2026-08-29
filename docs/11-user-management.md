# 11 — User Management & Localization

This document outlines the user onboarding workflows, permission controls, and localizations for the South Asian / Nepali education market.

---

## 11.1 Student Lifecycle Management

```
[ Self-Registration / Admin Import ]
               │
               ▼
[ Free Trial Window (e.g., 7 Days) ] ────► [ Trial Expired ]
               │                                  │
               ▼                                  ▼
[ Enrolled in Batch (Full Access) ]       [ Fee Payment / Batch Lock ]
               │
               ├── Active Learning & Exams
               └── Admin Action: Block / Soft Delete
```

1. **Self-Registration:** Students sign up via mobile app by providing Name, Phone, and selecting desired target batch (e.g. `CEE Regular 2026`).
2. **Trial Mode:** Configurable institute policy grants new students 7 days of instant access before requiring administrative verification or fee payment.
3. **Student Profile Inspection:** Administrators view complete student report cards:
   - Tests Taken & Average Score (e.g., 42 tests, 71% average).
   - Attendance Rate & Percentile Rank (#6).
   - Subject-wise Accuracy breakdown (Physics 78%, Chem 65%, Maths 82%).
   - Logged-in Devices and active session IPs.

---

## 11.2 Teacher Onboarding & Permission Delegation

```
[ Admin Creates Teacher Account ]
  - Full Name: Dr. Arun Mehta
  - Faculty Code: TCH-014
  - Assign Batches: [ NEET 2026 Dropper, JEE Foundation ]
  - System generates temporary credentials
               │
               ▼
[ Teacher Receives Welcome Email / SMS ]
               │
               ▼
[ First-Login Force Password Reset ]
               │
               ▼
[ Teacher Dashboard Access (Scoped to Assigned Batches) ]
```

---

## 11.3 Nepal Administrative Address Cascade

Examly embeds the standard 4-tier geographic administrative structure of Nepal for student KYC and profile management:

$$\text{Province} \longrightarrow \text{District} \longrightarrow \text{Municipality / Rural Municipality} \longrightarrow \text{Ward Number (01–32)}$$

### Data Selection Hierarchy:
- **Provinces (7):** Koshi, Madhesh, Bagmati, Gandaki, Lumbini, Karnali, Sudurpashchim.
- **Districts (77):** e.g., Kathmandu, Lalitpur, Bhaktapur, Kaski, Morang, Chitwan.
- **Municipalities:** e.g., Kathmandu Metropolitan City, Pokhara Metropolitan City.
- **Ward Numbers:** 2-digit numeric input with validation (`01` to `35`).

---

## 11.4 Currency & Data Formatting Rules

- **Currency:** All financial figures are formatted in Nepalese Rupees using the standard helper `formatNPR(amount)`:
  - `formatNPR(1499)` $\longrightarrow$ `Rs 1,499`
  - `formatNPR(0)` $\longrightarrow$ `Free`
- **Phone Numbers:** Validated for Nepali 10-digit mobile formats (`98XXXXXXXX`, `97XXXXXXXX`).
- **Dates & Times:** Displayed in localized 12-hour AM/PM format (e.g., `24 Aug 2026 • 07:00 AM`).
