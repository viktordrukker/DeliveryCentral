-- Rollback for F-87 / D-103 round 36 — 5-aggregate createdByPersonId bundle

DROP INDEX IF EXISTS "vendor_skill_areas_createdByPersonId_idx";
DROP INDEX IF EXISTS "fx_rates_createdByPersonId_idx";
DROP INDEX IF EXISTS "Currency_createdByPersonId_idx";
DROP INDEX IF EXISTS "public_holidays_createdByPersonId_idx";
DROP INDEX IF EXISTS "person_cost_rates_createdByPersonId_idx";

ALTER TABLE "vendor_skill_areas"
  DROP CONSTRAINT IF EXISTS "vendor_skill_areas_createdByPersonId_fkey",
  DROP COLUMN IF EXISTS "createdByPersonId";

ALTER TABLE "fx_rates"
  DROP CONSTRAINT IF EXISTS "fx_rates_createdByPersonId_fkey",
  DROP COLUMN IF EXISTS "createdByPersonId";

ALTER TABLE "Currency"
  DROP CONSTRAINT IF EXISTS "Currency_createdByPersonId_fkey",
  DROP COLUMN IF EXISTS "createdByPersonId";

ALTER TABLE "public_holidays"
  DROP CONSTRAINT IF EXISTS "public_holidays_createdByPersonId_fkey",
  DROP COLUMN IF EXISTS "createdByPersonId";

ALTER TABLE "person_cost_rates"
  DROP CONSTRAINT IF EXISTS "person_cost_rates_createdByPersonId_fkey",
  DROP COLUMN IF EXISTS "createdByPersonId";
