-- DM-2 · period_locks · Release N (expand). Aggregate root · publicId prefix `prd_`.
-- Runbook: docs/planning/dm2-expand-contract-runbook.md

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE "period_locks" ADD COLUMN IF NOT EXISTS "id_new"   uuid        DEFAULT gen_random_uuid();
ALTER TABLE "period_locks" ADD COLUMN IF NOT EXISTS "publicId" varchar(32);

UPDATE "period_locks" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;

UPDATE "period_locks"
SET "publicId" = 'prd_' || substr(replace("id_new"::text, '-', ''), 1, 12)
WHERE "publicId" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "period_locks" WHERE "id_new" IS NULL OR "publicId" IS NULL) THEN
    RAISE EXCEPTION 'DM-2 expand backfill incomplete for period_locks';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION "period_locks_dm2_dualmaintain"() RETURNS trigger AS $$
BEGIN
  IF NEW."id_new" IS NULL THEN
    NEW."id_new" := gen_random_uuid();
  END IF;
  IF NEW."publicId" IS NULL THEN
    NEW."publicId" := 'prd_' || substr(replace(NEW."id_new"::text, '-', ''), 1, 12);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "period_locks_dm2_dualmaintain" ON "period_locks";
CREATE TRIGGER "period_locks_dm2_dualmaintain"
BEFORE INSERT OR UPDATE ON "period_locks"
FOR EACH ROW EXECUTE FUNCTION "period_locks_dm2_dualmaintain"();

INSERT INTO "AuditLog" ("id", "aggregateType", "aggregateId", "eventName", "payload", "createdAt")
VALUES (
  gen_random_uuid(), 'Migration', gen_random_uuid(), 'DM-2-Expand-period_locks',
  jsonb_build_object('migration', '20260418_dm2_expand_period_locks', 'phase', 'expand',
    'columnsAdded', jsonb_build_array('id_new', 'publicId'),
    'triggerAdded', 'period_locks_dm2_dualmaintain'),
  NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "period_locks_id_new_key"   ON "period_locks" ("id_new");
CREATE UNIQUE INDEX IF NOT EXISTS "period_locks_publicId_key" ON "period_locks" ("publicId");
