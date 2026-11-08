DROP TRIGGER IF EXISTS "person_skills_dm2_dualmaintain" ON "person_skills";
DROP FUNCTION IF EXISTS "person_skills_dm2_dualmaintain"();
DROP INDEX IF EXISTS "person_skills_id_new_key";
ALTER TABLE "person_skills" DROP COLUMN IF EXISTS "id_new";
