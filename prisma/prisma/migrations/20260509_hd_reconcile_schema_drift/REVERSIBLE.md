# REVERSIBLE

**Posture:** REVERSIBLE. Sibling `rollback.sql` restores the dropped
column-level DEFAULTs, drops the new FKs the forward step added, and
reverses the index rename.

## What this migration does

Reconciles drift between the HD-* migrations and `prisma/schema.prisma`.
After applying, `prisma migrate diff --from-migrations --to-schema-datamodel`
returns empty, so:

* `npm run migrations:check` (DM-R-2 schema drift gate) is green.
* The wizard's preflight branch detector reports `MIGRATIONS_OK`.
* `prisma migrate deploy` from a backup is byte-deterministic against
  the committed schema.

## Why drift exists

The HD migrations (20260503_hd_02 through 20260504_hd_10) created the
new tables with explicit `gen_random_uuid()` defaults and FK constraints
baked into the `CREATE TABLE` statement. Prisma's introspect normalises
FKs out of the create block and into separate ALTER statements; it also
infers `@default(uuid())` as application-side. The migration text and
the schema.prisma representation diverge — both functionally correct, but
the diff lint can't tell.

This migration is the "reformatter": it issues exactly the operations
Prisma's diff would produce, so the next diff sees zero work to do.

## Idempotency

Every operation uses `IF EXISTS` / `IF NOT EXISTS` / `DO-EXCEPTION` wraps.
Re-running on a reconciled DB is a no-op — re-running on a
not-yet-reconciled DB applies the diff cleanly.

## Companion change

A separate set of FK constraints — `project_activation_approvals_requestedById_fkey`
and `_decidedById_fkey` — does NOT exist in the prior migrations. The
schema.prisma now declares `@relation` on `requestedBy` / `decidedBy`
(mirroring `BudgetApproval`), so this migration also adds the SQL
constraints to keep the DB in sync. They are DEFERRABLE-equivalent
RESTRICT FKs, matching the pattern on every other Person reference.
