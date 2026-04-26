-- DM-6a-1 — introduce `Currency` (ISO 4217) + `currencyCode` on every
-- monetary-bearing table.
--
-- Before this migration, every Decimal money column was implicitly AUD
-- (dev tenant is Australia). After: every row carries its own currency
-- code; multi-tenant / multi-region work becomes possible without
-- schema change.
--
-- Tables gaining `currencyCode text` FK (nullable for now; flip NOT
-- NULL in the next release once backfill is confirmed everywhere):
--   ProjectBudget         (capexBudget, opexBudget)
--   person_cost_rates     (hourlyRate)
--   project_vendor_engagements (monthlyRate, blendedDayRate)
--
-- Backfill: every existing row gets `'AUD'`.
--
-- Classification: REVERSIBLE. Rollback drops the FK columns + the
-- Currency table; the monetary columns are unchanged.

-- ---------------------------------------------------- Currency table
CREATE TABLE IF NOT EXISTS "Currency" (
  code          varchar(3)  PRIMARY KEY,
  name          text        NOT NULL,
  "minorUnit"   int         NOT NULL DEFAULT 2,
  "isDefault"   boolean     NOT NULL DEFAULT false,
  "createdAt"   timestamptz NOT NULL DEFAULT NOW()
);

-- Seed: dev-default AUD + common business currencies. Extend as needed.
INSERT INTO "Currency" (code, name, "minorUnit", "isDefault") VALUES
  ('AUD', 'Australian Dollar', 2, true),
  ('USD', 'United States Dollar', 2, false),
  ('GBP', 'Pound Sterling', 2, false),
  ('EUR', 'Euro', 2, false),
  ('NZD', 'New Zealand Dollar', 2, false),
  ('SGD', 'Singapore Dollar', 2, false),
  ('JPY', 'Japanese Yen', 0, false)
ON CONFLICT (code) DO NOTHING;

-- ------------------------------------------- add nullable FKs + backfill
ALTER TABLE "project_budgets"            ADD COLUMN IF NOT EXISTS "currencyCode" varchar(3);
ALTER TABLE "person_cost_rates"        ADD COLUMN IF NOT EXISTS "currencyCode" varchar(3);
ALTER TABLE "project_vendor_engagements" ADD COLUMN IF NOT EXISTS "currencyCode" varchar(3);

-- Backfill every existing row to AUD.
UPDATE "project_budgets"             SET "currencyCode" = 'AUD' WHERE "currencyCode" IS NULL;
UPDATE "person_cost_rates"         SET "currencyCode" = 'AUD' WHERE "currencyCode" IS NULL;
UPDATE "project_vendor_engagements" SET "currencyCode" = 'AUD' WHERE "currencyCode" IS NULL;

-- Add FKs (NOT NULL flip is in DM-6a-1b once callers land).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_budgets_currencyCode_fkey') THEN
    ALTER TABLE "project_budgets"
      ADD CONSTRAINT "project_budgets_currencyCode_fkey"
      FOREIGN KEY ("currencyCode") REFERENCES "Currency"(code)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'person_cost_rates_currencyCode_fkey') THEN
    ALTER TABLE "person_cost_rates"
      ADD CONSTRAINT "person_cost_rates_currencyCode_fkey"
      FOREIGN KEY ("currencyCode") REFERENCES "Currency"(code)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_vendor_engagements_currencyCode_fkey') THEN
    ALTER TABLE "project_vendor_engagements"
      ADD CONSTRAINT "project_vendor_engagements_currencyCode_fkey"
      FOREIGN KEY ("currencyCode") REFERENCES "Currency"(code)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END
$$;

-- Index the FK columns for fast money-by-currency aggregation queries.
CREATE INDEX IF NOT EXISTS "project_budgets_currencyCode_idx" ON "project_budgets" ("currencyCode");
CREATE INDEX IF NOT EXISTS "person_cost_rates_currencyCode_idx" ON "person_cost_rates" ("currencyCode");
CREATE INDEX IF NOT EXISTS "project_vendor_engagements_currencyCode_idx" ON "project_vendor_engagements" ("currencyCode");
