-- Rollback for 20260520_d103_round12_actor_audit. Idempotent.

DROP INDEX IF EXISTS "project_change_requests_createdByPersonId_idx";
DROP INDEX IF EXISTS "project_change_requests_updatedByPersonId_idx";
DROP INDEX IF EXISTS "project_activation_approvals_createdByPersonId_idx";
DROP INDEX IF EXISTS "project_activation_approvals_updatedByPersonId_idx";

ALTER TABLE "project_change_requests"
  DROP CONSTRAINT IF EXISTS "project_change_requests_createdByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "project_change_requests_updatedByPersonId_fkey",
  DROP COLUMN IF EXISTS "createdByPersonId",
  DROP COLUMN IF EXISTS "updatedByPersonId";

ALTER TABLE "project_activation_approvals"
  DROP CONSTRAINT IF EXISTS "project_activation_approvals_createdByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "project_activation_approvals_updatedByPersonId_fkey",
  DROP COLUMN IF EXISTS "createdByPersonId",
  DROP COLUMN IF EXISTS "updatedByPersonId";
