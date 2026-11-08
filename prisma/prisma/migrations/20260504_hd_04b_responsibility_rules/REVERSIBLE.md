# HD-4 — ResponsibilityRule (J4)

## Forward
Adds three enums (`ResponsibilityActionKind` × 7, `ResponsibilityScope` × 7, `ResponsibilityResolutionMode` × 4) and the `responsibility_rules` table with a composite index on `(actionKind, scopeKind, isActive, priority)` for resolver lookups, plus btrees on `targetPersonId` and `tenantId`. Idempotent: every DDL uses `IF NOT EXISTS` (table/indexes) or a `pg_type` / `pg_constraint` existence check (enums, FKs).

## Backward
`rollback.sql` drops the indexes, table, and three enums in reverse order. Safe at any time — no other model depends on the table or types.

## Reversibility test
- Apply forward → enums + table appear.
- Apply forward again → no-op.
- Apply backward → cleanup succeeds.
- Apply backward again → no-op.
