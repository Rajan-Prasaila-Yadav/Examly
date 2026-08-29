# 00 — Mission, Vision & Core Goals

## 0.1 Executive Summary & Mission
**Examly** is a high-performance, multi-tenant learning and examination platform engineered specifically for competitive exam coaching institutes in Nepal and South Asia (CEE, IOE, CSIT, Class 11–12 Science, NEET, JEE). 

**Mission Statement:**  
> *To empower coaching institutes and educators with an enterprise-grade, zero-trust examination and content platform that delivers a seamless native mobile experience for students, an intuitive management suite for teachers and admins, and absolute exam integrity with server-authoritative scoring.*

---

## 0.2 Product Vision (3-Year Horizon)
Examly evolves through three distinct strategic stages:
1. **Stage 1 (Launch — MVP):** The de-facto assessment engine for physical coaching centers in Nepal, digitizing batch tests, question banks, ranking leaderboards, and video lectures.
2. **Stage 2 (Growth & Dynamic RBAC):** Multi-branch institute scaling, granular permission matrix, real-time live proctored mock exams, and rich offline PDF/Excel analytics.
3. **Stage 3 (Ecosystem & Marketplace):** Direct student marketplace for premium national mock tests, integrated localized payment gateways (eSewa, Khalti), and AI-driven weak-area diagnostic insights.

---

## 0.3 Core Goals

| Goal ID | Objective | Measurable Key Result |
|---|---|---|
| **G-01** | **Unified Architecture** | Single backend (NestJS) serving both native mobile apps (Flutter: iOS & Android) and desktop web admin portal (Next.js). |
| **G-02** | **Strict 4-Role RBAC** | Explicit permission boundaries for **Super Admin, Admin, Teacher, and Student** with dynamic permission inheritance and zero-trust verification. |
| **G-03** | **Robust Test Engine** | Support for 8 question types, negative marking, shrinking time windows, automated score computation, and live anti-cheat detection. |
| **G-04** | **Rich Content Pipeline** | 4-tier pedagogical hierarchy (`Batch` → `Subject` → `Lesson` → `Videos/Notes/Tests/Resources`) with bidirectional content copying. |
| **G-05** | **Zero-Cost Free Tier Launch** | Launching with PostgreSQL (Neon/Supabase), Redis (Upstash), Cloudflare R2, and YouTube unlisted embeds with seamless adapter upgrade seams. |
| **G-06** | **Nepali Market Localization** | Support for Devanagari Unicode rendering (KaTeX & Noto Sans), NPR currency formatting (`Rs 1,499`), and administrative address hierarchies (Province/District/Municipality/Ward). |

---

## 0.4 Target Roles & Personas

Examly strictly operates on **4 distinct user roles**:

```
                  ┌─────────────────────────────────────────┐
                  │              SUPER ADMIN                │
                  │   Platform owner, institutes, billing   │
                  └────────────────────┬────────────────────┘
                                       │ provisions
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │                 ADMIN                   │
                  │  Institute manager, batches, staff,     │
                  │  question banks, global settings        │
                  └────────────────────┬────────────────────┘
                                       │ assigns batches
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │                TEACHER                  │
                  │  Course instructor, creates tests,      │
                  │  uploads lectures, tracks batch stats   │
                  └────────────────────┬────────────────────┘
                                       │ assesses
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │                STUDENT                  │
                  │  Learner, attends lectures, takes live  │
                  │  tests, analyzes solutions & ranking    │
                  └─────────────────────────────────────────┘
```

1. **Super Admin (Platform Owner):** Multi-institute tenant management, platform metrics, subscription control, and system audits.
2. **Admin (Institute Principal / Branch Manager):** Complete operational control over batches, subjects, lessons, teachers, student enrollments, test publishing, analytics, and custom role permissions.
3. **Teacher (Instructor / Subject Faculty):** Content creator and evaluator. Manages assigned batches, writes questions, uploads video lectures/notes, and reviews test performance analytics.
4. **Student (Candidate / Learner):** End user. Accesses enrolled batch feeds, streams protected video lectures, reads PDF study materials, sits for timed mock tests, and reviews solution step-by-steps.

---

## 0.5 Non-Goals & Explicit Exclusions
To maintain sharp focus and delivery velocity, the following features are intentionally out of scope for v1:
- ❌ **No Employee / Data-Entry Role:** Simplified to 4 pure roles (Admin, Teacher, Student, Super Admin).
- ❌ **No Heavy Video Transcoding In-House:** Free tier relies on unlisted YouTube embeds + direct storage MP4s; DRM upgrade is modularized via ports.
- ❌ **No WebRTC Live Video Streaming:** Live classes rely on embedded Zoom/Google Meet links rather than custom peer-to-peer streaming servers.
- ❌ **No Automated Gateway Split-Payments:** Fee payments in v1 are offline receipt uploads / admin approval before eSewa automated integration.
