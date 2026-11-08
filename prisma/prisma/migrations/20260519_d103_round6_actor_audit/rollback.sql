-- Rollback for 20260519_d103_round6_actor_audit. Idempotent.

DROP INDEX IF EXISTS "OrgUnit_createdByPersonId_idx";
DROP INDEX IF EXISTS "OrgUnit_updatedByPersonId_idx";
DROP INDEX IF EXISTS "StaffingRequestProposalSlate_createdByPersonId_idx";
DROP INDEX IF EXISTS "StaffingRequestProposalSlate_updatedByPersonId_idx";

ALTER TABLE "OrgUnit"
  DROP CONSTRAINT IF EXISTS "OrgUnit_createdByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "OrgUnit_updatedByPersonId_fkey",
  DROP COLUMN IF EXISTS "createdByPersonId",
  DROP COLUMN IF EXISTS "updatedByPersonId";

ALTER TABLE "StaffingRequestProposalSlate"
  DROP CONSTRAINT IF EXISTS "StaffingRequestProposalSlate_createdByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "StaffingRequestProposalSlate_updatedByPersonId_fkey",
  DROP COLUMN IF EXISTS "createdByPersonId",
  DROP COLUMN IF EXISTS "updatedByPersonId";
