-- HD-3 — RateCard + RateCardEntry + assignment-side bill-rate columns.
-- Per J2 the resolver walks 5 layers of precedence at BOOKED transition;
-- the assignment row stores the chosen entry id + the resolved hourly rate.

CREATE TABLE IF NOT EXISTS "rate_cards" (
  "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
  "name"          TEXT NOT NULL,
  "currencyCode"  VARCHAR(3) NOT NULL,
  "clientId"      UUID,
  "validFrom"     DATE NOT NULL,
  "validTo"       DATE,
  "isActive"      BOOLEAN NOT NULL DEFAULT TRUE,
  "notes"         TEXT,
  "tenantId"      UUID,
  "createdAt"     TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archivedAt"    TIMESTAMPTZ(3),
  CONSTRAINT "rate_cards_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rate_cards_currencyCode_fkey'
  ) THEN
    ALTER TABLE "rate_cards"
      ADD CONSTRAINT "rate_cards_currencyCode_fkey"
      FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code")
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rate_cards_clientId_fkey'
  ) THEN
    ALTER TABLE "rate_cards"
      ADD CONSTRAINT "rate_cards_clientId_fkey"
      FOREIGN KEY ("clientId") REFERENCES "clients"("id")
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rate_cards_tenantId_fkey'
  ) THEN
    ALTER TABLE "rate_cards"
      ADD CONSTRAINT "rate_cards_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS "rate_cards_clientId_isActive_idx"
  ON "rate_cards" ("clientId", "isActive");
CREATE INDEX IF NOT EXISTS "rate_cards_tenantId_idx"
  ON "rate_cards" ("tenantId");

CREATE TABLE IF NOT EXISTS "rate_card_entries" (
  "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
  "rateCardId"     UUID NOT NULL,
  "staffingRole"   TEXT NOT NULL,
  "grade"          TEXT NOT NULL,
  "requiredSkills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "hourlyRate"     DECIMAL(10, 2) NOT NULL,
  "notes"          TEXT,
  "isActive"       BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"      TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archivedAt"     TIMESTAMPTZ(3),
  CONSTRAINT "rate_card_entries_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rate_card_entries_rateCardId_fkey'
  ) THEN
    ALTER TABLE "rate_card_entries"
      ADD CONSTRAINT "rate_card_entries_rateCardId_fkey"
      FOREIGN KEY ("rateCardId") REFERENCES "rate_cards"("id")
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS "rate_card_entries_rateCardId_staffingRole_grade_key"
  ON "rate_card_entries" ("rateCardId", "staffingRole", "grade");

CREATE INDEX IF NOT EXISTS "rate_card_entries_rateCardId_isActive_idx"
  ON "rate_card_entries" ("rateCardId", "isActive");

-- Assignment-side bill-rate pinning columns.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ProjectAssignment'
      AND column_name='appliedRateCardEntryId'
  ) THEN
    ALTER TABLE "ProjectAssignment"
      ADD COLUMN "appliedRateCardEntryId" UUID,
      ADD COLUMN "effectiveBillRate" DECIMAL(10, 2),
      ADD COLUMN "effectiveBillCurrency" VARCHAR(3);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ProjectAssignment_appliedRateCardEntryId_fkey'
  ) THEN
    ALTER TABLE "ProjectAssignment"
      ADD CONSTRAINT "ProjectAssignment_appliedRateCardEntryId_fkey"
      FOREIGN KEY ("appliedRateCardEntryId") REFERENCES "rate_card_entries"("id")
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END$$;
