-- F-64 / D-103 round 22 rollback — drop actor-audit columns + FKs + indexes
-- on PersonReleaseApproval + StaffingRequestFulfilment.
--
-- Pure DDL drops; no data loss beyond the two nullable audit columns (which
-- were empty for legacy rows anyway).

DROP INDEX IF EXISTS "staffing_request_fulfilments_updatedByPersonId_idx";
DROP INDEX IF EXISTS "staffing_request_fulfilments_createdByPersonId_idx";

ALTER TABLE "staffing_request_fulfilments"
  DROP CONSTRAINT IF EXISTS "staffing_request_fulfilments_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "staffing_request_fulfilments_createdByPersonId_fkey";

ALTER TABLE "staffing_request_fulfilments"
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";

DROP INDEX IF EXISTS "person_release_approvals_updatedByPersonId_idx";
DROP INDEX IF EXISTS "person_release_approvals_createdByPersonId_idx";

ALTER TABLE "person_release_approvals"
  DROP CONSTRAINT IF EXISTS "person_release_approvals_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "person_release_approvals_createdByPersonId_fkey";

ALTER TABLE "person_release_approvals"
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";
