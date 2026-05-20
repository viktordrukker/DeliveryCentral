-- F-46 / D-103 round 13 — actor-audit columns on HelpArticle + ProjectVendorEngagement
--
-- Adds `createdByPersonId` + `updatedByPersonId` UUID columns + FK to Person
-- + covering indexes. Both columns nullable to keep legacy rows intact.
--
-- REVERSIBLE: see rollback.sql.

ALTER TABLE "help_articles"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "help_articles"
  ADD CONSTRAINT "help_articles_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "help_articles"
  ADD CONSTRAINT "help_articles_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "help_articles_createdByPersonId_idx"
  ON "help_articles" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "help_articles_updatedByPersonId_idx"
  ON "help_articles" ("updatedByPersonId");

ALTER TABLE "project_vendor_engagements"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "project_vendor_engagements"
  ADD CONSTRAINT "project_vendor_engagements_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "project_vendor_engagements"
  ADD CONSTRAINT "project_vendor_engagements_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "project_vendor_engagements_createdByPersonId_idx"
  ON "project_vendor_engagements" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "project_vendor_engagements_updatedByPersonId_idx"
  ON "project_vendor_engagements" ("updatedByPersonId");
