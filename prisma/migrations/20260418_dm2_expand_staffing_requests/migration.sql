-- DM-2 · staffing_requests · Release N (expand). Aggregate root · publicId prefix `stf_`.
-- Runbook: docs/planning/dm2-expand-contract-runbook.md

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE "staffing_requests" ADD COLUMN IF NOT EXISTS "id_new"   uuid        DEFAULT gen_random_uuid();
ALTER TABLE "staffing_requests" ADD COLUMN IF NOT EXISTS "publicId" varchar(32);

UPDATE "staffing_requests" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;

UPDATE "staffing_requests"
SET "publicId" = 'stf_' || substr(replace("id_new"::text, '-', ''), 1, 12)
WHERE "publicId" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "staffing_requests" WHERE "id_new" IS NULL OR "publicId" IS NULL) THEN
    RAISE EXCEPTION 'DM-2 expand backfill incomplete for staffing_requests';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION "staffing_requests_dm2_dualmaintain"() RETURNS trigger AS $$
BEGIN
  IF NEW."id_new" IS NULL THEN
    NEW."id_new" := gen_random_uuid();
  END IF;
  IF NEW."publicId" IS NULL THEN
    NEW."publicId" := 'stf_' || substr(replace(NEW."id_new"::text, '-', ''), 1, 12);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "staffing_requests_dm2_dualmaintain" ON "staffing_requests";
CREATE TRIGGER "staffing_requests_dm2_dualmaintain"
BEFORE INSERT OR UPDATE ON "staffing_requests"
FOR EACH ROW EXECUTE FUNCTION "staffing_requests_dm2_dualmaintain"();

INSERT INTO "AuditLog" ("id", "aggregateType", "aggregateId", "eventName", "payload", "createdAt")
VALUES (
  gen_random_uuid(), 'Migration', gen_random_uuid(), 'DM-2-Expand-staffing_requests',
  jsonb_build_object('migration', '20260418_dm2_expand_staffing_requests', 'phase', 'expand',
    'columnsAdded', jsonb_build_array('id_new', 'publicId'),
    'triggerAdded', 'staffing_requests_dm2_dualmaintain'),
  NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "staffing_requests_id_new_key"   ON "staffing_requests" ("id_new");
CREATE UNIQUE INDEX IF NOT EXISTS "staffing_requests_publicId_key" ON "staffing_requests" ("publicId");
