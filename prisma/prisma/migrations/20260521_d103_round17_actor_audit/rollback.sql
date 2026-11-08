-- F-54 / D-103 round 17 rollback — drop actor-audit columns + FKs + indexes
-- on CustomFieldDefinition + MetadataDictionary.
--
-- Pure DDL drops; no data loss beyond the two nullable audit columns (which
-- were empty for legacy rows anyway).

DROP INDEX IF EXISTS "MetadataDictionary_updatedByPersonId_idx";
DROP INDEX IF EXISTS "MetadataDictionary_createdByPersonId_idx";

ALTER TABLE "MetadataDictionary"
  DROP CONSTRAINT IF EXISTS "MetadataDictionary_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "MetadataDictionary_createdByPersonId_fkey";

ALTER TABLE "MetadataDictionary"
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";

DROP INDEX IF EXISTS "CustomFieldDefinition_updatedByPersonId_idx";
DROP INDEX IF EXISTS "CustomFieldDefinition_createdByPersonId_idx";

ALTER TABLE "CustomFieldDefinition"
  DROP CONSTRAINT IF EXISTS "CustomFieldDefinition_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "CustomFieldDefinition_createdByPersonId_fkey";

ALTER TABLE "CustomFieldDefinition"
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";
