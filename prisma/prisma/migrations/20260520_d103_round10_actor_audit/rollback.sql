-- Rollback for 20260520_d103_round10_actor_audit. Idempotent.

DROP INDEX IF EXISTS "overtime_policies_createdByPersonId_idx";
DROP INDEX IF EXISTS "overtime_policies_updatedByPersonId_idx";
DROP INDEX IF EXISTS "platform_settings_createdByPersonId_idx";
DROP INDEX IF EXISTS "platform_settings_updatedByPersonId_idx";

ALTER TABLE "overtime_policies"
  DROP CONSTRAINT IF EXISTS "overtime_policies_createdByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "overtime_policies_updatedByPersonId_fkey",
  DROP COLUMN IF EXISTS "createdByPersonId",
  DROP COLUMN IF EXISTS "updatedByPersonId";

ALTER TABLE "platform_settings"
  DROP CONSTRAINT IF EXISTS "platform_settings_createdByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "platform_settings_updatedByPersonId_fkey",
  DROP COLUMN IF EXISTS "createdByPersonId",
  DROP COLUMN IF EXISTS "updatedByPersonId";
