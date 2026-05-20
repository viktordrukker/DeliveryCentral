-- F-52 / D-103 round 16 rollback — drop actor-audit columns + FKs + indexes
-- on RateCardEntry + LeaveBalance.
--
-- Pure DDL drops; no data loss beyond the two nullable audit columns (which
-- were empty for legacy rows anyway).

DROP INDEX IF EXISTS "leave_balances_updatedByPersonId_idx";
DROP INDEX IF EXISTS "leave_balances_createdByPersonId_idx";

ALTER TABLE "leave_balances"
  DROP CONSTRAINT IF EXISTS "leave_balances_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "leave_balances_createdByPersonId_fkey";

ALTER TABLE "leave_balances"
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";

DROP INDEX IF EXISTS "rate_card_entries_updatedByPersonId_idx";
DROP INDEX IF EXISTS "rate_card_entries_createdByPersonId_idx";

ALTER TABLE "rate_card_entries"
  DROP CONSTRAINT IF EXISTS "rate_card_entries_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "rate_card_entries_createdByPersonId_fkey";

ALTER TABLE "rate_card_entries"
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";
