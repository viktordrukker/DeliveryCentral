-- DM-4-2 batch 3 — promote `PersonCostRate.rateType` to enum.
--
-- Only `INTERNAL` exists in dev + seed data; future CONTRACTOR /
-- VENDOR / PLACEMENT labels will be added via `ADD VALUE IF NOT
-- EXISTS` in a follow-up migration when product defines the business
-- model. This migration constrains the current surface — no random
-- strings past this point.
--
-- Classification: REVERSIBLE.

CREATE TYPE "PersonCostRateType" AS ENUM ('INTERNAL');

ALTER TABLE "person_cost_rates"
  ALTER COLUMN "rateType" DROP DEFAULT;

ALTER TABLE "person_cost_rates"
  ALTER COLUMN "rateType" TYPE "PersonCostRateType"
  USING "rateType"::"PersonCostRateType";

ALTER TABLE "person_cost_rates"
  ALTER COLUMN "rateType" SET DEFAULT 'INTERNAL'::"PersonCostRateType";
