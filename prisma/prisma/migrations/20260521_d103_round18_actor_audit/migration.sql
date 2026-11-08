-- F-56 / D-103 round 18 — actor-audit columns on OvertimeException + ProjectExternalLink
--
-- Adds `createdByPersonId` + `updatedByPersonId` UUID columns + FK to Person
-- + covering indexes. Both columns nullable to keep legacy rows intact.
--
-- REVERSIBLE: see rollback.sql.

ALTER TABLE "overtime_exceptions"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "overtime_exceptions"
  ADD CONSTRAINT "overtime_exceptions_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "overtime_exceptions"
  ADD CONSTRAINT "overtime_exceptions_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "overtime_exceptions_createdByPersonId_idx"
  ON "overtime_exceptions" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "overtime_exceptions_updatedByPersonId_idx"
  ON "overtime_exceptions" ("updatedByPersonId");

ALTER TABLE "ProjectExternalLink"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "ProjectExternalLink"
  ADD CONSTRAINT "ProjectExternalLink_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProjectExternalLink"
  ADD CONSTRAINT "ProjectExternalLink_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "ProjectExternalLink_createdByPersonId_idx"
  ON "ProjectExternalLink" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "ProjectExternalLink_updatedByPersonId_idx"
  ON "ProjectExternalLink" ("updatedByPersonId");
