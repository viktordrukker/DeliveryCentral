-- F-58 / D-103 round 19 — actor-audit columns on CaseType + Contact
--
-- Adds `createdByPersonId` + `updatedByPersonId` UUID columns + FK to Person
-- + covering indexes. Both columns nullable to keep legacy rows intact.
--
-- REVERSIBLE: see rollback.sql.

ALTER TABLE "CaseType"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "CaseType"
  ADD CONSTRAINT "CaseType_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CaseType"
  ADD CONSTRAINT "CaseType_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "CaseType_createdByPersonId_idx"
  ON "CaseType" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "CaseType_updatedByPersonId_idx"
  ON "CaseType" ("updatedByPersonId");

ALTER TABLE "contacts"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "contacts"
  ADD CONSTRAINT "contacts_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "contacts"
  ADD CONSTRAINT "contacts_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "contacts_createdByPersonId_idx"
  ON "contacts" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "contacts_updatedByPersonId_idx"
  ON "contacts" ("updatedByPersonId");
