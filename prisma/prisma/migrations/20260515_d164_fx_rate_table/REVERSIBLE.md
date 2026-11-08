# F-7.4 / D-164 — FxRate consolidation table

## Forward
Creates `fx_rates` with the (from, to, asOf, rate, source) columns required to back multi-currency consolidation. Decimal(18, 8) gives 8 fractional digits — high enough that multi-year aggregations don't accumulate rounding error.

- `@@unique([fromCurrency, toCurrency, asOf])` — at most one rate per (from, to) on any given day.
- `@@index([fromCurrency, toCurrency, asOf(sort: Desc)])` — fast "latest rate at or before T" lookup.
- FKs to `Currency.code` for both `fromCurrency` and `toCurrency` (RESTRICT on delete — can't drop a currency that has rates wired).

Gated by `flag.feature.financial.multiCurrency.enabled` (default OFF). The table exists in v1 so the schema is portable; the `FinancialService` only consults it when the flag is ON.

## Backward
`rollback.sql` drops the table and its indexes. No data dependency outside the table itself (FKs point INTO it, not the other way around).

## Reversibility test
- Apply forward → table appears with both indexes + FKs.
- Apply forward again → no-op (CREATE TABLE IF NOT EXISTS + duplicate_object guards).
- Apply backward → table gone.
- Apply backward again → no-op (DROP IF EXISTS).
