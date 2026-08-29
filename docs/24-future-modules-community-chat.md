# 24 — Future Modules: In-App Community Feed & 1-on-1 Doubt Chat

This document details the architectural specification for upcoming social learning and doubt-solving modules designed to replace fragmented external WhatsApp/Facebook groups with a secure, centralized in-app ecosystem.

---

## 24.1 Module 1: In-App Community Feed & Rich Announcements

```
┌─────────────────────────────────────────────────────────────┐
│                 INSTITUTE COMMUNITY WALL                    │
│   (Centralized Feed Replacing External WhatsApp Groups)     │
└──────────────┬──────────────────────────────▲───────────────┘
               │ Broadcast                    │ Student Engage
               ▼                              │
┌──────────────────────────────┐ ┌────────────┴───────────────┐
│       Target Audience        │ │      Engagement Loop       │
│  - All Enrolled Students     │ │  - 1 Reaction Per User     │
│  - Specific Batches (CEE/IOE)│ │  - Threaded Discussions    │
│  - Faculty & Staff Only      │ │  - Pinned Teacher Replies  │
│  - Scheduled / Instant Post  │ │  - Interactive Batch Polls │
└──────────────────────────────┘ └────────────────────────────┘
```

### 24.1.1 Rich Announcement Creator (Admin & Teachers)
- **Rich Text Content:** Bold/Italic, bulleted lists, inline LaTeX/KaTeX math formulas, hyperlinks.
- **Media Attachments:** Multi-image gallery upload (up to 10 images), attached PDF handouts, and video previews.
- **Publishing Controls:**
  - `Publish Immediately` vs `Schedule Date & Time`.
  - `Target Audience`: All Institute Students, Specific Batch (e.g. `CEE 2026 Batch A`), or Instructors Only.
  - `Allow Comments`: Toggle to enable/disable student discussions.

### 24.1.2 Engagement & Single-Reaction Engine
- **Single Reaction Rule:** A student or teacher can react with exactly **one** emoji (`👍 Like`, `❤️ Love`, `💡 Helpful`, `👏 Bravo`, `🎉 Celebrate`). Tapping another emoji replaces the previous reaction.
- **Threaded Comment Tree:** Top-level student queries with instructor nested replies and pinned instructor announcements.
- **Interactive Batch Polls:**
  - Single-choice or multiple-choice questions.
  - Real-time vote percentage bars updated dynamically via WebSockets.

---

## 24.2 Module 2: Dedicated 1-on-1 Doubt Solving System

To prevent distractions and student-to-student harassment, the messaging system is strictly constrained to **Teacher/Admin ↔ Student 1-on-1 channels only**. Student-to-student direct messaging is disabled platform-wide.

```
                  ┌──────────────────────────────┐
                  │       STUDENT ACCOUNT        │
                  └──────────────┬───────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼ (Allowed)                     ▼ (Allowed)
     ┌────────────────────────┐      ┌────────────────────────┐
     │   Assigned Faculty     │      │   Institute Admin      │
     │   (Subject Doubts)     │      │   (Billing / Support)  │
     └────────────────────────┘      └────────────────────────┘
                 │                               │
                 └───────────────┬───────────────┘
                                 ▼
                     [ ❌ Student-to-Student ]
                           (Blocked)
```

### 24.2.1 Real-Time Presence & Status Indicators
- **Online State:** Solid Green dot (`● Online`) displayed alongside the teacher's profile.
- **Offline State:** Muted text showing last active time (`Last seen today at 04:15 PM`).

### 24.2.2 Dual File Viewer & Native PDF Annotation Engine
1. **Interactive Fullscreen Image Viewer:** Pinch-to-zoom, pan, rotation, and high-resolution inspection of handwritten homework questions.
2. **Native PDF Annotation Toolkit:**
   - **Highlighter:** Semi-transparent text highlighter in Yellow, Green, and Sky Blue.
   - **Shapes & Enclosures:** Draw circles, boxes, and arrows around problem steps.
   - **Freehand Pen & Eraser:** Draw mathematical symbols directly on the document.
   - **Text Annotation:** Place typed comment callouts on any page.
   - **Search in PDF:** Real-time keyword search with jump-to-next match.
   - **Page Jumper:** Instant navigation bar with `Jump to Page [ 12 / 84 ]`.

### 24.2.3 Admin-Configurable Quota & Safety Controls

To avoid faculty burnout and system storage abuse, the Administrator configures dynamic limits per batch:

```
┌─────────────────────────────────────────────────────────────┐
│ Admin Chat Quota Settings (Per Student / Daily)             │
├─────────────────────────────────────────────────────────────┤
│ • Daily Message Limit:        [ 20  ] messages per day      │
│ • Daily Image Upload Limit:   [ 20  ] images per day        │
│ • Daily PDF Document Limit:   [ 20  ] PDF files per day     │
│ • Max File Size Limit:        [ 15  ] MB per upload         │
│ • Auto-Reset Time:            [ 12:00 AM (Midnight) ]       │
└─────────────────────────────────────────────────────────────┘
```
