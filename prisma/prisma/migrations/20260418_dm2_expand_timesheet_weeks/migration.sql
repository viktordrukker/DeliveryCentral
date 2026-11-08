-- DM-2 · timesheet_weeks · Release N (expand). Aggregate root · publicId prefix `tsh_`.
-- Runbook: docs/planning/dm2-expand-contract-runbook.md

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE "timesheet_weeks" ADD COLUMN IF NOT EXISTS "id_new"   uuid        DEFAULT gen_random_uuid();
ALTER TABLE "timesheet_weeks" ADD COLUMN IF NOT EXISTS "publicId" varchar(32);

UPDATE "timesheet_weeks" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;

UPDATE "timesheet_weeks"
SET "publicId" = 'tsh_' || substr(replace("id_new"::text, '-', ''), 1, 12)
WHERE "publicId" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "timesheet_weeks" WHERE "id_new" IS NULL OR "publicId" IS NULL) THEN
    RAISE EXCEPTION 'DM-2 expand backfill incomplete for timesheet_weeks';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION "timesheet_weeks_dm2_dualmaintain"() RETURNS trigger AS $$
BEGIN
  IF NEW."id_new" IS NULL THEN
    NEW."id_new" := gen_random_uuid();
  END IF;
  IF NEW."publicId" IS NULL THEN
    NEW."publicId" := 'tsh_' || substr(replace(NEW."id_new"::text, '-', ''), 1, 12);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "timesheet_weeks_dm2_dualmaintain" ON "timesheet_weeks";
CREATE TRIGGER "timesheet_weeks_dm2_dualmaintain"
BEFORE INSERT OR UPDATE ON "timesheet_weeks"
FOR EACH ROW EXECUTE FUNCTION "timesheet_weeks_dm2_dualmaintain"();

INSERT INTO "AuditLog" ("id", "aggregateType", "aggregateId", "eventName", "payload", "createdAt")
VALUES (
  gen_random_uuid(), 'Migration', gen_random_uuid(), 'DM-2-Expand-timesheet_weeks',
  jsonb_build_object('migration', '20260418_dm2_expand_timesheet_weeks', 'phase', 'expand',
    'columnsAdded', jsonb_build_array('id_new', 'publicId'),
    'triggerAdded', 'timesheet_weeks_dm2_dualmaintain'),
  NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "timesheet_weeks_id_new_key"   ON "timesheet_weeks" ("id_new");
CREATE UNIQUE INDEX IF NOT EXISTS "timesheet_weeks_publicId_key" ON "timesheet_weeks" ("publicId");
