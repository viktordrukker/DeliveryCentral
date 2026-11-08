-- DM-2 · person_cost_rates · Release N (expand). Aggregate root · publicId prefix `pcr_`.
-- Runbook: docs/planning/dm2-expand-contract-runbook.md

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE "person_cost_rates" ADD COLUMN IF NOT EXISTS "id_new"   uuid        DEFAULT gen_random_uuid();
ALTER TABLE "person_cost_rates" ADD COLUMN IF NOT EXISTS "publicId" varchar(32);

UPDATE "person_cost_rates" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;

UPDATE "person_cost_rates"
SET "publicId" = 'pcr_' || substr(replace("id_new"::text, '-', ''), 1, 12)
WHERE "publicId" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "person_cost_rates" WHERE "id_new" IS NULL OR "publicId" IS NULL) THEN
    RAISE EXCEPTION 'DM-2 expand backfill incomplete for person_cost_rates';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION "person_cost_rates_dm2_dualmaintain"() RETURNS trigger AS $$
BEGIN
  IF NEW."id_new" IS NULL THEN
    NEW."id_new" := gen_random_uuid();
  END IF;
  IF NEW."publicId" IS NULL THEN
    NEW."publicId" := 'pcr_' || substr(replace(NEW."id_new"::text, '-', ''), 1, 12);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "person_cost_rates_dm2_dualmaintain" ON "person_cost_rates";
CREATE TRIGGER "person_cost_rates_dm2_dualmaintain"
BEFORE INSERT OR UPDATE ON "person_cost_rates"
FOR EACH ROW EXECUTE FUNCTION "person_cost_rates_dm2_dualmaintain"();

INSERT INTO "AuditLog" ("id", "aggregateType", "aggregateId", "eventName", "payload", "createdAt")
VALUES (
  gen_random_uuid(), 'Migration', gen_random_uuid(), 'DM-2-Expand-person_cost_rates',
  jsonb_build_object('migration', '20260418_dm2_expand_person_cost_rates', 'phase', 'expand',
    'columnsAdded', jsonb_build_array('id_new', 'publicId'),
    'triggerAdded', 'person_cost_rates_dm2_dualmaintain'),
  NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "person_cost_rates_id_new_key"   ON "person_cost_rates" ("id_new");
CREATE UNIQUE INDEX IF NOT EXISTS "person_cost_rates_publicId_key" ON "person_cost_rates" ("publicId");
