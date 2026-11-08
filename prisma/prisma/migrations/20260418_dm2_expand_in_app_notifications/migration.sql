-- DM-2 · in_app_notifications · Release N (expand). Aggregate root · publicId prefix `not_`.
-- Will be unified into a single Notification model in DM-7; `not_` prefix is forward-compatible.
-- Runbook: docs/planning/dm2-expand-contract-runbook.md

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE "in_app_notifications" ADD COLUMN IF NOT EXISTS "id_new"   uuid        DEFAULT gen_random_uuid();
ALTER TABLE "in_app_notifications" ADD COLUMN IF NOT EXISTS "publicId" varchar(32);

UPDATE "in_app_notifications" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;

UPDATE "in_app_notifications"
SET "publicId" = 'not_' || substr(replace("id_new"::text, '-', ''), 1, 12)
WHERE "publicId" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "in_app_notifications" WHERE "id_new" IS NULL OR "publicId" IS NULL) THEN
    RAISE EXCEPTION 'DM-2 expand backfill incomplete for in_app_notifications';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION "in_app_notifications_dm2_dualmaintain"() RETURNS trigger AS $$
BEGIN
  IF NEW."id_new" IS NULL THEN
    NEW."id_new" := gen_random_uuid();
  END IF;
  IF NEW."publicId" IS NULL THEN
    NEW."publicId" := 'not_' || substr(replace(NEW."id_new"::text, '-', ''), 1, 12);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "in_app_notifications_dm2_dualmaintain" ON "in_app_notifications";
CREATE TRIGGER "in_app_notifications_dm2_dualmaintain"
BEFORE INSERT OR UPDATE ON "in_app_notifications"
FOR EACH ROW EXECUTE FUNCTION "in_app_notifications_dm2_dualmaintain"();

INSERT INTO "AuditLog" ("id", "aggregateType", "aggregateId", "eventName", "payload", "createdAt")
VALUES (
  gen_random_uuid(), 'Migration', gen_random_uuid(), 'DM-2-Expand-in_app_notifications',
  jsonb_build_object('migration', '20260418_dm2_expand_in_app_notifications', 'phase', 'expand',
    'columnsAdded', jsonb_build_array('id_new', 'publicId'),
    'triggerAdded', 'in_app_notifications_dm2_dualmaintain'),
  NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "in_app_notifications_id_new_key"   ON "in_app_notifications" ("id_new");
CREATE UNIQUE INDEX IF NOT EXISTS "in_app_notifications_publicId_key" ON "in_app_notifications" ("publicId");
