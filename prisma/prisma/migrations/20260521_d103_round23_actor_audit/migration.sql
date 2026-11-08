-- F-66 / D-103 round 23 — actor-audit columns on RadiatorThresholdConfig + Skill
--
-- Asymmetric round:
--   • RadiatorThresholdConfig already has `updatedByPersonId` + `updatedAt`
--     from PR-v1 work. Adds the missing `createdByPersonId` (no `createdAt`
--     since the table never had one; the existing `updatedAt` doubles as
--     "last write" without canonical lifecycle).
--   • Skill is missing `updatedAt` entirely. Adds `updatedAt` + the
--     `createdByPersonId` / `updatedByPersonId` canonical pair.
--
-- Both columns nullable to keep legacy rows intact.
--
-- REVERSIBLE: see rollback.sql.

ALTER TABLE "radiator_threshold_configs"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID;

ALTER TABLE "radiator_threshold_configs"
  ADD CONSTRAINT "radiator_threshold_configs_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "radiator_threshold_configs_createdByPersonId_idx"
  ON "radiator_threshold_configs" ("createdByPersonId");

-- Two-step backfill for `updatedAt`: Prisma's `@updatedAt` directive
-- emits no SQL default (the ORM populates the value on insert/update), so
-- using `DEFAULT NOW()` in DDL would drift the schema vs the generated
-- baseline. Add nullable, backfill, then set NOT NULL.
ALTER TABLE "skills"
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

UPDATE "skills" SET "updatedAt" = NOW() WHERE "updatedAt" IS NULL;

ALTER TABLE "skills" ALTER COLUMN "updatedAt" SET NOT NULL;

ALTER TABLE "skills"
  ADD CONSTRAINT "skills_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "skills"
  ADD CONSTRAINT "skills_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "skills_createdByPersonId_idx"
  ON "skills" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "skills_updatedByPersonId_idx"
  ON "skills" ("updatedByPersonId");
