-- F-52 / D-103 round 16 — actor-audit columns on RateCardEntry + LeaveBalance
--
-- Adds `createdByPersonId` + `updatedByPersonId` UUID columns + FK to Person
-- + covering indexes. Both columns nullable to keep legacy rows intact.
--
-- REVERSIBLE: see rollback.sql.

ALTER TABLE "rate_card_entries"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "rate_card_entries"
  ADD CONSTRAINT "rate_card_entries_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "rate_card_entries"
  ADD CONSTRAINT "rate_card_entries_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "rate_card_entries_createdByPersonId_idx"
  ON "rate_card_entries" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "rate_card_entries_updatedByPersonId_idx"
  ON "rate_card_entries" ("updatedByPersonId");

ALTER TABLE "leave_balances"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "leave_balances"
  ADD CONSTRAINT "leave_balances_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "leave_balances"
  ADD CONSTRAINT "leave_balances_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "leave_balances_createdByPersonId_idx"
  ON "leave_balances" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "leave_balances_updatedByPersonId_idx"
  ON "leave_balances" ("updatedByPersonId");
