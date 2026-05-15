# F-10.3 / D-103 + F-10.4 / D-104 — actor audit + temporal columns first batch

## Forward

**D-103:** Add `createdByPersonId` + `updatedByPersonId` (nullable, FK → `persons.id`, `ON DELETE SET NULL`) to `Project` and `ProjectAssignment`. Both columns NULL by default — existing rows + existing service writers continue unchanged. Service-layer adoption follows in F-16.18 (per the closure roadmap).

**D-104:** Add `createdAt` + `updatedAt` (NOT NULL, DEFAULT NOW()) to `person_release_approvals` and `staffing_request_fulfilments`. Existing rows get backfilled with the migration apply time. The legacy `decidedAt` / `fulfilledAt` columns remain as the business-time authoritative timestamps.

## Backward

`rollback.sql` drops all added FKs, indexes, and columns. Idempotent. After rollback, any new-writer code paths populating the dropped columns will need a defensive null-check or be redeployed.

## Reversibility test

- Apply forward → `\d Project` / `\d ProjectAssignment` show the 4 new columns + indexes; `\d person_release_approvals` / `\d staffing_request_fulfilments` show `createdAt` + `updatedAt`.
- Apply backward → all 12 schema additions disappear.
- Forward again → idempotent (every `ALTER TABLE` uses `IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`).
- Backward again → idempotent (every `DROP` uses `IF EXISTS`).
