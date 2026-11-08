-- F-50 / D-103 round 15 — actor-audit columns on ProjectRetrospective + ProjectRolePlan
--
-- Adds `createdByPersonId` + `updatedByPersonId` UUID columns + FK to Person
-- + covering indexes. Both columns nullable to keep legacy rows intact.
--
-- REVERSIBLE: see rollback.sql.

ALTER TABLE "project_retrospectives"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "project_retrospectives"
  ADD CONSTRAINT "project_retrospectives_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "project_retrospectives"
  ADD CONSTRAINT "project_retrospectives_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "project_retrospectives_createdByPersonId_idx"
  ON "project_retrospectives" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "project_retrospectives_updatedByPersonId_idx"
  ON "project_retrospectives" ("updatedByPersonId");

ALTER TABLE "project_role_plans"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "project_role_plans"
  ADD CONSTRAINT "project_role_plans_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "project_role_plans"
  ADD CONSTRAINT "project_role_plans_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "project_role_plans_createdByPersonId_idx"
  ON "project_role_plans" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "project_role_plans_updatedByPersonId_idx"
  ON "project_role_plans" ("updatedByPersonId");
