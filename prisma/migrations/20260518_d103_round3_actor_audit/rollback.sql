-- Rollback for 20260518_d103_round3_actor_audit.
--
-- Drops the 4 added FKs, indexes, and columns. Idempotent.

DROP INDEX IF EXISTS "leave_requests_createdByPersonId_idx";
DROP INDEX IF EXISTS "leave_requests_updatedByPersonId_idx";
DROP INDEX IF EXISTS "AssignmentApproval_createdByPersonId_idx";
DROP INDEX IF EXISTS "AssignmentApproval_updatedByPersonId_idx";

ALTER TABLE "leave_requests"
  DROP CONSTRAINT IF EXISTS "leave_requests_createdByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "leave_requests_updatedByPersonId_fkey",
  DROP COLUMN IF EXISTS "createdByPersonId",
  DROP COLUMN IF EXISTS "updatedByPersonId";

ALTER TABLE "AssignmentApproval"
  DROP CONSTRAINT IF EXISTS "AssignmentApproval_createdByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "AssignmentApproval_updatedByPersonId_fkey",
  DROP COLUMN IF EXISTS "createdByPersonId",
  DROP COLUMN IF EXISTS "updatedByPersonId";
