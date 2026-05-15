-- F-7.4 rollback — drop the fx_rates table.
DROP INDEX IF EXISTS "fx_rates_to_currency_idx";
DROP INDEX IF EXISTS "fx_rates_lookup_idx";
DROP INDEX IF EXISTS "fx_rates_from_to_asof_unique";
DROP TABLE IF EXISTS "fx_rates";
