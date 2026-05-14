# F-5.7 / D-111 — AuditLog CHECK constraints

## Forward
Adds eight CHECK constraints to `AuditLog` that prevent malformed rows entering the hash chain:

| Constraint | Predicate |
|---|---|
| `AuditLog_eventName_nonempty_check` | `length(eventName) > 0` |
| `AuditLog_eventName_maxlen_check` | `length(eventName) <= 256` |
| `AuditLog_payload_is_object_check` | `jsonb_typeof(payload) = 'object'` |
| `AuditLog_createdAt_not_future_check` | `createdAt <= now() + interval '1 hour'` |
| `AuditLog_correlationId_maxlen_check` | `correlationId IS NULL OR length(...) <= 256` |
| `AuditLog_prevHash_shape_check` | `prevHash IS NULL OR ~ '^[0-9a-f]{64}$'` |
| `AuditLog_rowHash_shape_check` | `rowHash IS NULL OR ~ '^[0-9a-f]{64}$'` |
| `AuditLog_chainSeq_positive_check` | `chainSeq > 0` |

Each `ADD CONSTRAINT` is wrapped in `DO $$ … duplicate_object` so the migration is idempotent. Existing rows are validated by Postgres at constraint-add time (no `NOT VALID` clause); if any existing row violates a predicate the migration will fail and that row needs to be investigated before re-running.

## Backward
`rollback.sql` drops each constraint with `DROP CONSTRAINT IF EXISTS`. Safe to apply at any time — dropping a CHECK constraint never invalidates row data, and no application code depends on the constraints existing.

## Reversibility test
- Apply forward → migration.sql succeeds (8 constraints added).
- Apply forward again → no-op (idempotent via duplicate_object catch).
- Apply backward → rollback.sql succeeds (constraints gone).
- Apply backward again → no-op (DROP IF EXISTS).

## Why DM-R-4 classifies REVERSIBLE
CHECK constraints are pure metadata. No data is destroyed by adding or dropping them. The hash chain integrity (DM-R-22) is unaffected — the constraints validate row shape on INSERT, never modify rowHash/prevHash.
