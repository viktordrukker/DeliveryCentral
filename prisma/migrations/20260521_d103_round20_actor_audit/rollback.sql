-- F-60 / D-103 round 20 rollback — drop actor-audit columns + FKs + indexes
-- on CustomFieldValue + StaffingRequestProposalCandidate.
--
-- Pure DDL drops; no data loss beyond the two nullable audit columns (which
-- were empty for legacy rows anyway).

DROP INDEX IF EXISTS "StaffingRequestProposalCandidate_updatedByPersonId_idx";
DROP INDEX IF EXISTS "StaffingRequestProposalCandidate_createdByPersonId_idx";

ALTER TABLE "StaffingRequestProposalCandidate"
  DROP CONSTRAINT IF EXISTS "StaffingRequestProposalCandidate_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "StaffingRequestProposalCandidate_createdByPersonId_fkey";

ALTER TABLE "StaffingRequestProposalCandidate"
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";

DROP INDEX IF EXISTS "CustomFieldValue_updatedByPersonId_idx";
DROP INDEX IF EXISTS "CustomFieldValue_createdByPersonId_idx";

ALTER TABLE "CustomFieldValue"
  DROP CONSTRAINT IF EXISTS "CustomFieldValue_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "CustomFieldValue_createdByPersonId_fkey";

ALTER TABLE "CustomFieldValue"
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";
