-- Repair legacy users only when the existing institute-scoped role provides
-- an unambiguous owner and any saved student enrollment agrees with that owner.
UPDATE "User" u SET "instituteId" = r."instituteId", "updatedAt" = NOW()
FROM "Role" r JOIN "Institute" i ON i.id = r."instituteId"
WHERE u."roleId" = r.id AND u."instituteId" IS NULL
  AND r.code <> 'SUPER_ADMIN' AND i.status = 'ACTIVE'
  AND NOT EXISTS (
    SELECT 1 FROM "StudentProfile" s JOIN "Batch" b ON b.id = s."batchId"
    WHERE s."userId" = u.id AND b."instituteId" <> r."instituteId"
  );
