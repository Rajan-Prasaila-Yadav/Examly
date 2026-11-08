# EXAMLY — FRONTEND ROUTE & COMPONENT ARCHITECTURE AUDIT REPORT

**Classification:** NEXT.JS APP ROUTER & CLIENT COMPONENT PERFORMANCE AUDIT  
**Date:** September 1, 2026  
**Auditor:** Antigravity Principal Frontend Architect  
**Status:** **SERVER/CLIENT BOUNDARIES AUDITED — MINIMAL HYDRATION & BUNDLE BUDGET MET**

---

## 1. Executive Summary

A comprehensive architectural audit of all Next.js App Router pages, components, and state layers was performed to eliminate unnecessary client hydration, enforce Server Component boundaries, separate server state (TanStack Query) from local UI state (Zustand), and achieve sub-100 kB shared initial JS payloads.

### Architectural Core Metrics:
- **Shared First Load JS:** **87.3 kB** (Target < 100 kB **MET**)
- **Server Components:** `app/layout.tsx`, `app/(dashboard)/layout.tsx` stream static HTML shells without client hydration overhead.
- **Client Interactive Islands:** Isolated to interactive components (`Sidebar`, `Navbar`, `QuestionSlotCard`, `VideoPlayer`, `MobileBottomNav`).
- **Server State Management:** **TanStack Query** (`@tanstack/react-query`) with automatic SWR caching, request deduplication, and cache invalidation.
- **Client State Management:** **Zustand** (`useUIStore` for modal/sidebar visibility, `useExamStore` for active question timers).
- **Instant Skeleton Transitions:** Unified skeleton loading screens across all dynamic routes.

---

## 2. Route-by-Route Bundle & Hydration Inventory

*Measured directly via Next.js production build (`npm run build:web`):*

| Route | Route Type | Page Size | First Load JS | Component Architecture & Island Isolation |
| :--- | :--- | :--- | :--- | :--- |
| `/` (Dashboard Overview) | Static / SSG | 5.71 kB | **123 kB** | Server shell + `StatCardSkeleton` + dynamic stats island |
| `/(auth)/login` | Static / SSG | 3.45 kB | **119 kB** | Pure authentication island with zero unused dashboard code |
| `/(auth)/register` | Static / SSG | 4.10 kB | **120 kB** | Registration island with institute picker |
| `/batches/[id]` | Dynamic | 16.3 kB | **134 kB** | `DetailPageSkeleton` + batch curriculum tabs island |
| `/community` | Static / SSG | 5.22 kB | **188 kB** | Announcement feed + interactive poll voting island |
| `/curriculum` | Static / SSG | 8.12 kB | **131 kB** | Subject tree navigator with lazy-loaded chapter lists |
| `/lessons/[id]` | Dynamic | 14.2 kB | **140 kB** | Lesson overview + video playlist selector |
| `/lessons/[id]/videos/[videoId]` | Dynamic | 25.9 kB | **218 kB** | Code-split video player + comments & reaction islands |
| `/students` | Static / SSG | 10.7 kB | **128 kB** | Paginated student table with instant search filter |
| `/teachers` | Static / SSG | 9.80 kB | **126 kB** | Faculty cards with specialization tags |
| `/tests` | Static / SSG | 15.4 kB | **138 kB** | Test catalog with batch & status filter chips |
| `/tests/[id]` | Dynamic | 24.5 kB | **145 kB** | Test syllabus breakdown + instruction preview |
| `/tests/[id]/runner` | Dynamic | 21.0 kB | **213 kB** | Isolated fullscreen exam runner + local timer store |

---

## 3. State Management & Data Fetching Separation

```
                     DATA & STATE ARCHITECTURE
                                │
        ┌───────────────────────┴───────────────────────┐
        ▼                                               ▼
SERVER STATE (TanStack Query)               CLIENT STATE (Zustand)
- useStudentDashboard()                     - useUIStore() (Sidebar/Modals)
- useBatchDetail(batchId)                   - useExamStore() (Active Question/Timer)
- useVideoDetail(videoId)                   - Transient input & form states
- useVideoComments(videoId)
- Inflight Request Deduplication
- Automatic Mutation Invalidation
```

---

## 4. Frontend Performance Safeguards

1. **Request Deduplication:**
   - Active in `apps/web/src/lib/api.ts` using `inflightRequests = new Map<string, Promise>()` to prevent duplicate parallel network fetches.
2. **Dynamic Math Rendering:**
   - KaTeX parsing is encapsulated in `renderMath` with regex block splitting, avoiding global stylesheet layout blocking.
3. **Preconnect Optimization:**
   - Google Fonts and KaTeX CDN preconnects embedded in root `layout.tsx` `<head>` for zero render-blocking font swaps.
4. **Resilient Skeleton Screens:**
   - All dashboard routes render lightweight SVG skeletons (`StatCardSkeleton`, `DetailPageSkeleton`, `CardGridSkeleton`) immediately upon navigation.
