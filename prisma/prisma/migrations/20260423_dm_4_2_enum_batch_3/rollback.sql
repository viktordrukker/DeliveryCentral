ALTER TABLE "person_cost_rates"
  ALTER COLUMN "rateType" DROP DEFAULT;
ALTER TABLE "person_cost_rates"
  ALTER COLUMN "rateType" TYPE text USING "rateType"::text;
ALTER TABLE "person_cost_rates"
  ALTER COLUMN "rateType" SET DEFAULT 'INTERNAL';
DROP TYPE IF EXISTS "PersonCostRateType";
