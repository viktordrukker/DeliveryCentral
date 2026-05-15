-- F-7.4 / D-164 — multi-currency consolidation table.
--
-- Forward: create `fx_rates` with unique on (from, to, asOf) and a
-- desc-on-asOf index for fast "latest rate" lookups.
-- Rollback: drop the table.

CREATE TABLE IF NOT EXISTS "fx_rates" (
  "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
  "fromCurrency"  VARCHAR(3) NOT NULL,
  "toCurrency"    VARCHAR(3) NOT NULL,
  "rate"          DECIMAL(18, 8) NOT NULL,
  "asOf"          DATE NOT NULL,
  "source"        TEXT,
  "createdAt"     TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT "fx_rates_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "fx_rates" ADD CONSTRAINT "fx_rates_from_fkey"
    FOREIGN KEY ("fromCurrency") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "fx_rates" ADD CONSTRAINT "fx_rates_to_fkey"
    FOREIGN KEY ("toCurrency") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "fx_rates_from_to_asof_unique"
  ON "fx_rates" ("fromCurrency", "toCurrency", "asOf");

CREATE INDEX IF NOT EXISTS "fx_rates_lookup_idx"
  ON "fx_rates" ("fromCurrency", "toCurrency", "asOf" DESC);

CREATE INDEX IF NOT EXISTS "fx_rates_to_currency_idx"
  ON "fx_rates" ("toCurrency");
