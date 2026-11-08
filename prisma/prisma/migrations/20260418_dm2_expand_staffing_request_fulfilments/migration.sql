-- DM-2 · staffing_request_fulfilments · Release N (expand). Sub-entity of StaffingRequest.
-- No publicId — addressed via `/staffing-requests/:requestPublicId/fulfilments`.
-- Runbook: docs/planning/dm2-expand-contract-runbook.md

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE "staffing_request_fulfilments" ADD COLUMN IF NOT EXISTS "id_new" uuid DEFAULT gen_random_uuid();

UPDATE "staffing_request_fulfilments" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "staffing_request_fulfilments" WHERE "id_new" IS NULL) THEN
    RAISE EXCEPTION 'DM-2 expand backfill incomplete for staffing_request_fulfilments';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION "staffing_request_fulfilments_dm2_dualmaintain"() RETURNS trigger AS $$
BEGIN
  IF NEW."id_new" IS NULL THEN
    NEW."id_new" := gen_random_uuid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "staffing_request_fulfilments_dm2_dualmaintain" ON "staffing_request_fulfilments";
CREATE TRIGGER "staffing_request_fulfilments_dm2_dualmaintain"
BEFORE INSERT OR UPDATE ON "staffing_request_fulfilments"
FOR EACH ROW EXECUTE FUNCTION "staffing_request_fulfilments_dm2_dualmaintain"();

INSERT INTO "AuditLog" ("id", "aggregateType", "aggregateId", "eventName", "payload", "createdAt")
VALUES (
  gen_random_uuid(), 'Migration', gen_random_uuid(), 'DM-2-Expand-staffing_request_fulfilments',
  jsonb_build_object('migration', '20260418_dm2_expand_staffing_request_fulfilments', 'phase', 'expand',
    'columnsAdded', jsonb_build_array('id_new'),
    'triggerAdded', 'staffing_request_fulfilments_dm2_dualmaintain'),
  NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "staffing_request_fulfilments_id_new_key" ON "staffing_request_fulfilments" ("id_new");
