# 20 — Repository & Monorepo Structure

Examly is maintained as a single, well-structured monorepo containing the Flutter mobile application, Next.js web admin portal, NestJS backend API, and Prisma database schema.

---

## 20.1 Root Directory Map

```
examly/
├── apps/
│   ├── mobile/                    # Flutter 3.x Native Mobile App (iOS & Android)
│   │   ├── lib/
│   │   │   ├── app/               # App configuration, router, themes
│   │   │   ├── core/              # Network client, storage, security, constants
│   │   │   ├── features/          # Domain feature modules
│   │   │   │   ├── auth/          # Login, OTP, reset password
│   │   │   │   ├── admin/         # Admin shell, batches, subjects, tests
│   │   │   │   ├── teacher/       # Teacher shell, lectures, assigned batches
│   │   │   │   ├── student/       # Student shell, live test, video player
│   │   │   │   └── super_admin/   # Super admin shell
│   │   │   └── shared/            # Reusable UI widgets, buttons, dialogs
│   │   ├── android/               # Android native configuration (FLAG_SECURE)
│   │   ├── ios/                   # iOS native configuration
│   │   └── pubspec.yaml           # Flutter dependencies
│   │
│   ├── web/                       # Next.js 14+ Desktop Web Admin Portal
│   │   ├── app/                   # Next.js App Router
│   │   │   ├── (auth)/            # Web sign-in & reset
│   │   │   ├── (dashboard)/       # Admin & Teacher desktop management views
│   │   │   │   ├── batches/       # Batch CRUD & reordering
│   │   │   │   ├── tests/         # 4-step wizard & split-pane question editor
│   │   │   │   ├── students/      # Student directory & address cascade
│   │   │   │   └── settings/      # Dynamic role matrix
│   │   │   └── layout.tsx
│   │   ├── components/            # shadcn/ui + Tailwind components
│   │   └── package.json
│   │
│   └── api/                       # NestJS Standalone Backend REST & WS API
│       ├── src/
│       │   ├── main.ts            # Bootstrap, Swagger, Global Pipes
│       │   ├── modules/           # Business domain modules
│       │   │   ├── auth/          # JWT, Passport, Sessions, Blacklist
│       │   │   ├── catalog/       # Batches, Subjects, Lessons, Resources
│       │   │   ├── test-engine/   # Wizard, Live Attempt, Evaluation, Math
│       │   │   ├── users/         # Students, Teachers, Profiles, Roles
│       │   │   └── notification/  # FCM Push, In-app feeds, Resend emails
│       │   ├── platform/          # Infrastructure services
│       │   │   ├── rbac/          # Dynamic Guards & Permission Evaluator
│       │   │   ├── audit/         # Audit logging middleware
│       │   │   └── export/        # PDF & Excel generators
│       │   ├── ports/             # Service Port Interfaces (DIP)
│       │   └── adapters/          # Pluggable Adapters (R2, YouTube, Resend)
│       └── package.json
│
├── database/                      # Prisma PostgreSQL Database
│   ├── prisma/
│   │   └── schema/                # Domain-Divided Prisma Schemas
│   │       ├── base.prisma        # Datasource & Generator configs
│   │       ├── enums.prisma       # Global system enums
│   │       ├── identity.prisma    # Users, Roles, Permissions, Sessions
│   │       ├── catalog.prisma     # Batches, Subjects, Lessons, Resources
│   │       └── test-engine.prisma # Tests, Questions, Attempts, Results
│   ├── migrations/                # Version-controlled SQL migrations
│   └── seeds/                     # Initial super admin & sample batch seeds
│
├── docs/                          # Comprehensive System Documentation (00–23)
├── docker-compose.yml             # Local PostgreSQL + Redis development environment
└── package.json                   # Monorepo Workspace Configuration
```
