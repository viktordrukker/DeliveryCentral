-- DM-2 · project_budgets · Release N (expand). Aggregate root · publicId prefix `bud_`.
-- Runbook: docs/planning/dm2-expand-contract-runbook.md

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE "project_budgets" ADD COLUMN IF NOT EXISTS "id_new"   uuid        DEFAULT gen_random_uuid();
ALTER TABLE "project_budgets" ADD COLUMN IF NOT EXISTS "publicId" varchar(32);

UPDATE "project_budgets" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;

UPDATE "project_budgets"
SET "publicId" = 'bud_' || substr(replace("id_new"::text, '-', ''), 1, 12)
WHERE "publicId" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "project_budgets" WHERE "id_new" IS NULL OR "publicId" IS NULL) THEN
    RAISE EXCEPTION 'DM-2 expand backfill incomplete for project_budgets';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION "project_budgets_dm2_dualmaintain"() RETURNS trigger AS $$
BEGIN
  IF NEW."id_new" IS NULL THEN
    NEW."id_new" := gen_random_uuid();
  END IF;
  IF NEW."publicId" IS NULL THEN
    NEW."publicId" := 'bud_' || substr(replace(NEW."id_new"::text, '-', ''), 1, 12);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "project_budgets_dm2_dualmaintain" ON "project_budgets";
CREATE TRIGGER "project_budgets_dm2_dualmaintain"
BEFORE INSERT OR UPDATE ON "project_budgets"
FOR EACH ROW EXECUTE FUNCTION "project_budgets_dm2_dualmaintain"();

INSERT INTO "AuditLog" ("id", "aggregateType", "aggregateId", "eventName", "payload", "createdAt")
VALUES (
  gen_random_uuid(), 'Migration', gen_random_uuid(), 'DM-2-Expand-project_budgets',
  jsonb_build_object('migration', '20260418_dm2_expand_project_budgets', 'phase', 'expand',
    'columnsAdded', jsonb_build_array('id_new', 'publicId'),
    'triggerAdded', 'project_budgets_dm2_dualmaintain'),
  NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "project_budgets_id_new_key"   ON "project_budgets" ("id_new");
CREATE UNIQUE INDEX IF NOT EXISTS "project_budgets_publicId_key" ON "project_budgets" ("publicId");
