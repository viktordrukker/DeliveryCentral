-- F-87 / D-103 round 36 — bundled createdByPersonId on 5 immutable-row aggregates
--
-- Bundle approach: each target is an immutable row (`createdAt` only, no
-- `updatedAt`). Adding only `createdByPersonId` + FK + index — the
-- canonical pair's `updatedByPersonId` doesn't apply since these rows
-- never update.
--
-- Aggregates (5):
--   person_cost_rates    — HR sets person hourly rate; "who entered the rate"
--   public_holidays      — admin curates per-region public holidays
--   Currency             — admin curates seed list (rare edits)
--   fx_rates             — integrations import FX; "which actor (or system) loaded"
--   vendor_skill_areas   — admin curates per-vendor skill registry
--
-- Mixed table mapping: snake_case except Currency.
--
-- (HelpFeedback was dropped from this bundle after validation revealed
-- it already carries `actorPersonId` — adding createdByPersonId would
-- duplicate the canonical actor semantic.)
--
-- REVERSIBLE: see rollback.sql.

-- person_cost_rates (PersonCostRate) ------------------------------------

ALTER TABLE "person_cost_rates"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID;

ALTER TABLE "person_cost_rates"
  ADD CONSTRAINT "person_cost_rates_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "person_cost_rates_createdByPersonId_idx"
  ON "person_cost_rates" ("createdByPersonId");

-- public_holidays (PublicHoliday) ---------------------------------------

ALTER TABLE "public_holidays"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID;

ALTER TABLE "public_holidays"
  ADD CONSTRAINT "public_holidays_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "public_holidays_createdByPersonId_idx"
  ON "public_holidays" ("createdByPersonId");

-- Currency --------------------------------------------------------------

ALTER TABLE "Currency"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID;

ALTER TABLE "Currency"
  ADD CONSTRAINT "Currency_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Currency_createdByPersonId_idx"
  ON "Currency" ("createdByPersonId");

-- fx_rates (FxRate) -----------------------------------------------------

ALTER TABLE "fx_rates"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID;

ALTER TABLE "fx_rates"
  ADD CONSTRAINT "fx_rates_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "fx_rates_createdByPersonId_idx"
  ON "fx_rates" ("createdByPersonId");

-- vendor_skill_areas (VendorSkillArea) ----------------------------------

ALTER TABLE "vendor_skill_areas"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID;

ALTER TABLE "vendor_skill_areas"
  ADD CONSTRAINT "vendor_skill_areas_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "vendor_skill_areas_createdByPersonId_idx"
  ON "vendor_skill_areas" ("createdByPersonId");
