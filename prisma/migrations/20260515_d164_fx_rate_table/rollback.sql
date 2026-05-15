-- F-7.4 rollback — drop the fx_rates table.
DROP INDEX IF EXISTS "fx_rates_toCurrency_idx";
DROP INDEX IF EXISTS "fx_rates_fromCurrency_toCurrency_asOf_idx";
DROP INDEX IF EXISTS "fx_rates_fromCurrency_toCurrency_asOf_key";
DROP TABLE IF EXISTS "fx_rates";
