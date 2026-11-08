-- F-56 / D-103 round 18 rollback — drop actor-audit columns + FKs + indexes
-- on OvertimeException + ProjectExternalLink.
--
-- Pure DDL drops; no data loss beyond the two nullable audit columns (which
-- were empty for legacy rows anyway).

DROP INDEX IF EXISTS "ProjectExternalLink_updatedByPersonId_idx";
DROP INDEX IF EXISTS "ProjectExternalLink_createdByPersonId_idx";

ALTER TABLE "ProjectExternalLink"
  DROP CONSTRAINT IF EXISTS "ProjectExternalLink_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "ProjectExternalLink_createdByPersonId_fkey";

ALTER TABLE "ProjectExternalLink"
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";

DROP INDEX IF EXISTS "overtime_exceptions_updatedByPersonId_idx";
DROP INDEX IF EXISTS "overtime_exceptions_createdByPersonId_idx";

ALTER TABLE "overtime_exceptions"
  DROP CONSTRAINT IF EXISTS "overtime_exceptions_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "overtime_exceptions_createdByPersonId_fkey";

ALTER TABLE "overtime_exceptions"
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";
