# 01 — Product Requirements Document (PRD)

## 1.1 Scope & Functional Requirements (FR)

### Module 1: Authentication & Identity (FR-01 to FR-04)
- **FR-01: Multi-Factor Identifier Login:** Support Email, Phone Number, or Admin/Student ID login with bcrypt-hashed passwords.
- **FR-02: OTP Verification:** Email and in-app fallback OTP verification for password reset and quick login.
- **FR-03: Single-Device Session Enforcement:** Enforce maximum allowed concurrent active sessions per user (configurable per institute to prevent credential sharing).
- **FR-04: Immediate Revocation on Block:** When an Admin blocks a student or teacher, all active refresh tokens and Redis sessions are immediately invalidated.

### Module 2: 4-Tier Dynamic Catalog Management (FR-05 to FR-08)
- **FR-05: Hierarchy Construction:** Complete CRUD for `Batch` → `Subject` → `Lesson` → (`Videos`, `Notes`, `Tests`, `Resources`).
- **FR-06: Hierarchical Resource Folder System:** Nested folder creation inside lessons for uploading structured PDF notes, lecture slides, question banks, and external reference links.
- **FR-07: Bidirectional Content Copying:** Deep-copy full subjects, lessons, and question banks across batches or to/from the Institute Master Library with provenance logging (`copiedFromId`).
- **FR-08: Content Visibility States:** Support status toggles (`ACTIVE`, `HIDDEN`, `LOCKED`, `BLOCKED`, `DELETED`) with instant student-side filtering.

### Module 3: Server-Authoritative Test Engine (FR-09 to FR-14)
- **FR-09: 4-Step Test Creation Wizard:** Intuitive authoring flow:
  1. *Settings:* Name, description, test type (Batch/Subject/Lesson with context auto-detection), start/end time, duration, total marks, pass marks, negative marking toggle.
  2. *Engine Rules:* Late-join policy, shuffle questions, shuffle options, anti-cheat sensitivity, result publishing mode.
  3. *Questions Builder:* Rich-text editor with KaTeX math formula rendering, image attachment, and support for 8 question types.
  4. *Review & Publish:* Live preview, instant publish, or scheduled release.
- **FR-10: 8 Supported Question Types:**
  1. Single Correct MCQ (Radio)
  2. Multiple Correct MCQ (Checkbox with partial marking options)
  3. Numerical / Integer Value
  4. Fill in the Blank
  5. Assertion & Reason
  6. Matrix / Match the Following
  7. True / False
  8. Descriptive / Subjective (with text area & image upload)
- **FR-11: Live Exam Interaction:** Timed test screen featuring real-time remaining countdown, question palette (Answered, Marked for Review, Unanswered, Not Visited), question jump, and option clearing.
- **FR-12: Shrinking Time Window for Late-Joiners:** Real test duration dynamically clamps to `min(allocatedDuration, testEndTime - currentTime)`.
- **FR-13: Anti-Cheat & Screen Security:** Fullscreen enforcement, app blur/tab-switch tracking with strike warnings (1/3 strikes before auto-submit), and screenshot/screen-recording blocking on mobile.
- **FR-14: Server-Authoritative Auto Submission:** Backend background workers automatically evaluate and submit expired active attempts regardless of client network status.

### Module 4: Evaluation, Solutions & Analytics (FR-15 to FR-17)
- **FR-15: 4 Result Publishing Modes:**
  - `IMMEDIATE`: Results revealed right after submission.
  - `AFTER_TEST_END`: Results locked until global test end time expires.
  - `MANUAL_BY_ADMIN`: Results withheld until admin clicks "Publish Results".
  - `SCHEDULED`: Results unlocked at a predetermined datetime.
- **FR-16: Step-by-Step Solution Viewer:** Rich answer key breakdown displaying student's answer vs correct answer, time spent per question, hints, and step-by-step KaTeX mathematical solutions.
- **FR-17: Leaderboard & Performance Analytics:** Real-time percentile rank, score distribution bell curve, subject-wise accuracy bars, and identifying the "Toughest Questions" across the batch.

### Module 5: User & Institute Management (FR-18 to FR-20)
- **FR-18: Student Enrollment & Trial Flow:** Self-registration with batch selection, optional trial period (e.g., 7 days free access), and batch access approval.
- **FR-19: Teacher Lifecycle Management:** Admin creates teacher profile, assigns batches/subjects, and configures granular permission toggles.
- **FR-20: Data Exports:** High-resolution PDF report generation (test scorecards, student report cards) and formatted `.xlsx` batch exports.

---

## 1.2 Non-Functional Requirements (NFR)

| NFR ID | Category | Requirement Description |
|---|---|---|
| **NFR-01** | **Latency** | Sub-100ms API response time for live test option saves (`AttemptAnswer` sync). |
| **NFR-02** | **Concurrency** | Minimum 2,000 concurrent students submitting live tests simultaneously with zero data loss. |
| **NFR-03** | **Security** | Zero-trust backend validation; passwords hashed with bcrypt (cost factor 12); JWT access tokens (15m) + secure httpOnly refresh tokens (7d). |
| **NFR-04** | **Data Integrity** | PostgreSQL ACID transactions for test submissions, ranking calculations, and content cloning. |
| **NFR-05** | **Offline Resilience** | Mobile app caches active test state locally in SQLite/Hive; syncs periodically with the backend when internet flickers. |
| **NFR-06** | **Accessibility** | All UI elements strictly comply with WCAG AA contrast ratio (≥4.5:1) in both Light and Dark themes. |
| **NFR-07** | **Device Support** | Flutter mobile client runs on Android 8.0+ (API 26+) and iOS 14.0+; Next.js Web Admin runs on all modern evergreen browsers. |
| **NFR-08** | **Localization** | First-class typography support for Nepali/Hindi Devanagari script alongside standard Latin math typesetting. |
| **NFR-09** | **Scalability** | Horizontal scaling enabled via stateless NestJS instances backed by managed PostgreSQL and Redis cluster. |
