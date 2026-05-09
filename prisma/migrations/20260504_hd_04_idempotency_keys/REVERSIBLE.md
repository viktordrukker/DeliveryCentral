# HD-0.4 — Idempotency key store

## Forward
Adds the `IdempotencyKeyStatus` enum and the `idempotency_keys` table with a unique index on `(idempotency_key, method, path, actor_id)` plus a btree on `expires_at` for the eventual sweep job. Idempotent: every DDL uses `IF NOT EXISTS` (table/indexes) or a `pg_type` existence check (enum).

## Backward
`rollback.sql` drops the indexes, table, and enum in reverse order. Safe at any time — no other model references the table.

## Reversibility test
- Apply forward → migration.sql succeeds.
- Apply forward again → no-op.
- Apply backward → rollback.sql succeeds.
- Apply backward again → no-op (everything already gone).
