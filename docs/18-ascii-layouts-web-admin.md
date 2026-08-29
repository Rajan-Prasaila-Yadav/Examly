# 18 — ASCII Layouts: Desktop Web Admin Panel

This document provides pixel-faithful ASCII wireframes for the Next.js desktop web administration companion app.

---

## 18.1 Web Question Builder (Split-Pane Editor — `Screenshot 2026-08-21 172631.png`)

```
+---------------------------------------------------------------------------------------+
|  [<-]  Mechanics Unit Test 01               [💾 Save for later]     [ Next: Publish >]|
+---------------------------------------------------------------------------------------+
|                                                                                       |
|  Q1. Question                                    Options                              |
|  +--------------------------------------------+  +----------------------------------+ |
|  | [B] [I] [U] [x²] [Ω] [fx]  [🖼 Add Image]  |  | Option A                         | |
|  |--------------------------------------------|  | [ Enter text...               ] O| |
|  | Type your question here...                 |  +----------------------------------+ |
|  |                                            |  +----------------------------------+ |
|  |                                            |  | Option B                         | |
|  |                                            |  | [ Enter text...               ] O| |
|  |                                            |  +----------------------------------+ |
|  |                                            |  +----------------------------------+ |
|  +--------------------------------------------+  | Option C                         | |
|                                                  | [ Enter text...         ] [🗑]   O| |
|  Question type                                   +----------------------------------+ |
|  +----------------------------------------+      +----------------------------------+ |
|  | Only one correct                     ^ |      | Option D                         | |
|  +----------------------------------------+      | [ Enter text...         ] [🗑]   O| |
|  | Only one correct                       |      +----------------------------------+ |
|  | One or more than one correct           |                                           |
|  | Number                                 |      + Add option                         |
|  | Fill in the blank                      |                                           |
|  | Ranking / Re-ordering                  |                                           |
|  | Match the following                    |                                           |
|  | Poll                                   |                                           |
|  | Long answer                            |                                           |
|  +----------------------------------------+                                           |
|                                                                                       |
+---------------------------------------------------------------------------------------+
```

---

## 18.2 Web Admin Dynamic Role Matrix (`SCR-ADM-23`)

```
+---------------------------------------------------------------------------------------+
|  Role Permissions Matrix: Teacher Role                               [💾 Save Matrix] |
+---------------------------------------------------------------------------------------+
|  Resource              View / Read    Create Content   Edit / Update   Delete Record  |
|  -----------------------------------------------------------------------------------  |
|  Batches & Classes     [✔] Assigned   [ ] Disabled     [ ] Disabled    [ ] Disabled   |
|  Subjects & Lessons    [✔] Assigned   [✔] Assigned     [✔] Assigned    [ ] Disabled   |
|  Video Lectures        [✔] Assigned   [✔] Assigned     [✔] Assigned    [ ] Disabled   |
|  Test Creation Wizard  [✔] Assigned   [✔] Assigned     [✔] Assigned    [ ] Disabled   |
|  Student Records       [✔] Assigned   [ ] Disabled     [ ] Disabled    [ ] Disabled   |
|  Fees & Payments       [ ] Disabled   [ ] Disabled     [ ] Disabled    [ ] Disabled   |
+---------------------------------------------------------------------------------------+
```
