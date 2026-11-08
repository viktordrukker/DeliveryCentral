-- F-62 / D-103 round 21 — actor-audit columns on WorkflowStateDefinition + TimesheetEntry
--
-- Adds `createdByPersonId` + `updatedByPersonId` UUID columns + FK to Person
-- + covering indexes. Both columns nullable to keep legacy rows intact.
--
-- REVERSIBLE: see rollback.sql.

ALTER TABLE "WorkflowStateDefinition"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "WorkflowStateDefinition"
  ADD CONSTRAINT "WorkflowStateDefinition_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WorkflowStateDefinition"
  ADD CONSTRAINT "WorkflowStateDefinition_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "WorkflowStateDefinition_createdByPersonId_idx"
  ON "WorkflowStateDefinition" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "WorkflowStateDefinition_updatedByPersonId_idx"
  ON "WorkflowStateDefinition" ("updatedByPersonId");

ALTER TABLE "timesheet_entries"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "timesheet_entries"
  ADD CONSTRAINT "timesheet_entries_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "timesheet_entries"
  ADD CONSTRAINT "timesheet_entries_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "timesheet_entries_createdByPersonId_idx"
  ON "timesheet_entries" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "timesheet_entries_updatedByPersonId_idx"
  ON "timesheet_entries" ("updatedByPersonId");
