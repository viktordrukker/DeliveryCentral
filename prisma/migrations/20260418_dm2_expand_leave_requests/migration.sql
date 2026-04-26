-- DM-2 · leave_requests · Release N (expand). Aggregate root · publicId prefix `lvr_`.
-- Runbook: docs/planning/dm2-expand-contract-runbook.md

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE "leave_requests" ADD COLUMN IF NOT EXISTS "id_new"   uuid        DEFAULT gen_random_uuid();
ALTER TABLE "leave_requests" ADD COLUMN IF NOT EXISTS "publicId" varchar(32);

UPDATE "leave_requests" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;

UPDATE "leave_requests"
SET "publicId" = 'lvr_' || substr(replace("id_new"::text, '-', ''), 1, 12)
WHERE "publicId" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "leave_requests" WHERE "id_new" IS NULL OR "publicId" IS NULL) THEN
    RAISE EXCEPTION 'DM-2 expand backfill incomplete for leave_requests';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION "leave_requests_dm2_dualmaintain"() RETURNS trigger AS $$
BEGIN
  IF NEW."id_new" IS NULL THEN
    NEW."id_new" := gen_random_uuid();
  END IF;
  IF NEW."publicId" IS NULL THEN
    NEW."publicId" := 'lvr_' || substr(replace(NEW."id_new"::text, '-', ''), 1, 12);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "leave_requests_dm2_dualmaintain" ON "leave_requests";
CREATE TRIGGER "leave_requests_dm2_dualmaintain"
BEFORE INSERT OR UPDATE ON "leave_requests"
FOR EACH ROW EXECUTE FUNCTION "leave_requests_dm2_dualmaintain"();

INSERT INTO "AuditLog" ("id", "aggregateType", "aggregateId", "eventName", "payload", "createdAt")
VALUES (
  gen_random_uuid(), 'Migration', gen_random_uuid(), 'DM-2-Expand-leave_requests',
  jsonb_build_object('migration', '20260418_dm2_expand_leave_requests', 'phase', 'expand',
    'columnsAdded', jsonb_build_array('id_new', 'publicId'),
    'triggerAdded', 'leave_requests_dm2_dualmaintain'),
  NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "leave_requests_id_new_key"   ON "leave_requests" ("id_new");
CREATE UNIQUE INDEX IF NOT EXISTS "leave_requests_publicId_key" ON "leave_requests" ("publicId");
