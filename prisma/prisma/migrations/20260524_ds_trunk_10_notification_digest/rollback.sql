-- Rollback for 20260524_ds_trunk_10_notification_digest
-- Pure additive migration -> drop in reverse order, idempotent.

DROP TABLE IF EXISTS "person_notification_digest";
DROP TYPE  IF EXISTS "DigestSchedule";
