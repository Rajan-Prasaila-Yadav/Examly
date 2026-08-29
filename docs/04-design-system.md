# 04 — Design System & Visual Tokens

Examly's design language combines the **clean academic structure of Coursera**, the **intuitive interaction familiarity of Facebook**, and the **focused visual immersion of MX Player**. 

The color tokens below were extracted directly from `base.apk` (Note Swift package `com.noteswift`) and refined against the high-fidelity UI reference mockups.

---

## 4.1 Color System & Tokens

### 4.1.1 Brand Colors

| Token Name | Light Mode (Hex) | Dark Mode (Hex) | Usage |
|---|---|---|---|
| `--color-primary` | `#0079D8` | `#38BDF8` | Core brand blue, primary buttons, active tab indicators, app bar titles |
| `--color-primary-dark`| `#023C69` | `#0369A1` | Deep header backgrounds, admin dashboard cards, high-contrast badges |
| `--color-primary-gradient`| `linear-gradient(135deg, #0079D8 → #2B6CB0)` | `linear-gradient(135deg, #0284C7 → #0369A1)` | Hero banner headers, submit buttons, result celebrations |
| `--color-accent-violet`| `#9333EA` | `#A855F7` | Test badges, lesson unit indicators, score gauge highlights |
| `--color-accent-gradient`| `linear-gradient(135deg, #6366F1 → #9333EA)` | `linear-gradient(135deg, #818CF8 → #C084FC)` | Special exam badges, topper awards, premium features |

### 4.1.2 Semantic & Status Colors

| Semantic State | Light Mode | Dark Mode | Application |
|---|---|---|---|
| **Success / Active / Correct** | `#16A34A` (`#DCFCE7` bg) | `#4ADE80` (`#14532D` bg) | Correct options in review, Passed badges, Active status pill |
| **Warning / Review / Pending** | `#D97706` (`#FEF3C7` bg) | `#FBBF24` (`#78350F` bg) | Marked for review, trial countdown, cheating warnings |
| **Danger / Blocked / Wrong** | `#DC2626` (`#FEE2E2` bg) | `#F87171` (`#7F1D1D` bg) | Wrong options in review, Blocked teacher/student, Delete actions |
| **Info / Scheduled / Neutral** | `#2563EB` (`#DBEAFE` bg) | `#60A5FA` (`#1E3A8A` bg) | Hidden content indicator, scheduled test badges, info tooltips |

### 4.1.3 Question Palette Status Colors (Exam Engine)

```
┌─────────────────┬───────────┬───────────────────────────────────────────┐
│ State           │ Color Hex │ Meaning                                   │
├─────────────────┼───────────┼───────────────────────────────────────────┤
│ Answered        │  #16A34A  │ Solid Green: Question saved & submitted   │
│ Mark for Review │  #9333EA  │ Solid Purple: Marked for later inspection │
│ Unanswered      │  #DC2626  │ Solid Red: Visited but no option chosen   │
│ Not Visited     │  #94A3B8  │ Solid Gray: Never opened by student       │
└─────────────────┴───────────┴───────────────────────────────────────────┘
```

### 4.1.4 Neutral Surface & Typography Colors

```
Light Mode:
  --bg-app:        #F8F8FA    (Soft neutral background)
  --surface-card:  #FFFFFF    (Pure white card surface)
  --surface-muted: #F1F5F9    (Subtle container fill / input field)
  --border-subtle: #E2E8F0    (1px hairline card borders)
  --text-primary:  #0F172A    (High-contrast dark slate)
  --text-muted:    #64748B    (Secondary subtitles & metadata)

Dark Mode:
  --bg-app:        #0F172A    (Deep slate background)
  --surface-card:  #1E293B    (Elevated dark card surface)
  --surface-muted: #334155    (Input fields & active containers)
  --border-subtle: #334155    (Card borders)
  --text-primary:  #F8FAFC    (Crisp white typography)
  --text-muted:    #94A3B8    (Secondary muted gray)
```

---

## 4.2 Typography Hierarchy

Extracted from decompiled font assets (`inter_*.ttf`, `jetbrains_mono_*.ttf`, `roboto_medium_numbers.ttf`):

| Role | Font Family | Weights | Usage |
|---|---|---|---|
| **Headings & Titles** | **Plus Jakarta Sans / Inter** | SemiBold (600), Bold (700) | Screen titles, batch cards, modal headers |
| **Body & UI** | **Inter** | Regular (400), Medium (500) | Question text, options, descriptions, buttons |
| **Data & Timers** | **JetBrains Mono / Roboto Numbers** | Regular (400), Medium (500) | Exam countdown, marks calculation, roll numbers |
| **Devanagari (नेपाली)** | **Noto Sans Devanagari** | Regular (400), Bold (700) | Nepali/Hindi questions, notes, and local names |

### Type Scale (Desktop & Mobile)

```
Display:   32px / 1.2 line-height  (Hero titles, Result percentages)
H1:        24px / 1.3 line-height  (Screen headers, Admin dashboard greetings)
H2:        20px / 1.3 line-height  (Card titles, Section headers)
H3:        16px / 1.4 line-height  (Question text, Form labels)
Body:      14px / 1.5 line-height  (Default text, option labels)
Caption:   12px / 1.4 line-height  (Metadata, timestamps, pill badges)
Overline:  10px / 1.2 line-height  (All-caps section tags)
```

---

## 4.3 Spacing, Radius & Elevation

### 4.3.1 Spacing (4px Base Grid)
`4px (xxs) · 8px (xs) · 12px (sm) · 16px (md) · 20px (lg) · 24px (xl) · 32px (2xl) · 48px (3xl)`

### 4.3.2 Border Radius
- **Inputs & Standard Buttons:** `12px` (Soft rounded)
- **Cards & Bottom Sheets:** `16px` to `24px` (Modern card container)
- **Status Pills & Avatars:** `9999px` (Full pill circle)

### 4.3.3 Elevation & Shadows
- **Card Shadow (Light):** `0px 4px 20px rgba(0, 0, 0, 0.05)`
- **FAB & Floating Bar Shadow:** `0px 10px 25px rgba(0, 121, 216, 0.25)`
- **Dark Mode Elevation:** Border hairline (`#334155`) with subtle glow rather than heavy black shadows.

---

## 4.4 Global UI Component Patterns

### 4.4.1 Primary Action Button
- Background: Gradient `#0079D8` to `#2B6CB0` (or Indigo-Violet for test actions).
- Height: `52px` (Mobile touch target), `44px` (Desktop).
- Corner Radius: `14px`.
- Typography: 15px SemiBold, White text with subtle active press animation (`scale(0.98)`).

### 4.4.2 Global Action Set (List Items)
Every list card (Batch, Subject, Lesson, Question, User) features a standard action icon menu:
- ✏ **Edit:** Opens editor form modal / screen.
- 👁 **Hide / Unhide:** Toggles student-side visibility.
- 🔒 **Lock / Unlock:** Enforces sequence completion or manual access.
- ⛔ **Block / Unblock:** Restricts user access immediately.
- 🗑 **Delete:** Prompts soft-delete confirmation dialog.

### 4.4.3 Question Option Selection State
- **Default State:** White/Dark card with 1px border (`#E2E8F0`), radio circle, letter identifier (`A`, `B`, `C`, `D`).
- **Selected State:** Blue/Violet border (`2px #0079D8`), soft tint background (`#EFF6FF`), filled radio with active dot.
- **Review Mode (Correct):** Solid Green border (`#16A34A`), light green background (`#DCFCE7`), checkmark icon.
- **Review Mode (Wrong - Selected by Student):** Solid Red border (`#DC2626`), light red background (`#FEE2E2`), cross icon.
