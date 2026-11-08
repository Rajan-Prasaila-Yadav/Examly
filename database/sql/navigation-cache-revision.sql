CREATE TABLE IF NOT EXISTS "AppDataRevision" (id integer PRIMARY KEY, version bigint NOT NULL DEFAULT 1);
INSERT INTO "AppDataRevision" (id,version) VALUES (1,1) ON CONFLICT DO NOTHING;
CREATE OR REPLACE FUNCTION examly_bump_data_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 UPDATE "AppDataRevision" SET version=version+1 WHERE id=1;
 RETURN NULL;
END $$;
DO $$ DECLARE tbl text; BEGIN
 FOREACH tbl IN ARRAY ARRAY['Institute','Role','RolePermission','PermissionGrant','StudentProfile','TeacherProfile','Batch','BatchFaculty','BatchClass','Subject','Lesson','Video','Note','ResourceNode','Test','TestConfig','Section','Question','QuestionOption','QuestionSolution'] LOOP
  EXECUTE format('DROP TRIGGER IF EXISTS examly_data_revision ON %I',tbl);
  EXECUTE format('CREATE TRIGGER examly_data_revision AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH STATEMENT EXECUTE FUNCTION examly_bump_data_revision()',tbl);
 END LOOP;
END $$;
DROP TRIGGER IF EXISTS examly_user_revision ON "User";
CREATE TRIGGER examly_user_revision AFTER UPDATE OF "status", "instituteId", "roleId", "fullName", "email", "phone", "avatarUrl", "identifier" ON "User" FOR EACH STATEMENT EXECUTE FUNCTION examly_bump_data_revision();

DROP TRIGGER IF EXISTS examly_user_membership_revision ON "User";
CREATE TRIGGER examly_user_membership_revision AFTER INSERT OR DELETE ON "User" FOR EACH STATEMENT EXECUTE FUNCTION examly_bump_data_revision();
