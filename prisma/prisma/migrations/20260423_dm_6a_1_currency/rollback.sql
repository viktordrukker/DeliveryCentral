-- DM-6a-1 rollback — drop currency infrastructure.

-- Drop FKs + columns.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_budgets_currencyCode_fkey') THEN
    ALTER TABLE "project_budgets" DROP CONSTRAINT "project_budgets_currencyCode_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'person_cost_rates_currencyCode_fkey') THEN
    ALTER TABLE "person_cost_rates" DROP CONSTRAINT "person_cost_rates_currencyCode_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_vendor_engagements_currencyCode_fkey') THEN
    ALTER TABLE "project_vendor_engagements" DROP CONSTRAINT "project_vendor_engagements_currencyCode_fkey";
  END IF;
END
$$;

DROP INDEX IF EXISTS "project_budgets_currencyCode_idx";
DROP INDEX IF EXISTS "person_cost_rates_currencyCode_idx";
DROP INDEX IF EXISTS "project_vendor_engagements_currencyCode_idx";

ALTER TABLE "project_vendor_engagements" DROP COLUMN IF EXISTS "currencyCode";
ALTER TABLE "person_cost_rates"          DROP COLUMN IF EXISTS "currencyCode";
ALTER TABLE "project_budgets"              DROP COLUMN IF EXISTS "currencyCode";

DROP TABLE IF EXISTS "Currency";
