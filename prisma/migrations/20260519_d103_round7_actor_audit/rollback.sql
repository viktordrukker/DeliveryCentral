-- Rollback for 20260519_d103_round7_actor_audit. Idempotent.

DROP INDEX IF EXISTS "ResourcePool_createdByPersonId_idx";
DROP INDEX IF EXISTS "ResourcePool_updatedByPersonId_idx";
DROP INDEX IF EXISTS "Position_createdByPersonId_idx";
DROP INDEX IF EXISTS "Position_updatedByPersonId_idx";

ALTER TABLE "ResourcePool"
  DROP CONSTRAINT IF EXISTS "ResourcePool_createdByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "ResourcePool_updatedByPersonId_fkey",
  DROP COLUMN IF EXISTS "createdByPersonId",
  DROP COLUMN IF EXISTS "updatedByPersonId";

ALTER TABLE "Position"
  DROP CONSTRAINT IF EXISTS "Position_createdByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "Position_updatedByPersonId_fkey",
  DROP COLUMN IF EXISTS "createdByPersonId",
  DROP COLUMN IF EXISTS "updatedByPersonId";
