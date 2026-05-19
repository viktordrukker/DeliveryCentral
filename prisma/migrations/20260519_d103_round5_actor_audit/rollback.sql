-- Rollback for 20260519_d103_round5_actor_audit. Idempotent.

DROP INDEX IF EXISTS "project_milestones_createdByPersonId_idx";
DROP INDEX IF EXISTS "project_milestones_updatedByPersonId_idx";
DROP INDEX IF EXISTS "budget_approvals_createdByPersonId_idx";
DROP INDEX IF EXISTS "budget_approvals_updatedByPersonId_idx";

ALTER TABLE "project_milestones"
  DROP CONSTRAINT IF EXISTS "project_milestones_createdByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "project_milestones_updatedByPersonId_fkey",
  DROP COLUMN IF EXISTS "createdByPersonId",
  DROP COLUMN IF EXISTS "updatedByPersonId";

ALTER TABLE "budget_approvals"
  DROP CONSTRAINT IF EXISTS "budget_approvals_createdByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "budget_approvals_updatedByPersonId_fkey",
  DROP COLUMN IF EXISTS "createdByPersonId",
  DROP COLUMN IF EXISTS "updatedByPersonId";
