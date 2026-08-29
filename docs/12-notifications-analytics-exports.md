# 12 — Notifications, Analytics & Data Exports

This document specifies the real-time notification pipeline, institute analytics engines, and formatted reporting exports.

---

## 12.1 Real-Time Notification Pipeline

```
[ Event Trigger (e.g. Test Published) ]
                 │
                 ▼
     [ NestJS Notification Queue ]
                 │
   ┌─────────────┼─────────────┐
   ▼             ▼             ▼
[ In-App Feed ] [ Push (FCM) ] [ Email (Resend) ]
```

### Supported Notification Events:
1. **`TEST_PUBLISHED`:** Broadcast to all students enrolled in the batch when an exam is scheduled or published.
2. **`TEST_RESULT_READY`:** Direct push alert when results are unlocked (`"Your scorecard for CEE Mock 04 is ready!"`).
3. **`NEW_VIDEO_UPLOADED`:** Batch notification when a new chapter lecture goes live.
4. **`ACCOUNT_BLOCKED`:** Security alert with contact instructions.
5. **`ANNOUNCEMENT`:** Broadcast news posted by institute administration.

---

## 12.2 Analytics & Reporting Dashboards

### 12.2.1 Admin & Teacher Test Analytics (`admin-26-test-analytics.png`)
- **Metric Cards:**
  - Average Score: `148/300`
  - Topper Count: `312` students in the >80% percentile bracket
  - Total Attempts: `248 / 320` enrolled students
- **Score Distribution Curve:** Gaussian bell curve plotting student percentage density across score bins.
- **Subject-Wise Accuracy:** Horizontal progress bars showing relative difficulty (e.g. Physics 58%, Chemistry 71%, Biology 64%).
- **Toughest Questions Identification:** Highlights the questions with lowest batch-wide accuracy (e.g. `Q42 • 12% correct`, `Q17 • 19% correct`).
- **Top 3 Leaderboard:** Profile cards showing medals (Gold, Silver, Bronze) with scores.

---

## 12.3 Automated PDF & Excel Exports

### 12.3.1 Pixel-Perfect PDF Export (Playwright / Puppeteer / pdfmake)
- **Branded Report Header:** Institute Logo, Name, Affiliation, and dynamic timestamp.
- **Student Performance Summary:** Score gauge, breakdown table, and category accuracy.
- **Full Test Question Paper + Solution Key:** Formatted KaTeX mathematical typesetting with correct answers highlighted in green and explanations below each item.

### 12.3.2 Structured Excel (.xlsx) Batch Exports (ExcelJS)
- **Batches Report:** Batch names, total enrolled students, active subjects, total tests conducted.
- **Student Performance Ledger:** Columns for `Roll No`, `Full Name`, `Phone`, `Tests Taken`, `Average %`, `Rank`, and `Status`.
- **Test Score Matrix:** Matrix grid of Students vs Test Scores with conditional formatting for top 10% (green) and failing scores (red).
