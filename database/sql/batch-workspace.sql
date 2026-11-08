CREATE TABLE IF NOT EXISTS "BatchFaculty" (
 "batchId" TEXT NOT NULL REFERENCES "Batch"("id") ON DELETE CASCADE,
 "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
 "subjectIds" TEXT[] NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY ("batchId", "userId")
);
CREATE INDEX IF NOT EXISTS "BatchFaculty_userId_idx" ON "BatchFaculty"("userId");
CREATE TABLE IF NOT EXISTS "BatchClass" (
 "id" TEXT PRIMARY KEY, "batchId" TEXT NOT NULL REFERENCES "Batch"("id") ON DELETE CASCADE,
 "subjectId" TEXT NOT NULL REFERENCES "Subject"("id"), "teacherId" TEXT NOT NULL REFERENCES "User"("id"),
 "topic" TEXT NOT NULL, "date" TEXT NOT NULL, "startTime" TEXT NOT NULL, "endTime" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'Created', "changedBy" TEXT, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "BatchClass_status_check" CHECK ("status" IN ('Created','Upcoming','Live','Completed','Cancelled')),
 CONSTRAINT "BatchClass_time_check" CHECK ("endTime" > "startTime")
);
CREATE INDEX IF NOT EXISTS "BatchClass_batchId_date_idx" ON "BatchClass"("batchId", "date");
CREATE INDEX IF NOT EXISTS "BatchClass_teacherId_date_idx" ON "BatchClass"("teacherId", "date");
CREATE TABLE IF NOT EXISTS "ClassAttendance" (
 "classId" TEXT NOT NULL REFERENCES "BatchClass"("id") ON DELETE CASCADE,
 "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
 "status" TEXT NOT NULL CHECK ("status" IN ('Present','Absent','Late')),
 "markedBy" TEXT NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL,
 PRIMARY KEY ("classId", "userId")
);
