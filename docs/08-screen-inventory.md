# 08 — Screen Inventory & Navigation Architecture

This document catalogs all screens across the Examly ecosystem, divided into Mobile Shells (Student, Teacher, Admin) and the Web Management Portal.

---

## 8.1 Shared & Authentication Screens (SCR-01 to SCR-08)

| Screen ID | Screen Name | Platforms | Primary Function |
|---|---|---|---|
| `SCR-AUTH-01` | Splash Screen | Mobile | Animated logo reveal, network & session check |
| `SCR-AUTH-02` | Onboarding Carousel | Mobile | 3-slide introduction to tests, lectures & analytics |
| `SCR-AUTH-03` | Unified Login | Mobile, Web | Email / Phone / Student ID + Password sign-in |
| `SCR-AUTH-04` | OTP Verification | Mobile, Web | 6-digit pin entry with 60s resend timer |
| `SCR-AUTH-05` | Forgot / Reset Password | Mobile, Web | Identifier entry → OTP → new password setup |
| `SCR-AUTH-06` | First-Login Password Change | Mobile, Web | Mandatory password change for admin-created accounts |
| `SCR-AUTH-07` | Student Self-Registration | Mobile, Web | Name, phone, batch selection, address details |
| `SCR-AUTH-08` | Notification Center | Mobile, Web | In-app feed of published tests, results, announcements |

---

## 8.2 Student Mobile Shell Screens (SCR-STU-01 to SCR-STU-20)

| Screen ID | Screen Name | Primary Content & Interactions |
|---|---|---|
| `SCR-STU-01` | Student Home / Dashboard | Enrolled batches, upcoming tests banner, continue watching |
| `SCR-STU-02` | My Batches List | Grid of enrolled classes (CEE, IOE) with subject counts |
| `SCR-STU-03` | Batch Detail & Subjects | List of subjects (Physics, Chem) with progress percentage |
| `SCR-STU-04` | Subject Detail & Lessons | Chapter index (01 Mechanics, 02 Optics) with lock badges |
| `SCR-STU-05` | Lesson Content Hub | 4-tab container: Videos, Tests, Notes, Resources Folder |
| `SCR-STU-06` | Video Player Screen | Protected stream, watermark overlay, 10s seek, speed control |
| `SCR-STU-07` | PDF Notes Viewer | Zoomable KaTeX document reader with page jumper |
| `SCR-STU-08` | Resource Folder Explorer | Nested directory browser for slides, DOCX, and web links |
| `SCR-STU-09` | Tests Hub | 3-tab list: Available, Upcoming (clock), and Completed tests |
| `SCR-STU-10` | Pre-Test Rules & Consent | Test metadata, instructions, negative mark warning, Start button |
| `SCR-STU-11` | Live Test Examination | Sticky timer countdown, KaTeX question, option radio, Palette trigger |
| `SCR-STU-12` | Question Palette Modal | Grid of question badges (Answered, Review, Unanswered, Not Visited) |
| `SCR-STU-13` | Test Submission Warning | Confirmation dialog summarizing answered vs unanswered count |
| `SCR-STU-14` | Result Summary Screen | Scorecard circle gauge (148/200), Pass/Fail badge, time taken |
| `SCR-STU-15` | Check Answers & Solutions | Question-by-question review: Student Choice vs Correct, KaTeX steps |
| `SCR-STU-16` | Live Leaderboard | Top 10 rankers, student's personal rank (#6), batch average |
| `SCR-STU-17` | Performance Analytics | Trend graphs over last 10 tests, subject accuracy progress bars |
| `SCR-STU-18` | Student Profile & Settings | Personal bio, roll number, address, dark mode toggle |

---

## 8.3 Admin & Teacher Management Screens (SCR-ADM-01 to SCR-ADM-28)

| Screen ID | Screen Name | Primary Content & Interactions |
|---|---|---|
| `SCR-ADM-01` | Admin Dashboard | Quick Stat Cards (Batches, Students, Tests, Teachers), Quick Manage |
| `SCR-ADM-02` | Classes / Batches List | Card list with status badges (`Active`, `Hidden`, `Blocked`) & FAB |
| `SCR-ADM-03` | Create / Edit Batch | Name, course code, banner image, start/end dates |
| `SCR-ADM-04` | Subjects List | Drag-to-reorder list of subjects within a batch |
| `SCR-ADM-05` | Create / Edit Subject | Subject title, icon selector, active/hidden toggle |
| `SCR-ADM-06` | Lessons List | Chapter index with video/test/resource item counts |
| `SCR-ADM-07` | Lesson Detail View | Tabbed management for Videos, Tests, Notes, and Resource Folders |
| `SCR-ADM-08` | Upload Video Lecture | Title, video provider (YouTube/MP4), URL, duration, order |
| `SCR-ADM-09` | Resource Tree Manager | Create nested folders, upload PDFs, attach reference URLs |
| `SCR-ADM-10` | Test Wizard Step 1 (Settings) | Name, Type (Batch/Subject/Lesson), Start/End, +4/-1 marks, Pass % |
| `SCR-ADM-11` | Test Wizard Step 2 (Engine) | Shuffle questions, late-join window, anti-cheat, publish mode |
| `SCR-ADM-12` | Test Wizard Step 3 (Questions) | Rich-text builder, 8 question types, options, KaTeX solution steps |
| `SCR-ADM-13` | Test Wizard Step 4 (Publish) | Final summary check, instant publish, or schedule release |
| `SCR-ADM-14` | Bulk Question Importer | CSV / Excel upload with error validator and template download |
| `SCR-ADM-15` | Tests Management List | Filterable table: Active, Drafts, Scheduled, Completed |
| `SCR-ADM-16` | Comprehensive Test Analytics | Score distribution curve, Toughest Questions, Toppers ranking |
| `SCR-ADM-17` | Students Directory | Searchable list with avatar, batch tag, roll number, phone |
| `SCR-ADM-18` | Add / Edit Student | Form with Nepal province/district/ward address cascade |
| `SCR-ADM-19` | Student Profile & Report Card | 4-tab inspector: Overview, Tests Taken, Video Progress, Devices |
| `SCR-ADM-20` | Teachers Directory | List of instructors with assigned batches and contact details |
| `SCR-ADM-21` | Add / Edit Teacher | Name, faculty code, email, phone, auto-generated password |
| `SCR-ADM-22` | Teacher Profile & Perms | Granular permission switches (Create Tests, Upload, View Data) |
| `SCR-ADM-23` | Dynamic Role Matrix Editor | Custom role creator with permission matrix checkboxes |
| `SCR-ADM-24` | Master Library Cloner | Two-way cloning tool: Copy Batch ↔ Master Library |
| `SCR-ADM-25` | Push Notification Composer | Title, body, target audience (All / Specific Batch) |
| `SCR-ADM-26` | Export Center | PDF scorecard generator, Excel student data downloader |
| `SCR-ADM-27` | Institute Settings | Institute logo, branding colors, default test rules, pass criteria |
| `SCR-ADM-28` | Audit Log Viewer | Chronological timeline of admin and teacher actions |

---

## 8.4 Super Admin Screens (SCR-SUP-01 to SCR-SUP-06)

| Screen ID | Screen Name | Primary Content & Interactions |
|---|---|---|
| `SCR-SUP-01` | Platform Overview | Total active institutes, global student count, daily API calls |
| `SCR-SUP-02` | Institutes Directory | Searchable list of all onboarded coaching centers |
| `SCR-SUP-03` | Onboard New Institute | Institute name, admin email, subscription tier, custom domain |
| `SCR-SUP-04` | Institute Inspector | Drill-down into student counts, storage usage, and active status |
| `SCR-SUP-05` | Subscription & Billing | Plan tiers, renewal tracking, license seat limits |
| `SCR-SUP-06` | Global System Diagnostics | Redis queue health, database latency, error log monitoring |
