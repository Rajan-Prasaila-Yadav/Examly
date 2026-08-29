# 23 — Phased Implementation & Deployment Roadmap

This document maps the sprint-by-sprint development plan to take Examly from zero to commercial multi-tenant deployment.

---

## 23.1 Phase Breakdown

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     PHASE 0     │────►│     PHASE 1     │────►│     PHASE 2     │────►│     PHASE 3     │
│   Foundations   │     │    Core MVP     │     │   Deep Engine   │     │ Scale & Monetize│
│   (Weeks 1–3)   │     │   (Weeks 4–8)   │     │  (Weeks 9–14)   │     │  (Weeks 15–20)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Phase 0: Project Foundations & Infrastructure (Weeks 1–3)
- [x] APK Decompilation & Design Token extraction (Completed).
- [x] Complete Architectural Documentation & Schema Specification (Completed).
- [ ] Initialize Git Monorepo (`apps/mobile`, `apps/web`, `apps/api`, `database`).
- [ ] Setup Docker Compose for local PostgreSQL 16 & Redis 7.
- [ ] Implement NestJS Base Auth Module (JWT, Refresh tokens, User sessions).
- [ ] Establish Flutter project structure, GoRouter, Riverpod state management, and Light/Dark themes.

### Phase 1: Core MVP & Content Pipeline (Weeks 4–8)
- [ ] 4-Tier Catalog CRUD (Batches, Subjects, Lessons, Resource Folders).
- [ ] YouTube Video Embed & Cloudflare R2 PDF note viewer.
- [ ] Admin & Teacher Dashboard with Quick Manage navigation.
- [ ] Student Batch Navigator & Video Lecture Player with Dynamic Watermarking.
- [ ] Dynamic RBAC Guard Pipeline in NestJS.

### Phase 2: Live Test Engine & Analytics (Weeks 9–14)
- [ ] 4-Step Test Authoring Wizard (Settings, Engine, Questions, Publish).
- [ ] 8 Question Types with KaTeX math formula rendering.
- [ ] Live Exam Screen with Question Palette, Timer Countdown, and Anti-Cheat strike detector.
- [ ] Automated Scoring Engine with negative marking and shrinking late-join windows.
- [ ] Result Summary, Step-by-Step Solution Viewer, and Batch Leaderboards.

### Phase 3: Scaling, Multi-Tenancy & Platform Governance (Weeks 15–20)
- [ ] Super Admin Tenant Management Portal & Institute Onboarding.
- [ ] PDF Scorecard & Excel Ledger batch export workers.
- [ ] Push Notification system via Firebase Cloud Messaging (FCM).
- [ ] Nepal Payment Gateway integration (eSewa / Khalti).
- [ ] Production deployment on Railway / Render / Supabase / Upstash.
