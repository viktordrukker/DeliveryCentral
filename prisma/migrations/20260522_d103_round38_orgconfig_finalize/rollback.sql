-- Rollback for F-89 / D-103 round 38 — OrganizationConfig final closure

DROP INDEX IF EXISTS "organization_configs_createdByPersonId_idx";

ALTER TABLE "organization_configs"
  DROP CONSTRAINT IF EXISTS "organization_configs_createdByPersonId_fkey",
  DROP COLUMN IF EXISTS "createdByPersonId";
