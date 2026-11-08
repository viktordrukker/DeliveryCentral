-- Rollback for 20260520_d103_round8_actor_audit. Idempotent.

DROP INDEX IF EXISTS "project_budgets_createdByPersonId_idx";
DROP INDEX IF EXISTS "project_budgets_updatedByPersonId_idx";
DROP INDEX IF EXISTS "rate_cards_createdByPersonId_idx";
DROP INDEX IF EXISTS "rate_cards_updatedByPersonId_idx";

ALTER TABLE "project_budgets"
  DROP CONSTRAINT IF EXISTS "project_budgets_createdByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "project_budgets_updatedByPersonId_fkey",
  DROP COLUMN IF EXISTS "createdByPersonId",
  DROP COLUMN IF EXISTS "updatedByPersonId";

ALTER TABLE "rate_cards"
  DROP CONSTRAINT IF EXISTS "rate_cards_createdByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "rate_cards_updatedByPersonId_fkey",
  DROP COLUMN IF EXISTS "createdByPersonId",
  DROP COLUMN IF EXISTS "updatedByPersonId";
