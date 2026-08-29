# 19 — Scoring Math & Mathematical Calculations

This document is the definitive technical reference for all scoring, time calculation, accuracy percentages, and percentile algorithms implemented across the Examly engine.

---

## 19.1 Score Calculation Formula

For any completed attempt with $N$ questions:

$$\text{Final Score} = \sum_{i=1}^N \text{Mark}(q_i)$$

Where for each question $q_i$:

$$\text{Mark}(q_i) = \begin{cases} +P_i & \text{if answer is correct} \\ -M_i & \text{if answer is incorrect and negative marking is enabled} \\ 0 & \text{if question is unattempted or skipped} \end{cases}$$

- $P_i$: Positive marks assigned to question $i$ (Default: $+4.0$)
- $M_i$: Negative penalty marks assigned to question $i$ (Default: $-1.0$)

---

## 19.2 Partial Marking for Multiple-Correct MCQs

For a multiple-correct question with $C_{\text{total}}$ correct options:

$$\text{Awarded Marks} = \begin{cases} -M & \text{if ANY incorrect option is chosen} \\ +P & \text{if ALL correct options are chosen and NO incorrect option} \\ \left(\frac{C_{\text{chosen}}}{C_{\text{total}}}\right) \times P & \text{if partial correct options chosen and NO incorrect option} \end{cases}$$

### Worked Example:
- Correct options: `{A, B, C}` ($C_{\text{total}} = 3$), $P = +4$, $M = -1$
- Student picks `{A, B}`: $\frac{2}{3} \times 4 = \mathbf{+2.67\text{ marks}}$
- Student picks `{A, B, D}` ($D$ is incorrect): $\mathbf{-1.0\text{ mark}}$

---

## 19.3 Percentage & Pass/Fail Evaluation

$$\text{Score Percentage} = \left(\frac{\text{Final Score}}{\text{Maximum Possible Marks}}\right) \times 100$$

$$\text{Pass Status} = \begin{cases} \text{PASSED} & \text{if Final Score} \ge \text{Pass Marks} \\ \text{FAILED} & \text{otherwise} \end{cases}$$

---

## 19.4 Percentile Rank Formula

$$\text{Percentile} = \left(\frac{\text{Total Candidates} - \text{Student Rank} + 1}{\text{Total Candidates}}\right) \times 100$$

---

## 19.5 Subject Accuracy Calculation

$$\text{Subject Accuracy (\%)} = \left(\frac{\text{Correct Questions in Subject}}{\text{Total Questions in Subject}}\right) \times 100$$
