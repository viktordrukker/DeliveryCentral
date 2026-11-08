-- Rollback for 20260503_hd_03_outbox_retry_tracking.
-- Drops the two columns added by the forward migration.

ALTER TABLE "OutboxEvent"
  DROP COLUMN IF EXISTS "lastError";

ALTER TABLE "OutboxEvent"
  DROP COLUMN IF EXISTS "attempts";
