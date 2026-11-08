-- Rollback for F-72 / D-103 round 26 — PersonResourcePoolMembership + MetadataEntry actor-audit

DROP INDEX IF EXISTS "MetadataEntry_updatedByPersonId_idx";
DROP INDEX IF EXISTS "MetadataEntry_createdByPersonId_idx";
DROP INDEX IF EXISTS "PersonResourcePoolMembership_updatedByPersonId_idx";
DROP INDEX IF EXISTS "PersonResourcePoolMembership_createdByPersonId_idx";

ALTER TABLE "MetadataEntry"
  DROP CONSTRAINT IF EXISTS "MetadataEntry_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "MetadataEntry_createdByPersonId_fkey",
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";

ALTER TABLE "PersonResourcePoolMembership"
  DROP CONSTRAINT IF EXISTS "PersonResourcePoolMembership_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "PersonResourcePoolMembership_createdByPersonId_fkey",
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";
