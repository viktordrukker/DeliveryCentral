-- F-68 / D-103 round 24 rollback — drop actor-audit columns + FKs + indexes
-- on StaffingRequest.
--
-- Pure DDL drops; no data loss beyond the two nullable audit columns (which
-- were empty for legacy rows anyway).

DROP INDEX IF EXISTS "staffing_requests_updatedByPersonId_idx";
DROP INDEX IF EXISTS "staffing_requests_createdByPersonId_idx";

ALTER TABLE "staffing_requests"
  DROP CONSTRAINT IF EXISTS "staffing_requests_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "staffing_requests_createdByPersonId_fkey";

ALTER TABLE "staffing_requests"
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";
