-- LEAN-P4a-1 rollback — drop tenancy + status + audit additions.

ALTER TABLE "planner_scenarios" DROP CONSTRAINT IF EXISTS "planner_scenarios_tenantId_fkey";
ALTER TABLE "planner_scenarios" DROP CONSTRAINT IF EXISTS "planner_scenarios_updatedByPersonId_fkey";

DROP INDEX IF EXISTS "planner_scenarios_publicId_key";
DROP INDEX IF EXISTS "planner_scenarios_tenantId_status_idx";
DROP INDEX IF EXISTS "planner_scenarios_updatedByPersonId_idx";

ALTER TABLE "planner_scenarios" DROP COLUMN IF EXISTS "publicId";
ALTER TABLE "planner_scenarios" DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "planner_scenarios" DROP COLUMN IF EXISTS "status";
ALTER TABLE "planner_scenarios" DROP COLUMN IF EXISTS "updatedByPersonId";

DROP TYPE IF EXISTS "PlannerScenarioStatus";
