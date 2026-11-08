-- F-42 / D-103 + DM-5-5 round 11 — actor-audit columns on Client + Vendor.
--
-- Continues the round-by-round sweep. After this batch, 22/105
-- aggregates carry the on-row actor columns.
--
-- Both are sales/finance-curated aggregates:
-- - Client has `accountManagerPersonId` (business actor) but no
--   row-author. The new columns capture who created the client row
--   and who last edited it.
-- - Vendor had no actor at all (admin-curated).
--
-- All columns nullable + FK SET NULL → existing rows + writers
-- continue unchanged. Reversible: rollback drops all 4 columns +
-- 4 FKs + 4 indexes.

-- ─── Client ───
ALTER TABLE "clients"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "clients"
  ADD CONSTRAINT "clients_createdByPersonId_fkey"
    FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "clients"
  ADD CONSTRAINT "clients_updatedByPersonId_fkey"
    FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "clients_createdByPersonId_idx"
  ON "clients" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "clients_updatedByPersonId_idx"
  ON "clients" ("updatedByPersonId");

-- ─── Vendor ───
ALTER TABLE "vendors"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "vendors"
  ADD CONSTRAINT "vendors_createdByPersonId_fkey"
    FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "vendors"
  ADD CONSTRAINT "vendors_updatedByPersonId_fkey"
    FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "vendors_createdByPersonId_idx"
  ON "vendors" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "vendors_updatedByPersonId_idx"
  ON "vendors" ("updatedByPersonId");
