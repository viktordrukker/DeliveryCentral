-- F-54 / D-103 round 17 — actor-audit columns on CustomFieldDefinition + MetadataDictionary
--
-- Adds `createdByPersonId` + `updatedByPersonId` UUID columns + FK to Person
-- + covering indexes. Both columns nullable to keep legacy rows intact.
--
-- REVERSIBLE: see rollback.sql.

ALTER TABLE "CustomFieldDefinition"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "CustomFieldDefinition"
  ADD CONSTRAINT "CustomFieldDefinition_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CustomFieldDefinition"
  ADD CONSTRAINT "CustomFieldDefinition_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "CustomFieldDefinition_createdByPersonId_idx"
  ON "CustomFieldDefinition" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "CustomFieldDefinition_updatedByPersonId_idx"
  ON "CustomFieldDefinition" ("updatedByPersonId");

ALTER TABLE "MetadataDictionary"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "MetadataDictionary"
  ADD CONSTRAINT "MetadataDictionary_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MetadataDictionary"
  ADD CONSTRAINT "MetadataDictionary_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "MetadataDictionary_createdByPersonId_idx"
  ON "MetadataDictionary" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "MetadataDictionary_updatedByPersonId_idx"
  ON "MetadataDictionary" ("updatedByPersonId");
