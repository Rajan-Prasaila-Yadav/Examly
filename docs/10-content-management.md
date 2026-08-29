# 10 — Content & Media Management

Examly provides a flexible 4-tier content management hierarchy designed for fast curriculum structuring and bulk reuse across academic terms.

---

## 10.1 Four-Tier Content Architecture

```
[ Batch (e.g., CEE 2026 Batch A) ]
  └── [ Subject (e.g., Physics) ]
        └── [ Lesson / Chapter (e.g., 01 Mechanics) ]
              ├── [ Video Lectures ] (YouTube unlisted / direct MP4)
              ├── [ Chapter Tests ]  (Lesson-level assessment)
              ├── [ PDF Notes ]      (Downloadable / in-app viewer)
              └── [ Resources Tree ] (Nested folders with slides & question banks)
```

---

## 10.2 Bidirectional Content Copying & Master Library

Institutes often re-use standardized curricula across multiple batches (e.g., Morning Batch vs Evening Batch). Examly supports **deep bidirectional cloning**:

```
┌─────────────────────────────────────────────────────────────┐
│                 INSTITUTE MASTER LIBRARY                    │
│   (Centralized Repository of Master Subjects & Lessons)     │
└──────────────┬──────────────────────────────▲───────────────┘
               │ Copy Down                    │ Publish Up
               ▼                              │
┌──────────────────────────────┐ ┌────────────┴───────────────┐
│     Batch: CEE 2026 Batch A  │ │    Batch: IOE 2026 Batch B │
│   - Physics / Mechanics      │ │  - Physics / Mechanics     │
│     (copiedFromId logged)    │ │    (copiedFromId logged)   │
└──────────────────────────────┘ └────────────────────────────┘
```

1. **Copy with Independence:** Cloned lessons are snapshot copies. Modifying questions or video links inside Batch A does not mutate Batch B.
2. **Provenance Tracking:** Every copied entity maintains `copiedFromId` for content lineage and audit visibility.

---

## 10.3 Nested Resource Folder System

Lessons feature an in-depth file explorer (as visible in reference mockup `admin-05-lesson-detail.png`):

```
📂 01 Mechanics
    ├── 📁 Lecture Slides
    │     └── 📄 01_Mechanics_Notes.pdf
    ├── 📁 Question Banks
    │     └── 📄 Mechanics_Question_Bank.docx
    └── 🌐 Khan Academy – Newton's Laws of Motion [External Link]
```

- **CRUD Operations:** Teachers and Admins can create unlimited nested folders, upload documents, and organize resources by drag-and-drop.
- **Student Access:** Students browse the folder tree directly in mobile and web viewers with secure one-click downloads.

---

## 10.4 Video Delivery & Leak Deterrence

1. **Free Tier Setup:** Videos are uploaded as unlisted YouTube links or stored as MP4 files on Cloudflare R2 / local storage.
2. **Dynamic Floating Watermark Overlay:** During video playback on mobile and web, the player continuously renders a dynamic semi-transparent floating badge containing:
   $$\text{Student Full Name} + \text{Roll Number} + \text{Institute Code}$$
   This deters phone-camera recording and screenshot leaks.
3. **Upgrade Seam:** Switching to DRM (Mux / Cloudflare Stream signed URLs) requires only setting `VIDEO_DRIVER=cloudflare_stream` without database modifications.
