-- DM-2 · person_skills · Release N (expand). Sub-entity of PersonSkill aggregate
-- (owned by Person). No publicId — addressed via `/people/:userPublicId/skills`.
-- Runbook: docs/planning/dm2-expand-contract-runbook.md

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE "person_skills" ADD COLUMN IF NOT EXISTS "id_new" uuid DEFAULT gen_random_uuid();

UPDATE "person_skills" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "person_skills" WHERE "id_new" IS NULL) THEN
    RAISE EXCEPTION 'DM-2 expand backfill incomplete for person_skills';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION "person_skills_dm2_dualmaintain"() RETURNS trigger AS $$
BEGIN
  IF NEW."id_new" IS NULL THEN
    NEW."id_new" := gen_random_uuid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "person_skills_dm2_dualmaintain" ON "person_skills";
CREATE TRIGGER "person_skills_dm2_dualmaintain"
BEFORE INSERT OR UPDATE ON "person_skills"
FOR EACH ROW EXECUTE FUNCTION "person_skills_dm2_dualmaintain"();

INSERT INTO "AuditLog" ("id", "aggregateType", "aggregateId", "eventName", "payload", "createdAt")
VALUES (
  gen_random_uuid(), 'Migration', gen_random_uuid(), 'DM-2-Expand-person_skills',
  jsonb_build_object('migration', '20260418_dm2_expand_person_skills', 'phase', 'expand',
    'columnsAdded', jsonb_build_array('id_new'),
    'triggerAdded', 'person_skills_dm2_dualmaintain'),
  NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "person_skills_id_new_key" ON "person_skills" ("id_new");
