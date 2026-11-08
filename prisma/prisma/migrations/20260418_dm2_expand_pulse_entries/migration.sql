-- DM-2 · pulse_entries · Release N (expand). Sub-entity accessed via (personId, weekStart).
-- No publicId — natural composite key in API (`/people/:userPublicId/pulse?weekStart=...`).
-- Runbook: docs/planning/dm2-expand-contract-runbook.md

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE "pulse_entries" ADD COLUMN IF NOT EXISTS "id_new" uuid DEFAULT gen_random_uuid();

UPDATE "pulse_entries" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "pulse_entries" WHERE "id_new" IS NULL) THEN
    RAISE EXCEPTION 'DM-2 expand backfill incomplete for pulse_entries';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION "pulse_entries_dm2_dualmaintain"() RETURNS trigger AS $$
BEGIN
  IF NEW."id_new" IS NULL THEN
    NEW."id_new" := gen_random_uuid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "pulse_entries_dm2_dualmaintain" ON "pulse_entries";
CREATE TRIGGER "pulse_entries_dm2_dualmaintain"
BEFORE INSERT OR UPDATE ON "pulse_entries"
FOR EACH ROW EXECUTE FUNCTION "pulse_entries_dm2_dualmaintain"();

INSERT INTO "AuditLog" ("id", "aggregateType", "aggregateId", "eventName", "payload", "createdAt")
VALUES (
  gen_random_uuid(), 'Migration', gen_random_uuid(), 'DM-2-Expand-pulse_entries',
  jsonb_build_object('migration', '20260418_dm2_expand_pulse_entries', 'phase', 'expand',
    'columnsAdded', jsonb_build_array('id_new'),
    'triggerAdded', 'pulse_entries_dm2_dualmaintain'),
  NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "pulse_entries_id_new_key" ON "pulse_entries" ("id_new");
