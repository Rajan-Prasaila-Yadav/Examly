# 02 — Technology Stack & Ports/Adapters

## 2.1 Stack Overview

Examly is architected as a **multi-platform monorepo** with a clean separation between native client apps, desktop web administration, API services, and the database layer.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT TIER                                    │
│   ┌───────────────────────────────────┐ ┌───────────────────────────────┐   │
│   │   Mobile App (iOS & Android)      │ │   Web Admin Panel (Desktop)   │   │
│   │   Flutter 3.x / Dart 3            │ │   Next.js 14+ / React 18      │   │
│   │   (Student, Teacher, Admin Shell) │ │   Tailwind CSS + shadcn/ui    │   │
│   └─────────────────┬─────────────────┘ └───────────────┬───────────────┘   │
└─────────────────────┼───────────────────────────────────┼───────────────────┘
                      │ HTTPS / WSS                       │ HTTPS
                      ▼                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API SERVER TIER                                │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │   NestJS (Node.js TypeScript) — Modular REST & WebSocket API        │   │
│   │   Auth: Passport.js JWT + Refresh Tokens                            │   │
│   │   RBAC: Dynamic Guards & Resource-Action Evaluator                  │   │
│   │   Worker: BullMQ + Redis Background Job Queue                       │   │
│   └───────────────────────────────────┬─────────────────────────────────┘   │
└───────────────────────────────────────┼─────────────────────────────────────┘
                                        │
                      ┌─────────────────┴─────────────────┐
                      ▼                                   ▼
┌───────────────────────────────────────┐ ┌───────────────────────────────────┐
│              DATA TIER                │ │            CACHE TIER             │
│   PostgreSQL (Supabase / Neon / Local)│ │   Redis (Upstash / Local Redis)   │
│   Prisma ORM (Split Schema Domain)    │ │   Sessions, Rate Limits, Rankings │
└───────────────────────────────────────┘ └───────────────────────────────────┘
```

---

## 2.2 Technology Selections & Rationale

| Component | Selected Technology | Why Chosen |
|---|---|---|
| **Mobile App** | **Flutter 3.x (Dart 3)** | Pixel-perfect 60/120fps UI performance across Android and iOS from a single codebase. Native hardware access for screenshot prevention, offline local caching (Hive/Isar), and custom video player controls. |
| **Web Admin** | **Next.js 14+ (App Router)** | High-productivity desktop management UI with server-side rendering, instant data tables, split-pane question authoring, and rich analytics charts. |
| **Backend API** | **NestJS (TypeScript)** | Enterprise-grade architectural structure with Dependency Injection, modular domains, custom Guards for zero-trust RBAC, and native Swagger/OpenAPI documentation generation. |
| **Database & ORM** | **PostgreSQL + Prisma** | Strict relational integrity with foreign keys, JSONB for question options/solutions, and Prisma's `prismaSchemaFolder` for domain-divided schemas (`identity.prisma`, `catalog.prisma`, `test-engine.prisma`, etc.). |
| **Cache & Realtime** | **Redis (Upstash / Local)** | Sub-millisecond leaderboard sorted sets (`ZADD`/`ZREVRANK`), active test state tracking, session invalidation, and rate limiting. |
| **Task Queue** | **BullMQ** | Reliable asynchronous processing for background score computation, automated test auto-submits, email dispatch, and PDF generation. |
| **Rich Text & Math** | **Tiptap + KaTeX** | LaTeX math rendering ($E = mc^2$, integrals, chemical equations) and rich text authoring with inline image uploading. |
| **File / Media Storage** | **Cloudflare R2 / S3 Port** | S3-compatible, zero-egress-fee object storage for PDF notes, user avatars, and question images. |
| **Video Delivery** | **YouTube Unlisted / MP4 Player** | Zero bandwidth cost on launch using unlisted YouTube video embeds + dynamic floating watermark overlay (`Student Name + Roll No`) to deter screen capture. |
| **Push Notifications** | **Firebase Cloud Messaging (FCM)** | Cross-platform push notifications for newly published tests, result announcements, and batch alerts. |
| **Email Service** | **Resend (Free Tier)** | Reliable transactional emails for OTP verification, welcome credentials, and scorecard receipts. |

---

## 2.3 Ports & Adapters (Swap-Without-Rewrite Principle)

Application business logic strictly communicates through **abstract interfaces (Ports)**. Concrete third-party vendor libraries (Adapters) implement these ports. Swapping a service (e.g., Free YouTube → Paid Cloudflare Stream DRM) requires **only updating environment variables**, without altering a single line of business logic.

```
                    ┌───────────────────────────────┐
                    │      NestJS Domain Logic      │
                    │   (Services & Controllers)    │
                    └───────────────┬───────────────┘
                                    │ Calls Port Interface
                                    ▼
                    ┌───────────────────────────────┐
                    │      Service Ports (DIP)      │
                    │   StoragePort · MailPort      │
                    │   VideoPort   · CachePort     │
                    │   PushPort    · SmsPort       │
                    └───────────────┬───────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
┌───────────────────────┐ ┌───────────────────┐ ┌───────────────────────┐
│     Free Adapter      │ │   Local Adapter   │ │     Paid Adapter      │
│  Cloudflare R2 (Free) │ │   Disk / Memory   │ │    AWS S3 / Mux DRM   │
│  Resend Mail (Free)   │ │   Local File Store│ │    Twilio / Sparrow   │
│  YouTube Embed (Free) │ │   Console Logger  │ │    Cloudflare Stream  │
└───────────────────────┘ └───────────────────┘ └───────────────────────┘
```

### Port Configuration Matrix

```env
# Storage Adapter: localdisk | r2 | s3
STORAGE_DRIVER=r2

# Email Adapter: console | resend | smtp
MAIL_DRIVER=resend

# SMS Adapter: stub | sparrow | twilio
SMS_DRIVER=stub

# Video Adapter: youtube | s3mp4 | mux | cloudflare_stream
VIDEO_DRIVER=youtube

# Cache Adapter: memory | redis
CACHE_DRIVER=redis

# Push Adapter: stub | fcm
PUSH_DRIVER=fcm
```
