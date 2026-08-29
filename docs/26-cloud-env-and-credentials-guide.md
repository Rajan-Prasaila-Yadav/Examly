# 26 — Cloud Setup, Environment Variables & Credentials Guide

This guide provides a **click-by-click, step-by-step tutorial** for setting up all free-tier cloud services (Supabase PostgreSQL, Cloudflare R2 Storage, Google OAuth, Upstash Redis, Resend Email, and FCM) and configuring your environment variables.

> **Zero Local Hosting Policy:** All development and testing connects directly to managed cloud services (Supabase, Cloudflare R2, Upstash), ensuring 100% production fidelity at all times.

---

## 26.1 Environment Files Summary Map

When setup is complete, you will place your keys in the following 3 files:

```
examly/
├── .env                  # Monorepo root environment
├── apps/api/.env         # NestJS backend API environment
├── apps/web/.env.local   # Next.js web admin environment
└── database/.env         # Prisma CLI database connection
```

---

## 26.2 Service 1: Supabase (Cloud PostgreSQL Database)

Supabase provides a free hosted PostgreSQL 16 database with 500 MB storage and automatic connection pooling.

### Step-by-Step Instructions:
1. **Open Website:** Navigate to [https://supabase.com](https://supabase.com) and click **"Start your project"** / Sign in with GitHub.
2. **Create New Project:**
   - Click **"+ New Project"**.
   - **Name:** Type `examly-production` (or `examly-dev`).
   - **Database Password:** Click **"Generate a password"** or enter a strong password (e.g. `ExamlySecureDb2026!`). ⚠️ **Copy this password immediately into Notepad!**
   - **Region:** Choose `South Asia (Mumbai)` or `Southeast Asia (Singapore)` for lowest latency in Nepal.
   - **Pricing Plan:** Select **Free ($0/month)**.
   - Click **"Create new project"** (takes ~60 seconds to provision).
3. **Get Connection Strings:**
   - In the left sidebar, click the **Settings** (gear icon) ➡️ **Database**.
   - Scroll down to the **"Connection string"** section.
   - Click on the **"URI"** tab.
   - Select **"Transaction"** (Mode: Transaction, Port: 6543) or **"Session"** (Port: 5432).
   - Copy the URI string:
     ```
     postgres://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true
     ```
   - Replace `[YOUR-PASSWORD]` with the password you saved in Step 2.
   - Also copy the **Direct connection string** (Port 5432) for Prisma migrations:
     ```
     postgres://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
     ```
4. **Get API Keys:**
   - In the left sidebar, click **Settings** ➡️ **API**.
   - Copy the **Project URL** (e.g., `https://xxxx.supabase.co`).
   - Copy the **anon / public** key.
   - Copy the **service_role / secret** key (for backend admin tasks).

### Variables to Save:
```env
# In database/.env and apps/api/.env
DATABASE_URL="postgres://postgres.xxxx:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgres://postgres.xxxx:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"

SUPABASE_URL="https://xxxx.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 26.3 Service 2: Cloudflare R2 (10 GB Free S3-Compatible Storage)

Cloudflare R2 offers 10 GB free object storage per month with **zero bandwidth/egress fees** for video notes, images, and PDF uploads.

### Step-by-Step Instructions:
1. **Open Website:** Navigate to [https://dash.cloudflare.com](https://dash.cloudflare.com) and log in or register.
2. **Navigate to R2:**
   - In the left sidebar, click **"R2 Object Storage"**.
   - If prompted, enter billing details (R2 has a $0 free tier up to 10 GB; you will not be charged).
3. **Create a Bucket:**
   - Click **"Create bucket"**.
   - **Bucket Name:** `examly-media`
   - **Location:** Select **Automatic** or **Asia-Pacific (APAC)**.
   - Click **"Create Bucket"**.
4. **Enable Public Access / Custom Domain (Optional):**
   - Click on the bucket `examly-media` ➡️ **Settings** tab.
   - Under **"Public access"**, click **"Connect Domain"** or allow the `R2.dev` subdomain for instant image/PDF viewing.
5. **Create API Access Tokens:**
   - Go back to **R2 Overview** ➡️ click **"Manage R2 API Tokens"** (on the right).
   - Click **"Create API token"**.
   - **Token Name:** `examly-backend-token`
   - **Permissions:** Select **"Object Read & Write"**.
   - **Specify bucket:** Choose `examly-media`.
   - **TTL:** Forever (Leave default).
   - Click **"Create API Token"**.
   - ⚠️ **Copy the following values immediately:**
     - **Access Key ID**
     - **Secret Access Key**
     - **Jurisdiction-specific endpoint URL** (e.g., `https://[ACCOUNT_ID].r2.cloudflarestorage.com`)
     - **Account ID**

### Variables to Save:
```env
# In apps/api/.env
STORAGE_DRIVER="r2"
CLOUDFLARE_ACCOUNT_ID="your_account_id_here"
CLOUDFLARE_R2_ACCESS_KEY_ID="your_access_key_id_here"
CLOUDFLARE_R2_SECRET_ACCESS_KEY="your_secret_access_key_here"
CLOUDFLARE_R2_BUCKET_NAME="examly-media"
CLOUDFLARE_R2_PUBLIC_URL="https://pub-xxxx.r2.dev"
```

---

## 26.4 Service 3: Google Cloud Console (Sign in with Google OAuth)

Enables one-tap Google sign-in for Students, Teachers, and Admins.

### Step-by-Step Instructions:
1. **Open Website:** Navigate to [https://console.cloud.google.com](https://console.cloud.google.com) and sign in with your Google account.
2. **Create a Project:**
   - Click the project dropdown at the top-left ➡️ click **"NEW PROJECT"**.
   - **Project Name:** `Examly Platform`
   - Click **"CREATE"**.
3. **Configure OAuth Consent Screen:**
   - In the left sidebar, go to **APIs & Services** ➡️ **OAuth consent screen**.
   - Select **"External"** ➡️ click **"CREATE"**.
   - **App name:** `Examly`
   - **User support email:** Select your Gmail.
   - **Developer contact information:** Enter your Gmail.
   - Click **"SAVE AND CONTINUE"** through Scopes and Test Users.
4. **Create OAuth Client Credentials:**
   - In the left sidebar, click **Credentials** ➡️ click **"+ CREATE CREDENTIALS"** at the top.
   - Select **"OAuth client ID"**.
   - **Application type:** Select **"Web application"**.
   - **Name:** `Examly Web & API Client`
   - **Authorized JavaScript origins:**
     - `http://localhost:3000` (Web dev)
     - `https://your-production-domain.com`
   - **Authorized redirect URIs:**
     - `http://localhost:3000/api/auth/callback/google`
     - `http://localhost:4000/api/v1/auth/google/callback` (Backend API)
   - Click **"CREATE"**.
   - Copy your **Client ID** and **Client Secret**.

### Variables to Save:
```env
# In apps/api/.env and apps/web/.env.local
GOOGLE_CLIENT_ID="xxxx-xxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxx"
GOOGLE_CALLBACK_URL="http://localhost:4000/api/v1/auth/google/callback"
```

---

## 26.5 Service 4: Upstash (Cloud Redis Free Tier)

Upstash provides serverless Redis (10,000 commands/day free) for live test timers, leaderboards, anti-cheat strikes, and rate limiting.

### Step-by-Step Instructions:
1. **Open Website:** Navigate to [https://console.upstash.com](https://console.upstash.com) and sign in with GitHub/Google.
2. **Create Redis Database:**
   - Click **"Create Database"**.
   - **Name:** `examly-redis`
   - **Type:** Regional (Single zone)
   - **Region:** Select `ap-south-1 (Mumbai)` or `ap-southeast-1 (Singapore)`.
   - **TLS (SSL):** Keep **Enabled (Checked)**.
   - Click **"Create"**.
3. **Get Credentials:**
   - Scroll down to the **"Connect your database"** section.
   - Click on the **"Node.js (ioredis)"** tab or **"REST API"** tab.
   - Copy the `REDIS_URL` (starts with `rediss://default:xxxx@xxxx.upstash.io:6379`).
   - Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

### Variables to Save:
```env
# In apps/api/.env
CACHE_DRIVER="redis"
REDIS_URL="rediss://default:xxxx@xxxx.upstash.io:6379"
UPSTASH_REDIS_REST_URL="https://xxxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="xxxx"
```

---

## 26.6 Service 5: Resend (Transactional Email API)

Resend provides 3,000 free emails per month (100/day) for OTP delivery, welcome emails, and scorecards.

### Step-by-Step Instructions:
1. **Open Website:** Navigate to [https://resend.com](https://resend.com) and sign in with GitHub/Google.
2. **Create API Key:**
   - In the left sidebar, click **"API Keys"**.
   - Click **"+ Create API Key"**.
   - **Name:** `examly-backend`
   - **Permission:** Full access
   - Click **"Add"**.
   - ⚠️ Copy your API key (starts with `re_xxxx`).
3. **Default Sender Address:**
   - For initial testing, Resend allows sending from `onboarding@resend.dev` to your registered email address.

### Variables to Save:
```env
# In apps/api/.env
MAIL_DRIVER="resend"
RESEND_API_KEY="re_xxxx"
MAIL_FROM_ADDRESS="Examly <onboarding@resend.dev>"
```

---

## 26.7 Service 6: Firebase Cloud Messaging (FCM Push Notifications)

Enables native push notifications for upcoming tests, live results, and announcements.

### Step-by-Step Instructions:
1. **Open Website:** Navigate to [https://console.firebase.google.com](https://console.firebase.google.com).
2. **Create / Select Project:** Select your `Examly Platform` Google Cloud project.
3. **Generate Service Account Private Key:**
   - Click the **Settings (gear icon)** next to Project Overview ➡️ **Project settings**.
   - Go to the **"Service accounts"** tab.
   - Click **"Generate new private key"** ➡️ click **"Generate key"**.
   - A `.json` file downloads to your computer (e.g., `examly-firebase-adminsdk.json`).
   - Copy the `project_id`, `client_email`, and `private_key` into your environment variables.

### Variables to Save:
```env
# In apps/api/.env
PUSH_DRIVER="fcm"
FIREBASE_PROJECT_ID="examly-platform"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxx@examly-platform.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgk...-----END PRIVATE KEY-----\n"
```

---

## 26.8 Complete Environment Template Files

### 1. `apps/api/.env` (NestJS Backend API)

```env
# ── SERVER CONFIGURATION ──
NODE_ENV=development
PORT=4000
API_PREFIX=api/v1
APP_NAME=Examly
FRONTEND_URL=http://localhost:3000

# ── DATABASE (SUPABASE POSTGRESQL) ──
DATABASE_URL="postgres://postgres.xxxx:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgres://postgres.xxxx:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"

# ── AUTHENTICATION & JWT ──
JWT_ACCESS_SECRET="generate-a-64-character-random-secret-key-here-12345"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="generate-another-64-character-random-secret-key-here-67890"
JWT_REFRESH_EXPIRES_IN="7d"

# ── GOOGLE OAUTH ──
GOOGLE_CLIENT_ID="xxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxx"
GOOGLE_CALLBACK_URL="http://localhost:4000/api/v1/auth/google/callback"

# ── REDIS CACHE & SESSIONS (UPSTASH) ──
CACHE_DRIVER=redis
REDIS_URL="rediss://default:xxxx@xxxx.upstash.io:6379"

# ── STORAGE (CLOUDFLARE R2) ──
STORAGE_DRIVER=r2
CLOUDFLARE_ACCOUNT_ID="xxxx"
CLOUDFLARE_R2_ACCESS_KEY_ID="xxxx"
CLOUDFLARE_R2_SECRET_ACCESS_KEY="xxxx"
CLOUDFLARE_R2_BUCKET_NAME="examly-media"
CLOUDFLARE_R2_PUBLIC_URL="https://pub-xxxx.r2.dev"

# ── EMAIL (RESEND) ──
MAIL_DRIVER=resend
RESEND_API_KEY="re_xxxx"
MAIL_FROM_ADDRESS="Examly <onboarding@resend.dev>"

# ── PUSH NOTIFICATIONS (FIREBASE FCM) ──
PUSH_DRIVER=fcm
FIREBASE_PROJECT_ID="examly-platform"
FIREBASE_CLIENT_EMAIL="xxxx@examly-platform.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# ── VIDEO DRIVER (YOUTUBE / DIRECT) ──
VIDEO_DRIVER=youtube
```

### 2. `database/.env` (Prisma CLI Migrations)

```env
DATABASE_URL="postgres://postgres.xxxx:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgres://postgres.xxxx:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"
```

### 3. `apps/web/.env.local` (Next.js Desktop Web Admin)

```env
NEXT_PUBLIC_APP_NAME=Examly
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID="xxxx.apps.googleusercontent.com"
```
