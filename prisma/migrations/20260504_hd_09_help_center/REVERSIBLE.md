# HD-9 — Help Center MVP (J11) — Chunk 1 schema

## Forward
Adds four tables — `help_articles`, `help_tips`, `help_feedback`,
`onboarding_tour_progress` — plus their unique constraints, FKs, and
read-path indexes. Idempotent: every DDL uses `IF NOT EXISTS` for
tables/indexes and `pg_constraint` existence checks for FKs and unique
constraints. Re-applying is a no-op.

## Backward
`rollback.sql` drops the indexes and tables in reverse dependency order
(progress + feedback + tip — all of which point at articles — then
articles). Safe at any time provided no other model has been added that
references these tables.

## Reversibility test
- Apply forward → tables + indexes appear.
- Apply forward again → no-op.
- Apply backward → cleanup succeeds.
- Apply backward again → no-op.
