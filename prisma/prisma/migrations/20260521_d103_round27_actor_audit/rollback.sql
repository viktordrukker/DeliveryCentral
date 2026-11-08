-- Rollback for F-74 / D-103 round 27 — PulseReport + IntegrationSyncState actor-audit

DROP INDEX IF EXISTS "IntegrationSyncState_updatedByPersonId_idx";
DROP INDEX IF EXISTS "IntegrationSyncState_createdByPersonId_idx";
DROP INDEX IF EXISTS "pulse_reports_updatedByPersonId_idx";
DROP INDEX IF EXISTS "pulse_reports_createdByPersonId_idx";

ALTER TABLE "IntegrationSyncState"
  DROP CONSTRAINT IF EXISTS "IntegrationSyncState_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "IntegrationSyncState_createdByPersonId_fkey",
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";

ALTER TABLE "pulse_reports"
  DROP CONSTRAINT IF EXISTS "pulse_reports_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "pulse_reports_createdByPersonId_fkey",
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";
