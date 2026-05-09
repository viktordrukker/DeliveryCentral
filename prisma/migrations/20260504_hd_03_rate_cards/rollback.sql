-- HD-3 rollback — drops rate cards + assignment columns.

ALTER TABLE "ProjectAssignment"
  DROP CONSTRAINT IF EXISTS "ProjectAssignment_appliedRateCardEntryId_fkey";

ALTER TABLE "ProjectAssignment"
  DROP COLUMN IF EXISTS "appliedRateCardEntryId",
  DROP COLUMN IF EXISTS "effectiveBillRate",
  DROP COLUMN IF EXISTS "effectiveBillCurrency";

DROP INDEX IF EXISTS "rate_card_entries_rateCardId_isActive_idx";
DROP INDEX IF EXISTS "rate_card_entries_rateCardId_staffingRole_grade_key";
DROP TABLE IF EXISTS "rate_card_entries";

DROP INDEX IF EXISTS "rate_cards_tenantId_idx";
DROP INDEX IF EXISTS "rate_cards_clientId_isActive_idx";
DROP TABLE IF EXISTS "rate_cards";
