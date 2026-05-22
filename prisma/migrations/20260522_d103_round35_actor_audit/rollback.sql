-- Rollback for F-86 / D-103 round 35 — M365 + Radius reconciliation actor-audit

DROP INDEX IF EXISTS "RadiusReconciliationRecord_updatedByPersonId_idx";
DROP INDEX IF EXISTS "RadiusReconciliationRecord_createdByPersonId_idx";
DROP INDEX IF EXISTS "M365DirectoryReconciliationRecord_updatedByPersonId_idx";
DROP INDEX IF EXISTS "M365DirectoryReconciliationRecord_createdByPersonId_idx";

ALTER TABLE "RadiusReconciliationRecord"
  DROP CONSTRAINT IF EXISTS "RadiusReconciliationRecord_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "RadiusReconciliationRecord_createdByPersonId_fkey",
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";

ALTER TABLE "M365DirectoryReconciliationRecord"
  DROP CONSTRAINT IF EXISTS "M365DirectoryReconciliationRecord_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "M365DirectoryReconciliationRecord_createdByPersonId_fkey",
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";
