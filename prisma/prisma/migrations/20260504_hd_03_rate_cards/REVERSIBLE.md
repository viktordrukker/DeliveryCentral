# HD-3 — RateCard + RateCardEntry + assignment-side bill-rate columns

## Forward
Adds `rate_cards` (tenant- or client-scoped) and `rate_card_entries`
(role × grade × optional required skills → hourly rate). Adds three
columns to `ProjectAssignment`: `appliedRateCardEntryId` (FK to entry,
nullable), `effectiveBillRate` (Decimal(10,2), nullable), and
`effectiveBillCurrency` (VARCHAR(3), nullable).

Idempotency: every DDL uses `IF NOT EXISTS` (tables, indexes, columns)
or a `pg_constraint`/`information_schema.columns` existence check (FKs,
column adds). Re-applying the migration is a no-op.

## Backward
`rollback.sql` drops the assignment columns + FK, then the entries
table + indexes, then the cards table + indexes — in reverse
dependency order. Safe at any time provided no assignment row has a
non-null `appliedRateCardEntryId` (the FK is `ON DELETE SET NULL`, so
the column drop will succeed even with pinned rows).

## Reversibility test
- Apply forward → tables + columns appear.
- Apply forward again → no-op.
- Apply backward → tables + columns drop cleanly.
- Apply backward again → no-op.
