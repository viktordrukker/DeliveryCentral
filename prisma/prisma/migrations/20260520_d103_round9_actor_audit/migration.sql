-- F-38 / D-103 + DM-5-5 round 9 — actor-audit columns on
-- NotificationTemplate and ResponsibilityRule.
--
-- Continues the round-by-round sweep. After this batch, 18/105
-- aggregates carry the on-row actor columns.
--
-- Both are admin-curated configuration aggregates with no current
-- actor info:
-- - NotificationTemplate — `isSystemManaged` distinguishes baseline
--   templates from tenant overrides, but neither path tracks who
--   created/edited the row.
-- - ResponsibilityRule — RBAC overrides, currently no actor info
--   beyond `targetPersonId` (which is the rule's target, not its
--   author).
--
-- All columns nullable + FK SET NULL → existing rows + writers
-- continue unchanged.
--
-- Reversible: rollback drops all 4 columns + 4 FKs + 4 indexes.

-- ─── NotificationTemplate ───
ALTER TABLE "NotificationTemplate"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "NotificationTemplate"
  ADD CONSTRAINT "NotificationTemplate_createdByPersonId_fkey"
    FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "NotificationTemplate"
  ADD CONSTRAINT "NotificationTemplate_updatedByPersonId_fkey"
    FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "NotificationTemplate_createdByPersonId_idx"
  ON "NotificationTemplate" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "NotificationTemplate_updatedByPersonId_idx"
  ON "NotificationTemplate" ("updatedByPersonId");

-- ─── ResponsibilityRule ───
ALTER TABLE "responsibility_rules"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "responsibility_rules"
  ADD CONSTRAINT "responsibility_rules_createdByPersonId_fkey"
    FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "responsibility_rules"
  ADD CONSTRAINT "responsibility_rules_updatedByPersonId_fkey"
    FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "responsibility_rules_createdByPersonId_idx"
  ON "responsibility_rules" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "responsibility_rules_updatedByPersonId_idx"
  ON "responsibility_rules" ("updatedByPersonId");
