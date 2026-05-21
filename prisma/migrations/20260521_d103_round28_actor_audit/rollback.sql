-- Rollback for F-76 / D-103 round 28 — LocalAccount + WorkEvidence actor-audit

DROP INDEX IF EXISTS "WorkEvidence_updatedByPersonId_idx";
DROP INDEX IF EXISTS "WorkEvidence_createdByPersonId_idx";
DROP INDEX IF EXISTS "LocalAccount_updatedByPersonId_idx";
DROP INDEX IF EXISTS "LocalAccount_createdByPersonId_idx";

ALTER TABLE "WorkEvidence"
  DROP CONSTRAINT IF EXISTS "WorkEvidence_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "WorkEvidence_createdByPersonId_fkey",
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";

ALTER TABLE "LocalAccount"
  DROP CONSTRAINT IF EXISTS "LocalAccount_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "LocalAccount_createdByPersonId_fkey",
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";
