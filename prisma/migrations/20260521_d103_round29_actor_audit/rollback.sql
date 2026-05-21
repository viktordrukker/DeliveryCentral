-- Rollback for F-78 / D-103 round 29 — EntityLayoutDefinition + HelpTip actor-audit

DROP INDEX IF EXISTS "help_tips_updatedByPersonId_idx";
DROP INDEX IF EXISTS "help_tips_createdByPersonId_idx";
DROP INDEX IF EXISTS "EntityLayoutDefinition_updatedByPersonId_idx";
DROP INDEX IF EXISTS "EntityLayoutDefinition_createdByPersonId_idx";

ALTER TABLE "help_tips"
  DROP CONSTRAINT IF EXISTS "help_tips_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "help_tips_createdByPersonId_fkey",
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";

ALTER TABLE "EntityLayoutDefinition"
  DROP CONSTRAINT IF EXISTS "EntityLayoutDefinition_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "EntityLayoutDefinition_createdByPersonId_fkey",
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";
