-- LEAN-P4-missing-9 rollback — drops the DM escalation table + enum.
-- See REVERSIBLE.md for safety contract.

DROP INDEX IF EXISTS "dm_escalations_publicId_key";
DROP INDEX IF EXISTS "dm_escalations_status_createdAt_idx";
DROP INDEX IF EXISTS "dm_escalations_escalatedByPersonId_status_idx";
DROP INDEX IF EXISTS "dm_escalations_escalatedToPersonId_status_idx";
DROP INDEX IF EXISTS "dm_escalations_resolvedByPersonId_idx";

ALTER TABLE IF EXISTS "dm_escalations"
  DROP CONSTRAINT IF EXISTS "dm_escalations_escalatedByPersonId_fkey";

ALTER TABLE IF EXISTS "dm_escalations"
  DROP CONSTRAINT IF EXISTS "dm_escalations_escalatedToPersonId_fkey";

ALTER TABLE IF EXISTS "dm_escalations"
  DROP CONSTRAINT IF EXISTS "dm_escalations_resolvedByPersonId_fkey";

DROP TABLE IF EXISTS "dm_escalations";

DROP TYPE IF EXISTS "DmEscalationStatus";
