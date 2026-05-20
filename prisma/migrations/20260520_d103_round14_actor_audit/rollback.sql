-- F-48 / D-103 round 14 rollback — drop actor-audit columns + FKs + indexes
-- on ProjectWorkstream + WorkflowDefinition.
--
-- Pure DDL drops; no data loss beyond the two nullable audit columns (which
-- were empty for legacy rows anyway).

DROP INDEX IF EXISTS "WorkflowDefinition_updatedByPersonId_idx";
DROP INDEX IF EXISTS "WorkflowDefinition_createdByPersonId_idx";

ALTER TABLE "WorkflowDefinition"
  DROP CONSTRAINT IF EXISTS "WorkflowDefinition_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "WorkflowDefinition_createdByPersonId_fkey";

ALTER TABLE "WorkflowDefinition"
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";

DROP INDEX IF EXISTS "project_workstreams_updatedByPersonId_idx";
DROP INDEX IF EXISTS "project_workstreams_createdByPersonId_idx";

ALTER TABLE "project_workstreams"
  DROP CONSTRAINT IF EXISTS "project_workstreams_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "project_workstreams_createdByPersonId_fkey";

ALTER TABLE "project_workstreams"
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";
