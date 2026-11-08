-- F-66 / D-103 round 23 rollback — drop actor-audit columns + FKs + indexes
-- on RadiatorThresholdConfig + Skill (incl. the new updatedAt on skills).
--
-- Pure DDL drops; no data loss beyond the new audit columns + the
-- newly-added `updatedAt` column on skills (which Postgres will reset on
-- re-add via the forward migration's `DEFAULT NOW()`).

DROP INDEX IF EXISTS "skills_updatedByPersonId_idx";
DROP INDEX IF EXISTS "skills_createdByPersonId_idx";

ALTER TABLE "skills"
  DROP CONSTRAINT IF EXISTS "skills_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "skills_createdByPersonId_fkey";

ALTER TABLE "skills"
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId",
  DROP COLUMN IF EXISTS "updatedAt";

DROP INDEX IF EXISTS "radiator_threshold_configs_createdByPersonId_idx";

ALTER TABLE "radiator_threshold_configs"
  DROP CONSTRAINT IF EXISTS "radiator_threshold_configs_createdByPersonId_fkey";

ALTER TABLE "radiator_threshold_configs"
  DROP COLUMN IF EXISTS "createdByPersonId";
