-- Rollback for 20260520_d103_round11_actor_audit. Idempotent.

DROP INDEX IF EXISTS "clients_createdByPersonId_idx";
DROP INDEX IF EXISTS "clients_updatedByPersonId_idx";
DROP INDEX IF EXISTS "vendors_createdByPersonId_idx";
DROP INDEX IF EXISTS "vendors_updatedByPersonId_idx";

ALTER TABLE "clients"
  DROP CONSTRAINT IF EXISTS "clients_createdByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "clients_updatedByPersonId_fkey",
  DROP COLUMN IF EXISTS "createdByPersonId",
  DROP COLUMN IF EXISTS "updatedByPersonId";

ALTER TABLE "vendors"
  DROP CONSTRAINT IF EXISTS "vendors_createdByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "vendors_updatedByPersonId_fkey",
  DROP COLUMN IF EXISTS "createdByPersonId",
  DROP COLUMN IF EXISTS "updatedByPersonId";
