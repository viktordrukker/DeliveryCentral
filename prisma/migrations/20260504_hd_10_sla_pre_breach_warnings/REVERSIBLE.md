# HD-10 — SLA pre-breach warning columns

## Forward
Adds `slaWarnedAt50pct` and `slaWarnedAt75pct` (TIMESTAMPTZ(3), nullable) to `ProjectAssignment`. Idempotent via `IF NOT EXISTS`. Both columns default NULL — existing rows continue to behave exactly like before until the sweep service is updated to populate them.

## Backward
`rollback.sql` drops both columns with `IF EXISTS`. Safe to apply at any time; no constraint or index pinpoints these columns. The application code degrades cleanly — Prisma returns `undefined` for missing fields and the sweep falls back to its pre-HD-10 behaviour (breach-only notifications).

## Reversibility test
- Apply forward → migration.sql succeeds (columns appear).
- Apply forward again → no-op (idempotent).
- Apply backward → rollback.sql succeeds (columns gone).
- Apply backward again → no-op.
