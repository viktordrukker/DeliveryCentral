-- Rollback for 20260519_d103_round4_actor_audit. Idempotent.

DROP INDEX IF EXISTS "timesheet_weeks_createdByPersonId_idx";
DROP INDEX IF EXISTS "timesheet_weeks_updatedByPersonId_idx";
DROP INDEX IF EXISTS "project_risks_createdByPersonId_idx";
DROP INDEX IF EXISTS "project_risks_updatedByPersonId_idx";

ALTER TABLE "timesheet_weeks"
  DROP CONSTRAINT IF EXISTS "timesheet_weeks_createdByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "timesheet_weeks_updatedByPersonId_fkey",
  DROP COLUMN IF EXISTS "createdByPersonId",
  DROP COLUMN IF EXISTS "updatedByPersonId";

ALTER TABLE "project_risks"
  DROP CONSTRAINT IF EXISTS "project_risks_createdByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "project_risks_updatedByPersonId_fkey",
  DROP COLUMN IF EXISTS "createdByPersonId",
  DROP COLUMN IF EXISTS "updatedByPersonId";
