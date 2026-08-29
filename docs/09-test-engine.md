# 09 — Examination Engine Specification

The Test Engine is the centerpiece of the Examly platform, delivering server-authoritative integrity, flexible question modeling, and high-concurrency evaluation.

---

## 9.1 Context Auto-Detection in Test Authoring

When an educator clicks **"+ Create Test"**, the system automatically detects and fills the hierarchical context depending on where the action was triggered:

```
Triggered From:                   Auto-Filled Level & Scope:
─────────────────────────────────────────────────────────────────────────────
Batches screen / Global FAB  ──►  Level: BATCH_LEVEL (User selects Batch)
Inside a Subject screen      ──►  Level: SUBJECT_LEVEL (Auto-binds Batch + Subject)
Inside a Lesson screen       ──►  Level: LESSON_LEVEL (Auto-binds Batch + Subject + Lesson)
```

---

## 9.2 The 4-Step Test Authoring Wizard

```
   [1. Settings] ────────► [2. Engine] ────────► [3. Questions] ────────► [4. Publish]
   • Title & Desc          • Shuffle Qs/Options  • Rich-Text & KaTeX     • Final Review
   • Batch/Subject Level   • Late Join Window    • 8 Question Types      • Instant Publish
   • Start & End Times     • Anti-Cheat Level    • Marking (+4/-1)       • Schedule Later
   • Duration & Pass Mark  • Publish Mode        • Step Solutions        • Save Draft
```

---

## 9.3 Eight Supported Question Types

```
┌───────────────────────────┬─────────────────────────────────────────────────────────┐
│ Question Type             │ Evaluation Logic & Marking Mechanism                    │
├───────────────────────────┼─────────────────────────────────────────────────────────┤
│ 1. Single Correct MCQ     │ 1 Radio option correct. Exact match = +Marks, else -Mark│
├───────────────────────────┼─────────────────────────────────────────────────────────┤
│ 2. Multiple Correct MCQ   │ Checkboxes. Partial marking supported:                  │
│                           │ Score = (Correct Chosen / Total Correct) * PositiveMarks│
│                           │ If any incorrect option selected = NegativeMarks.       │
├───────────────────────────┼─────────────────────────────────────────────────────────┤
│ 3. Numerical Value        │ Student inputs decimal/integer (e.g. `0.0693`).         │
│                           │ Evaluated against numeric tolerance range `[Min, Max]`. │
├───────────────────────────┼─────────────────────────────────────────────────────────┤
│ 4. Fill in the Blank      │ Text string comparison. Case-insensitive normalization. │
├───────────────────────────┼─────────────────────────────────────────────────────────┤
│ 5. Assertion & Reason     │ Specialized 4-radio option layout for competitive tests.│
├───────────────────────────┼─────────────────────────────────────────────────────────┤
│ 6. Matrix Match           │ Match items from Column A (p, q, r) to Column B (1, 2). │
├───────────────────────────┼─────────────────────────────────────────────────────────┤
│ 7. True / False           │ Binary selection toggle.                                │
├───────────────────────────┼─────────────────────────────────────────────────────────┤
│ 8. Descriptive            │ Subjective long answer with optional student image scan.│
└───────────────────────────┴─────────────────────────────────────────────────────────┘
```

---

## 9.4 Late-Join Shrinking Window Math

To ensure complete fairness during synchronized competitive batch exams, the actual time allocated to a late-joining student shrinks dynamically according to the formula:

$$\text{Effective Duration} = \min\left(\text{Allocated Duration}, \; \text{Test End Time} - \text{Current Server Time}\right)$$

### Worked Example:
- **Test Window:** 07:00 AM to 08:00 AM (Allocated Duration = 60 Minutes)
- **Student A Joins at 07:00 AM:**
  $$\text{Effective Duration} = \min(60, \; 08:00 - 07:00) = \mathbf{60\text{ minutes}}$$
- **Student B Joins at 07:25 AM:**
  $$\text{Effective Duration} = \min(60, \; 08:00 - 07:25) = \mathbf{35\text{ minutes}}$$
- **Student C Joins after 08:00 AM:** Rejected (`Test Window Closed`).

---

## 9.5 Anti-Cheat & Proctoring Engine

Examly implements an honest, non-intrusive mobile and web proctoring system:

```
                      [ Live Test in Progress ]
                                  │
                  ┌───────────────┴───────────────┐
                  ▼                               ▼
      [ Tab Switch / App Blur ]         [ Developer Tools / Split ]
                  │                               │
                  ▼                               ▼
       Strike Counter Increments (+1) ──► Red Banner Alert
                  │                       "Cheating attempt detected (1/3)"
                  │
                  ├── Strikes < 3  ──► Allow continuation
                  └── Strikes == 3 ──► Auto-Submit Attempt Immediately
```

1. **Hardware Screenshot & Recording Blocking:** Mobile app uses `FLAG_SECURE` (Android) and screen-capture prevention (iOS).
2. **App Blur & Visibility Loss Tracker:** If the student minimizes the app or opens another window, a red warning toast displays: `"Cheating attempt detected (1/3) — Please don't leave the test screen"`.
3. **Auto-Submit on Strike 3:** Exceeding maximum allowed strikes locks the exam and triggers immediate evaluation.

---

## 9.6 Server-Authoritative Scoring & Ranking Calculation

### 9.6.1 Score Calculation Formula

$$\text{Total Score} = \sum (\text{Correct Marks}) - \sum (\text{Negative Marks})$$

$$\text{Percentage} = \left(\frac{\text{Total Score}}{\text{Total Maximum Marks}}\right) \times 100$$

### Worked Example (from Mockup `admin-13-submitted-result-summary.png`):
- Total Questions: 50 | Marks per Correct: $+4$ | Negative Mark: $-1$ | Total Max Marks: 200
- **Student Results:**
  - Correct Answers: 38 ($\times 4 = +152$)
  - Wrong Answers: 4 ($\times -1 = -4$)
  - Unanswered: 8 ($= 0$)
  - **Final Score:** $152 - 4 = \mathbf{148 / 200}$
  - **Percentage:** $\frac{148}{200} \times 100 = \mathbf{74\%}$
  - **Pass Status (Threshold 40%):** $\mathbf{PASSED}$

### 9.6.2 Leaderboard Ranking & Tiebreaker Hierarchy
When multiple students achieve the identical total score, rank is computed using Redis Sorted Sets with a secondary tiebreaker:
1. **Primary:** Highest `Total Score` (Descending).
2. **Secondary Tiebreaker:** Lowest `Duration Seconds` (Ascending — fastest submission wins).
3. **Tertiary Tiebreaker:** Lowest `Total Wrong Answers` (Ascending — higher accuracy wins).
