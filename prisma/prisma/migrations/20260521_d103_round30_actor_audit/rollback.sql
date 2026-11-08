-- Rollback for F-80 / D-103 round 30 — NotificationRequest + NotificationChannel actor-audit

DROP INDEX IF EXISTS "NotificationChannel_updatedByPersonId_idx";
DROP INDEX IF EXISTS "NotificationChannel_createdByPersonId_idx";
DROP INDEX IF EXISTS "NotificationRequest_updatedByPersonId_idx";
DROP INDEX IF EXISTS "NotificationRequest_createdByPersonId_idx";

ALTER TABLE "NotificationChannel"
  DROP CONSTRAINT IF EXISTS "NotificationChannel_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "NotificationChannel_createdByPersonId_fkey",
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";

ALTER TABLE "NotificationRequest"
  DROP CONSTRAINT IF EXISTS "NotificationRequest_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "NotificationRequest_createdByPersonId_fkey",
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";
