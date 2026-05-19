-- F-40 / D-103 + DM-5-5 round 10 — actor-audit columns on
-- OvertimePolicy and PlatformSetting.
--
-- Continues the round-by-round sweep. After this batch, 20/105
-- aggregates carry the on-row actor columns.
--
-- - OvertimePolicy already has `setByPersonId` (business actor).
--   The canonical pair brings it into uniform shape for join-by-actor
--   queries.
-- - PlatformSetting has a legacy `updatedBy String?` column (free-form
--   text). The canonical UUID-FK pair adds proper foreign-key linkage
--   for who created and who last updated the setting.
--
-- All columns nullable + FK SET NULL → existing rows + writers
-- continue unchanged.
--
-- Reversible: rollback drops all 4 columns + 4 FKs + 4 indexes.

-- ─── OvertimePolicy ───
ALTER TABLE "overtime_policies"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "overtime_policies"
  ADD CONSTRAINT "overtime_policies_createdByPersonId_fkey"
    FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "overtime_policies"
  ADD CONSTRAINT "overtime_policies_updatedByPersonId_fkey"
    FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "overtime_policies_createdByPersonId_idx"
  ON "overtime_policies" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "overtime_policies_updatedByPersonId_idx"
  ON "overtime_policies" ("updatedByPersonId");

-- ─── PlatformSetting ───
ALTER TABLE "platform_settings"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "platform_settings"
  ADD CONSTRAINT "platform_settings_createdByPersonId_fkey"
    FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "platform_settings"
  ADD CONSTRAINT "platform_settings_updatedByPersonId_fkey"
    FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "platform_settings_createdByPersonId_idx"
  ON "platform_settings" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "platform_settings_updatedByPersonId_idx"
  ON "platform_settings" ("updatedByPersonId");
