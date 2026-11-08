-- Rollback for 20260520_d103_round9_actor_audit. Idempotent.

DROP INDEX IF EXISTS "NotificationTemplate_createdByPersonId_idx";
DROP INDEX IF EXISTS "NotificationTemplate_updatedByPersonId_idx";
DROP INDEX IF EXISTS "responsibility_rules_createdByPersonId_idx";
DROP INDEX IF EXISTS "responsibility_rules_updatedByPersonId_idx";

ALTER TABLE "NotificationTemplate"
  DROP CONSTRAINT IF EXISTS "NotificationTemplate_createdByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "NotificationTemplate_updatedByPersonId_fkey",
  DROP COLUMN IF EXISTS "createdByPersonId",
  DROP COLUMN IF EXISTS "updatedByPersonId";

ALTER TABLE "responsibility_rules"
  DROP CONSTRAINT IF EXISTS "responsibility_rules_createdByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "responsibility_rules_updatedByPersonId_fkey",
  DROP COLUMN IF EXISTS "createdByPersonId",
  DROP COLUMN IF EXISTS "updatedByPersonId";
