-- FE-#260 rollback — drop the FK + index. Idempotent (IF EXISTS).

ALTER TABLE "project_milestones"
  DROP CONSTRAINT IF EXISTS "project_milestones_workstreamId_fkey";

DROP INDEX IF EXISTS "project_milestones_workstreamId_idx";
