-- F-48 / D-103 round 14 — actor-audit columns on ProjectWorkstream + WorkflowDefinition
--
-- Adds `createdByPersonId` + `updatedByPersonId` UUID columns + FK to Person
-- + covering indexes. Both columns nullable to keep legacy rows intact.
--
-- REVERSIBLE: see rollback.sql.

ALTER TABLE "project_workstreams"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "project_workstreams"
  ADD CONSTRAINT "project_workstreams_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "project_workstreams"
  ADD CONSTRAINT "project_workstreams_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "project_workstreams_createdByPersonId_idx"
  ON "project_workstreams" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "project_workstreams_updatedByPersonId_idx"
  ON "project_workstreams" ("updatedByPersonId");

ALTER TABLE "WorkflowDefinition"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "WorkflowDefinition"
  ADD CONSTRAINT "WorkflowDefinition_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WorkflowDefinition"
  ADD CONSTRAINT "WorkflowDefinition_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "WorkflowDefinition_createdByPersonId_idx"
  ON "WorkflowDefinition" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "WorkflowDefinition_updatedByPersonId_idx"
  ON "WorkflowDefinition" ("updatedByPersonId");
