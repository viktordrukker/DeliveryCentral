-- Rollback for F-84 / D-103 round 33 — NotificationDelivery + FiscalCalendar actor-audit

DROP INDEX IF EXISTS "fiscal_calendars_updatedByPersonId_idx";
DROP INDEX IF EXISTS "fiscal_calendars_createdByPersonId_idx";
DROP INDEX IF EXISTS "NotificationDelivery_updatedByPersonId_idx";
DROP INDEX IF EXISTS "NotificationDelivery_createdByPersonId_idx";

ALTER TABLE "fiscal_calendars"
  DROP CONSTRAINT IF EXISTS "fiscal_calendars_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "fiscal_calendars_createdByPersonId_fkey",
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";

ALTER TABLE "NotificationDelivery"
  DROP CONSTRAINT IF EXISTS "NotificationDelivery_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "NotificationDelivery_createdByPersonId_fkey",
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";
