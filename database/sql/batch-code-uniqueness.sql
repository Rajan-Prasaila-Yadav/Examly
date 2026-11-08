-- Safe to re-run. Soft-deleted batches release their code for reuse.
-- Prisma does not represent this partial, case-insensitive index in its schema.
CREATE UNIQUE INDEX IF NOT EXISTS "Batch_institute_code_active_unique"
ON "Batch" ("instituteId", lower("code")) WHERE "status" <> 'DELETED';
