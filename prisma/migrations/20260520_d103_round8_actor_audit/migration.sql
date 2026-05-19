-- F-36 / D-103 + DM-5-5 round 8 — actor-audit columns on
-- ProjectBudget and RateCard.
--
-- Continues the round-by-round sweep. After this batch, 16/105
-- high-audit aggregates carry the on-row actor columns.
--
-- Both are financial-grade aggregates that benefit from on-row
-- audit trails:
-- - ProjectBudget had no actor columns at all (only `version` +
--   `updatedAt`). Joins with BudgetApproval (which has business
--   actors via requestedBy/decidedBy from F-30) for the full
--   approval-chain audit trail.
-- - RateCard had no actor columns. Admin-curated rate cards drive
--   margin math; on-row creator/editor tracking matters for finance.
--
-- All columns nullable + FK SET NULL → existing rows + writers
-- continue unchanged.
--
-- Reversible: rollback drops all 4 columns + 4 FKs + 4 indexes.

-- ─── ProjectBudget ───
ALTER TABLE "project_budgets"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "project_budgets"
  ADD CONSTRAINT "project_budgets_createdByPersonId_fkey"
    FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "project_budgets"
  ADD CONSTRAINT "project_budgets_updatedByPersonId_fkey"
    FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "project_budgets_createdByPersonId_idx"
  ON "project_budgets" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "project_budgets_updatedByPersonId_idx"
  ON "project_budgets" ("updatedByPersonId");

-- ─── RateCard ───
ALTER TABLE "rate_cards"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "rate_cards"
  ADD CONSTRAINT "rate_cards_createdByPersonId_fkey"
    FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "rate_cards"
  ADD CONSTRAINT "rate_cards_updatedByPersonId_fkey"
    FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "rate_cards_createdByPersonId_idx"
  ON "rate_cards" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "rate_cards_updatedByPersonId_idx"
  ON "rate_cards" ("updatedByPersonId");
