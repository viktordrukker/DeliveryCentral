-- Rollback for 20260418_dm2_expand_skills. Safe to run any time before the
-- DM-2 contract (release N+2) for skills lands.

DROP TRIGGER IF EXISTS "skills_dm2_dualmaintain" ON "skills";
DROP FUNCTION IF EXISTS "skills_dm2_dualmaintain"();

DROP INDEX IF EXISTS "skills_publicId_key";
DROP INDEX IF EXISTS "skills_id_new_key";

ALTER TABLE "skills" DROP COLUMN IF EXISTS "publicId";
ALTER TABLE "skills" DROP COLUMN IF EXISTS "id_new";
