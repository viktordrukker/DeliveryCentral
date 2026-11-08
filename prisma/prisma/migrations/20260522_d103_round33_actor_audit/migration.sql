-- F-84 / D-103 round 33 — actor-audit columns on NotificationDelivery + FiscalCalendar
--
-- NotificationDelivery is a delivery-attempt audit row per
-- NotificationRequest (mostly system-written via outbox). FiscalCalendar
-- (mapped table: fiscal_calendars) is admin-curated per-tenant config
-- for fiscal-year boundaries (multi-region tenants override via
-- regionCode). Both get the canonical actor-audit pair.
--
-- REVERSIBLE: see rollback.sql.

-- NotificationDelivery --------------------------------------------------

ALTER TABLE "NotificationDelivery"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "NotificationDelivery"
  ADD CONSTRAINT "NotificationDelivery_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "NotificationDelivery"
  ADD CONSTRAINT "NotificationDelivery_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "NotificationDelivery_createdByPersonId_idx"
  ON "NotificationDelivery" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "NotificationDelivery_updatedByPersonId_idx"
  ON "NotificationDelivery" ("updatedByPersonId");

-- fiscal_calendars (FiscalCalendar) -------------------------------------

ALTER TABLE "fiscal_calendars"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "fiscal_calendars"
  ADD CONSTRAINT "fiscal_calendars_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "fiscal_calendars"
  ADD CONSTRAINT "fiscal_calendars_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "fiscal_calendars_createdByPersonId_idx"
  ON "fiscal_calendars" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "fiscal_calendars_updatedByPersonId_idx"
  ON "fiscal_calendars" ("updatedByPersonId");
