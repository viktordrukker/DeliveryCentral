-- F-46 / D-103 round 13 rollback — drop actor-audit columns + FKs + indexes
-- on HelpArticle + ProjectVendorEngagement.
--
-- Pure DDL drops; no data loss beyond the two nullable audit columns (which
-- were empty for legacy rows anyway).

DROP INDEX IF EXISTS "project_vendor_engagements_updatedByPersonId_idx";
DROP INDEX IF EXISTS "project_vendor_engagements_createdByPersonId_idx";

ALTER TABLE "project_vendor_engagements"
  DROP CONSTRAINT IF EXISTS "project_vendor_engagements_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "project_vendor_engagements_createdByPersonId_fkey";

ALTER TABLE "project_vendor_engagements"
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";

DROP INDEX IF EXISTS "help_articles_updatedByPersonId_idx";
DROP INDEX IF EXISTS "help_articles_createdByPersonId_idx";

ALTER TABLE "help_articles"
  DROP CONSTRAINT IF EXISTS "help_articles_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "help_articles_createdByPersonId_fkey";

ALTER TABLE "help_articles"
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";
