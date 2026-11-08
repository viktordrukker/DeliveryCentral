# REVERSIBLE — 20260607_publicid_foundation

## Forward
Adds a nullable `publicId VARCHAR(32)` column + a unique index to each of 5
aggregate-root tables: `Person`, `Project`, `OrgUnit`, `clients`, `CaseRecord`.
Each row is backfilled deterministically from its existing `id` UUID (per-aggregate
prefix `usr_`/`prj_`/`org_`/`cli_`/`case_` plus the first 12 hex characters of the
canonical UUID). Pre-existing rows therefore receive a stable publicId without
any data migration; new rows go through the Prisma `publicId` middleware which
generates a Sqid-based publicId via `PublicIdService`.

Idempotent via `IF NOT EXISTS` on `ADD COLUMN`, `UPDATE ... WHERE publicId IS NULL`,
and `CREATE UNIQUE INDEX IF NOT EXISTS`.

## Backward
`rollback.sql` drops the unique index and the column on each of the 5 tables.
Safe at any time — the canonical `id` UUID is the authoritative identifier on
every aggregate; publicId is a derived display id only.

## Reversibility test
- Apply forward → migration.sql succeeds (column + backfill + unique index).
- Apply forward again → no-op (idempotent).
- Apply backward → rollback.sql succeeds (column + index gone).
- Apply backward again → no-op.

ProjectPosition + LeaveRequest already carry publicId from prior expand
migrations and are not touched here.
