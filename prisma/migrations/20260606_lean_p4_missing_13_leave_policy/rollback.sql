-- LEAN-P4-missing-13 rollback — drop the leave_policies table.

ALTER TABLE IF EXISTS "leave_policies"
  DROP CONSTRAINT IF EXISTS "leave_policies_createdByPersonId_fkey";

ALTER TABLE IF EXISTS "leave_policies"
  DROP CONSTRAINT IF EXISTS "leave_policies_updatedByPersonId_fkey";

DROP INDEX IF EXISTS "leave_policies_publicId_key";
DROP INDEX IF EXISTS "leave_policies_leaveType_active_idx";
DROP INDEX IF EXISTS "leave_policies_createdByPersonId_idx";
DROP INDEX IF EXISTS "leave_policies_updatedByPersonId_idx";

DROP TABLE IF EXISTS "leave_policies";
