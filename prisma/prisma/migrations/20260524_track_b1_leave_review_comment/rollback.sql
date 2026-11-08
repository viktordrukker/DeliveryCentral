-- Track B.1 rollback — remove the reviewComment column.
-- Idempotent (IF EXISTS) so re-running is safe.

ALTER TABLE "leave_requests"
  DROP COLUMN IF EXISTS "reviewComment";
