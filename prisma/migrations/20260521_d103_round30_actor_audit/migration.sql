-- F-80 / D-103 round 30 — actor-audit columns on NotificationRequest + NotificationChannel
--
-- NotificationRequest captures every queued/sent notification (heavy
-- write volume — but mostly system-generated via outbox); NotificationChannel
-- holds per-tenant channel config (email/SMS/webhook). Adding the
-- canonical pair lets observability distinguish admin-edited channel
-- config from upgrade-shipped seed config, and tag any admin-injected
-- ad-hoc NotificationRequest (rare but happens in dev/QA).
--
-- REVERSIBLE: see rollback.sql.

-- NotificationRequest ---------------------------------------------------

ALTER TABLE "NotificationRequest"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "NotificationRequest"
  ADD CONSTRAINT "NotificationRequest_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "NotificationRequest"
  ADD CONSTRAINT "NotificationRequest_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "NotificationRequest_createdByPersonId_idx"
  ON "NotificationRequest" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "NotificationRequest_updatedByPersonId_idx"
  ON "NotificationRequest" ("updatedByPersonId");

-- NotificationChannel ---------------------------------------------------

ALTER TABLE "NotificationChannel"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "NotificationChannel"
  ADD CONSTRAINT "NotificationChannel_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "NotificationChannel"
  ADD CONSTRAINT "NotificationChannel_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "NotificationChannel_createdByPersonId_idx"
  ON "NotificationChannel" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "NotificationChannel_updatedByPersonId_idx"
  ON "NotificationChannel" ("updatedByPersonId");
