# 05 — PostgreSQL Data Model (Prisma Schema)

Examly uses **PostgreSQL everywhere** (dev, test, and production). The schema is split across modular domain files inside `database/prisma/schema/` using Prisma's `prismaSchemaFolder` feature.

---

## 5.1 Entity Relationship Diagram (ERD)

```
       ┌──────────────┐
       │  Institute   │
       └──────┬───────┘
              │ 1:N
   ┌──────────┴───────────────────────────────────────────────────────┐
   │                                                                  │
   ▼ 1:N                                                              ▼ 1:N
┌──────────────┐  roleId  ┌──────────────┐ 1:N   1:N ┌──────────────┐ ┌──────────────┐
│     User     ├─────────►│     Role     ├──────────►│RolePermission│ │    Batch     │
└──────┬───────┘          └──────────────┘           └──────────────┘ └──────┬───────┘
       │                                                                     │ 1:N
       ├──────────────┬──────────────┐                                       ▼
       ▼ 1:1          ▼ 1:1          ▼ 1:N                            ┌──────────────┐
┌──────────────┐┌──────────────┐┌──────────────┐                      │   Subject    │
│StudentProfile││TeacherProfile││PermissionGrnt│                      └──────┬───────┘
└──────────────┘└──────────────┘└──────────────┘                             │ 1:N
                                                                             ▼
┌─────────────────────────────────────────────────────────────────────┌──────────────┐
│                           TEST ENGINE                               │    Lesson    │
│  ┌──────────────┐ 1:1  ┌──────────────┐ 1:N   1:N ┌──────────────┐  └──────┬───────┘
│  │     Test     ├─────►│  TestConfig  │ ├────────►│    Video     │         │ 1:N
│  └──────┬───────┘      └──────────────┘ │         ├──────────────┤         ├─────────┐
│         │ 1:N                           │         │     Note     │         │         │
│         ▼                               │         ├──────────────┤         ▼         ▼
│  ┌──────────────┐ 1:N   1:N ┌─────────┐ │         │ ResourceNode │     ┌───────┐ ┌───────┐
│  │   Section    ├──────────►│Question │─┴─────────┤ (Folder/File)│     │ Video │ │ Test  │
│  └──────────────┘           └───┬─────┘           └──────────────┘     └───────┘ └───────┘
│                                 │ 1:N
│         ┌───────────────────────┴───────────────────────┐
│         ▼ 1:N                                           ▼ 1:N
│  ┌──────────────┐                                ┌──────────────┐
│  │QuestionOption│                                │QuestionSolutn│
│  └──────────────┘                                └──────────────┘
│
│  ┌──────────────┐ 1:N   1:N ┌──────────────┐ 1:1 ┌──────────────┐
│  │ TestAttempt  ├──────────►│AttemptAnswer │ ├──►│  TestResult  │
│  └──────────────┘           └──────────────┘     └──────────────┘
└────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5.2 Core Domain Schema Definitions

### 5.2.1 Global Enums (`enums.prisma`)

```prisma
enum RecordStatus {
  ACTIVE
  HIDDEN
  BLOCKED
  LOCKED
  DELETED
}

enum RoleType {
  SUPER_ADMIN
  ADMIN
  TEACHER
  STUDENT
}

enum PermissionScope {
  INSTITUTE
  ASSIGNED_ONLY
}

enum TestType {
  BATCH_LEVEL
  SUBJECT_LEVEL
  LESSON_LEVEL
}

enum QuestionType {
  SINGLE_CORRECT
  MULTIPLE_CORRECT
  NUMERICAL
  FILL_BLANK
  ASSERTION_REASON
  MATRIX_MATCH
  TRUE_FALSE
  DESCRIPTIVE
}

enum ResultPublishMode {
  IMMEDIATE
  AFTER_TEST_END
  MANUAL_BY_ADMIN
  SCHEDULED
}

enum VideoProvider {
  YOUTUBE
  DIRECT_MP4
  CLOUDFLARE_STREAM
  MUX
}
```

### 5.2.2 Identity & Users (`identity.prisma`)

```prisma
model User {
  id              String         @id @default(cuid())
  instituteId     String?
  roleId          String
  email           String?        @unique
  phone           String?        @unique
  identifier      String         @unique // Roll No, Admin ID, or Teacher ID
  fullName        String
  passwordHash    String
  avatarUrl       String?
  status          RecordStatus   @default(ACTIVE)
  lastLoginAt     DateTime?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  deletedAt       DateTime?

  institute       Institute?     @relation(fields: [instituteId], references: [id])
  role            Role           @relation(fields: [roleId], references: [id])
  studentProfile  StudentProfile?
  teacherProfile  TeacherProfile?
  permissionGrants PermissionGrant[]
  testAttempts    TestAttempt[]
  sessions        UserSession[]
}

model StudentProfile {
  id              String         @id @default(cuid())
  userId          String         @unique
  rollNumber      String
  batchId         String?
  parentPhone     String?
  province        String?
  district        String?
  municipality    String?
  wardNumber      String?
  isTrialActive   Boolean        @default(false)
  trialExpiresAt  DateTime?

  user            User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  batch           Batch?         @relation(fields: [batchId], references: [id])
}

model TeacherProfile {
  id              String         @id @default(cuid())
  userId          String         @unique
  facultyCode     String
  designation     String
  specialization  String[]
  assignedBatchIds String[]

  user            User           @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Role {
  id              String         @id @default(cuid())
  instituteId     String?
  name            String
  code            RoleType
  description     String?
  isSystem        Boolean        @default(false)
  permissions     RolePermission[]
  users           User[]
}

model RolePermission {
  id              String         @id @default(cuid())
  roleId          String
  resource        String         // 'batches', 'tests', 'videos', 'users'
  action          String         // 'create', 'read', 'update', 'delete', 'publish'
  scope           PermissionScope @default(INSTITUTE)

  role            Role           @relation(fields: [roleId], references: [id], onDelete: Cascade)
}

model PermissionGrant {
  id              String         @id @default(cuid())
  userId          String
  resource        String
  action          String
  isAllowed       Boolean        @default(true) // Explicit ALLOW or DENY override

  user            User           @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### 5.2.3 Academic Catalog (`catalog.prisma`)

```prisma
model Batch {
  id              String         @id @default(cuid())
  instituteId     String
  name            String         // e.g., "CEE 2026 Batch A"
  code            String         // e.g., "CEE-A"
  description     String?
  imageUrl        String?
  status          RecordStatus   @default(ACTIVE)
  sortOrder       Int            @default(0)
  copiedFromId    String?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  subjects        Subject[]
  students        StudentProfile[]
  tests           Test[]
}

model Subject {
  id              String         @id @default(cuid())
  batchId         String
  name            String         // e.g., "Physics", "Zoology"
  iconUrl         String?
  status          RecordStatus   @default(ACTIVE)
  sortOrder       Int            @default(0)
  copiedFromId    String?

  batch           Batch          @relation(fields: [batchId], references: [id], onDelete: Cascade)
  lessons         Lesson[]
  tests           Test[]
}

model Lesson {
  id              String         @id @default(cuid())
  subjectId       String
  name            String         // e.g., "01 Mechanics"
  description     String?
  status          RecordStatus   @default(ACTIVE)
  sortOrder       Int            @default(0)
  copiedFromId    String?

  subject         Subject        @relation(fields: [subjectId], references: [id], onDelete: Cascade)
  videos          Video[]
  notes           Note[]
  resources       ResourceNode[]
  tests           Test[]
}

model Video {
  id              String         @id @default(cuid())
  lessonId        String
  title           String
  description     String?
  provider        VideoProvider  @default(YOUTUBE)
  videoUrl        String
  durationSeconds Int
  sortOrder       Int            @default(0)
  status          RecordStatus   @default(ACTIVE)

  lesson          Lesson         @relation(fields: [lessonId], references: [id], onDelete: Cascade)
}

model ResourceNode {
  id              String         @id @default(cuid())
  lessonId        String
  parentId        String?        // Null for root folder; nested for subfolders
  isFolder        Boolean        @default(false)
  title           String
  fileUrl         String?
  fileType        String?        // 'pdf', 'docx', 'link'
  sortOrder       Int            @default(0)

  lesson          Lesson         @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  parent          ResourceNode?  @relation("FolderTree", fields: [parentId], references: [id])
  children        ResourceNode[] @relation("FolderTree")
}
```

### 5.2.4 Test Engine (`test-engine.prisma`)

```prisma
model Test {
  id                String            @id @default(cuid())
  instituteId       String
  batchId           String?
  subjectId         String?
  lessonId          String?
  title             String
  description       String?
  testType          TestType
  startDateTime     DateTime
  endDateTime       DateTime
  durationMinutes   Int
  totalMarks        Float
  passMarks         Float
  negativeMarkRate  Float             @default(0) // e.g. 1.0 for -1
  isPublished       Boolean           @default(false)
  status            RecordStatus      @default(ACTIVE)

  config            TestConfig?
  sections          Section[]
  attempts          TestAttempt[]
  batch             Batch?            @relation(fields: [batchId], references: [id])
  subject           Subject?          @relation(fields: [subjectId], references: [id])
  lesson            Lesson?           @relation(fields: [lessonId], references: [id])
}

model TestConfig {
  id                String            @id @default(cuid())
  testId            String            @unique
  shuffleQuestions  Boolean           @default(true)
  shuffleOptions    Boolean           @default(true)
  allowLateJoin     Boolean           @default(true)
  lateJoinGraceMins Int               @default(15)
  antiCheatLevel    Int               @default(3) // 3 strikes allowed
  publishMode       ResultPublishMode @default(AFTER_TEST_END)
  publishDateTime   DateTime?

  test              Test              @relation(fields: [testId], references: [id], onDelete: Cascade)
}

model Question {
  id                String            @id @default(cuid())
  sectionId         String
  questionType      QuestionType      @default(SINGLE_CORRECT)
  contentHtml       String            // Rich text HTML + KaTeX
  marksPositive     Float             @default(4.0)
  marksNegative     Float             @default(1.0)
  sortOrder         Int               @default(0)

  options           QuestionOption[]
  solution          QuestionSolution?
  section           Section           @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  attemptAnswers    AttemptAnswer[]
}

model QuestionOption {
  id                String            @id @default(cuid())
  questionId        String
  optionLabel       String            // 'A', 'B', 'C', 'D'
  contentHtml       String
  isCorrect         Boolean           @default(false)
  sortOrder         Int               @default(0)

  question          Question          @relation(fields: [questionId], references: [id], onDelete: Cascade)
}

model QuestionSolution {
  id                String            @id @default(cuid())
  questionId        String            @unique
  hintHtml          String?
  shortExplanation  String?
  stepByStepHtml    String?           // Formatted calculation steps with KaTeX

  question          Question          @relation(fields: [questionId], references: [id], onDelete: Cascade)
}

model TestAttempt {
  id                String            @id @default(cuid())
  testId            String
  studentId         String
  startedAt         DateTime          @default(now())
  submittedAt       DateTime?
  durationSeconds   Int               @default(0)
  cheatStrikes      Int               @default(0)
  isAutoSubmitted   Boolean           @default(false)

  test              Test              @relation(fields: [testId], references: [id], onDelete: Cascade)
  student           User              @relation(fields: [studentId], references: [id], onDelete: Cascade)
  answers           AttemptAnswer[]
  result            TestResult?
}

model AttemptAnswer {
  id                String            @id @default(cuid())
  attemptId         String
  questionId        String
  selectedOptionIds String[]
  textAnswer        String?
  isMarkedForReview Boolean           @default(false)
  timeSpentSeconds  Int               @default(0)
  awardedMarks      Float?

  attempt           TestAttempt       @relation(fields: [attemptId], references: [id], onDelete: Cascade)
  question          Question          @relation(fields: [questionId], references: [id], onDelete: Cascade)
}

model TestResult {
  id                String            @id @default(cuid())
  attemptId         String            @unique
  totalScore        Float
  totalCorrect      Int
  totalWrong        Int
  totalUnanswered   Int
  percentage        Float
  isPassed          Boolean
  rank              Int?

  attempt           TestAttempt       @relation(fields: [attemptId], references: [id], onDelete: Cascade)
}
```
