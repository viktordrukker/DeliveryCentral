-- F-58 / D-103 round 19 rollback — drop actor-audit columns + FKs + indexes
-- on CaseType + Contact.
--
-- Pure DDL drops; no data loss beyond the two nullable audit columns (which
-- were empty for legacy rows anyway).

DROP INDEX IF EXISTS "contacts_updatedByPersonId_idx";
DROP INDEX IF EXISTS "contacts_createdByPersonId_idx";

ALTER TABLE "contacts"
  DROP CONSTRAINT IF EXISTS "contacts_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "contacts_createdByPersonId_fkey";

ALTER TABLE "contacts"
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";

DROP INDEX IF EXISTS "CaseType_updatedByPersonId_idx";
DROP INDEX IF EXISTS "CaseType_createdByPersonId_idx";

ALTER TABLE "CaseType"
  DROP CONSTRAINT IF EXISTS "CaseType_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "CaseType_createdByPersonId_fkey";

ALTER TABLE "CaseType"
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";
