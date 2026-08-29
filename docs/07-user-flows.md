# 07 — End-to-End User Flows

This document details the step-by-step user journeys for all 4 roles across the native mobile app and web management portal.

---

## 7.1 Shared Authentication & Role Detection Flow

```
[ App Launch / Splash ]
          │
          ▼
[ Login Screen ] ─────────────► [ Forgot Password / OTP ]
  (Email/Phone/ID + Password)             │
          │                               ▼
          │ Authenticate JWT    [ Enter 6-digit OTP ]
          ▼                               │
[ Backend Validates User ]                ▼
  - Status === ACTIVE?          [ Reset Password ]
  - Single-session check
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ Role Switcher Gateway                                       │
│   Reads `User.role.code`                                    │
└──────────────┬──────────────────┬─────────────────┬─────────┘
               │                  │                 │
               ▼                  ▼                 ▼
     [ Student Shell ]    [ Teacher Shell ]  [ Admin Shell ]
```

---

## 7.2 Student Journey (Learning, Live Testing & Solutions)

```
[ Student Dashboard ]
  - Enrolled Batches Carousel
  - Upcoming Live Tests Card
  - Continue Watching Lecture Video
          │
          ├──────────────────────────────────────────┐
          │ Tap Batch / Subject                      │ Tap Live Test
          ▼                                          ▼
[ Subject & Lesson Navigator ]             [ Pre-Test Rules & Consent ]
  - 01 Mechanics, 02 Optics                  - Duration, Marks (+4/-1)
          │                                  - Late join window reminder
          ├────────────────────────┐         - Checkbox: "I agree"
          ▼                        ▼                 │
[ Video Player ]             [ PDF Notes ]           ▼
  - Protected stream           - KaTeX Math  [ Live Exam Screen ]
  - Floating Roll watermark    - Zoom/Page     - Sticky Header Timer
  - 10s skip, speed 1.5x       - Offline save  - KaTeX Question View
                                               - Single/Multi Radio
                                               - Question Palette Drawer
                                               - Mark for Review toggle
                                                     │
                                                     ▼ (Timer or Submit)
                                             [ Result Summary Screen ]
                                               - Total Score (148/200)
                                               - Percentile & Rank (#6)
                                               - Passed Badge
                                                     │
                                                     ├───────────────────┐
                                                     ▼                   ▼
                                            [ Check Answers Key ]  [ Leaderboard ]
                                              - Your vs Correct      - Top 10 Toppers
                                              - Hint & Step-by-Step  - Batch Avg
```

---

## 7.3 Admin Journey (Batch Management & Test Authoring)

```
[ Admin Dashboard ]
  - Stat Metric Cards: Batches (12), Students (1,240), Tests (86), Teachers (24)
  - Quick Manage Grid: Classes, Subjects, Lessons, Tests, Staff
          │
          ├──────────────────────────────────────────┐
          │ Tap "+ Add Batch" / Classes              │ Tap "+ Create Test"
          ▼                                          ▼
[ Batch & Subject Manager ]                 [ 4-Step Test Creation Wizard ]
  - Reorder subjects with drag handle        1. Settings: Name, Start/End, +4/-1 marks
  - Hide/Block/Delete action menu            2. Engine: Shuffle, Anti-cheat, Publish mode
  - Lesson Detail: Upload video, add notes   3. Questions: Rich text, KaTeX, Options
  - Master Library Clone Tool                4. Publish / Schedule
          │                                          │
          ▼                                          ▼
[ Student & Teacher Management ]            [ Real-time Test Analytics ]
  - Enroll new student (Address cascade)     - Score distribution bell curve
  - Configure Teacher permissions            - Subject accuracy breakdown
  - Block/Unblock toggle                     - Toughest questions identification
```

---

## 7.4 Teacher Journey (Content Creation & Evaluation)

```
[ Teacher Dashboard ]
  - Assigned Batches Overview
  - Quick Video Upload & Draft Tests
          │
          ├──────────────────────────────────────────┐
          ▼                                          ▼
[ Lesson Content Builder ]                  [ Create Test (Assigned Batch) ]
  - Attach YouTube / MP4 video lecture       - Context auto-detected from lesson
  - Upload PDF lecture notes                 - Add questions or import from CSV
  - Create Lesson-specific quiz              - Preview KaTeX math rendering
          │                                          │
          ▼                                          ▼
[ Batch Performance Analytics ]             [ Student Query & Doubt Review ]
  - View average accuracy                    - Review flagged student questions
  - Identify weak students                   - Add custom solution hints
```

---

## 7.5 Super Admin Journey (Platform Governance)

```
[ Super Admin Portal ]
  - Global Metrics: Total Institutes, Active Students, System Uptime
  - Multi-tenant Tenant Provisioning
          │
          ├──────────────────────────────────────────┐
          ▼                                          ▼
[ Institute Management ]                    [ Global System Audits ]
  - Onboard new coaching institute           - Review admin activity logs
  - Assign subscription plan & seat quotas   - Monitor Redis queue throughput
  - Force-suspend delinquent tenants         - Database health checks
```
