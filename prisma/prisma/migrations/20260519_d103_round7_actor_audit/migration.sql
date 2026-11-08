-- F-34 / D-103 + DM-5-5 round 7 — actor-audit columns on
-- ResourcePool and Position.
--
-- Continues the F-10.3 + F-17 + F-26 + F-29 + F-30 + F-32 sweep.
-- After this batch, 14/105 high-audit aggregates carry the on-row
-- actor columns.
--
-- Both are org-structure aggregates that pair with OrgUnit (F-32):
-- - ResourcePool — RM-curated; no actor previously.
-- - Position — HR-curated; `occupantPersonId` captures the
--   person currently holding the position, not the row author.
--
-- All columns nullable + FK SET NULL → existing rows + writers
-- continue unchanged.
--
-- Reversible: rollback drops all 4 columns + 4 FKs + 4 indexes.

-- ─── ResourcePool ───
ALTER TABLE "ResourcePool"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "ResourcePool"
  ADD CONSTRAINT "ResourcePool_createdByPersonId_fkey"
    FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ResourcePool"
  ADD CONSTRAINT "ResourcePool_updatedByPersonId_fkey"
    FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "ResourcePool_createdByPersonId_idx"
  ON "ResourcePool" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "ResourcePool_updatedByPersonId_idx"
  ON "ResourcePool" ("updatedByPersonId");

-- ─── Position ───
ALTER TABLE "Position"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "Position"
  ADD CONSTRAINT "Position_createdByPersonId_fkey"
    FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Position"
  ADD CONSTRAINT "Position_updatedByPersonId_fkey"
    FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Position_createdByPersonId_idx"
  ON "Position" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "Position_updatedByPersonId_idx"
  ON "Position" ("updatedByPersonId");
