-- F-62 / D-103 round 21 rollback — drop actor-audit columns + FKs + indexes
-- on WorkflowStateDefinition + TimesheetEntry.
--
-- Pure DDL drops; no data loss beyond the two nullable audit columns (which
-- were empty for legacy rows anyway).

DROP INDEX IF EXISTS "timesheet_entries_updatedByPersonId_idx";
DROP INDEX IF EXISTS "timesheet_entries_createdByPersonId_idx";

ALTER TABLE "timesheet_entries"
  DROP CONSTRAINT IF EXISTS "timesheet_entries_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "timesheet_entries_createdByPersonId_fkey";

ALTER TABLE "timesheet_entries"
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";

DROP INDEX IF EXISTS "WorkflowStateDefinition_updatedByPersonId_idx";
DROP INDEX IF EXISTS "WorkflowStateDefinition_createdByPersonId_idx";

ALTER TABLE "WorkflowStateDefinition"
  DROP CONSTRAINT IF EXISTS "WorkflowStateDefinition_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "WorkflowStateDefinition_createdByPersonId_fkey";

ALTER TABLE "WorkflowStateDefinition"
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";
