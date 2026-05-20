-- F-50 / D-103 round 15 rollback — drop actor-audit columns + FKs + indexes
-- on ProjectRetrospective + ProjectRolePlan.
--
-- Pure DDL drops; no data loss beyond the two nullable audit columns (which
-- were empty for legacy rows anyway).

DROP INDEX IF EXISTS "project_role_plans_updatedByPersonId_idx";
DROP INDEX IF EXISTS "project_role_plans_createdByPersonId_idx";

ALTER TABLE "project_role_plans"
  DROP CONSTRAINT IF EXISTS "project_role_plans_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "project_role_plans_createdByPersonId_fkey";

ALTER TABLE "project_role_plans"
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";

DROP INDEX IF EXISTS "project_retrospectives_updatedByPersonId_idx";
DROP INDEX IF EXISTS "project_retrospectives_createdByPersonId_idx";

ALTER TABLE "project_retrospectives"
  DROP CONSTRAINT IF EXISTS "project_retrospectives_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "project_retrospectives_createdByPersonId_fkey";

ALTER TABLE "project_retrospectives"
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";
