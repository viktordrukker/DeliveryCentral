# Enum Evolution Playbook — DM-R-6

**Status:** Active. Binding on every schema change that renames, drops, or
replaces an enum value.

## The problem (2026-04-18 postmortem)

A single migration renamed `AssignmentStatus` from 5 values to 9 canonical
values in one shot:

- Dropped old values (`ASSIGNED_LEGACY`, `PLANNED`, etc.)
- Added new values (`BOOKED`, `ONBOARDING`, `ON_HOLD`, …)
- Re-mapped column data in the same transaction

The result when a concurrent agent reverted the schema file but left the
migration applied: split-brain between DB (new enum) and code (old enum).
All dashboards dead for ~45 minutes. Runtime error example:

```
Invalid `this.gateway.findMany()` invocation:
Value 'ASSIGNED' not found in enum 'AssignmentStatus'
```

The root cause was not the rename — it was that the rename was not split
across releases. Any code path still compiled against the old enum shape
exploded the moment the DB was ahead.

## Rule

**Never** add and drop enum values in the same migration. **Always** split
enum renames into a **4-migration pattern**:

| # | Migration | Prisma client | Application code | DB enum |
|---|---|---|---|---|
| 1 | **Add new values** | Has OLD ∪ NEW | Still writes OLD | OLD ∪ NEW |
| 2 | **Dual-write** | Writes BOTH values at edit sites | Reads BOTH | OLD ∪ NEW |
| 3 | **Backfill** | Rewrites all historical OLD rows to NEW via data migration | Reads NEW only | OLD ∪ NEW |
| 4 | **Drop old values** | Client uses NEW only | Code uses NEW only | NEW |

Between migrations #1 and #4 the DB has BOTH shapes, so **any running
binary is always compatible with the DB**. This is what kept 2026-04-18
from being possible under the new rule.

## Mechanics in Postgres + Prisma

### Migration #1 — additive (REVERSIBLE)

Postgres `ALTER TYPE … ADD VALUE` is safe but cannot run inside a
transaction. Use a separate migration file per added value:

```sql
-- migration.sql
ALTER TYPE "AssignmentStatus" ADD VALUE IF NOT EXISTS 'BOOKED';
ALTER TYPE "AssignmentStatus" ADD VALUE IF NOT EXISTS 'ONBOARDING';
-- …
```

Rollback is trivial only because we haven't written any rows with the new
values yet — so a rollback deletes them. But Postgres cannot drop an enum
value directly. We document rollback as: `ALTER COLUMN … TYPE text; DROP
TYPE; recreate; CAST back.` In practice the rollback path is "restore from
snapshot" (DM-R-3) — so this migration is REVERSIBLE only before any
writes have used the new values.

### Migration #2 — dual-write (FORWARD_ONLY at the code level)

Application code is updated so every write site that could produce an OLD
value also produces the equivalent NEW value. Reads tolerate either. No DB
change; only a release of the backend that ships the dual-write
translator.

### Migration #3 — backfill (REVERSIBLE)

A data-only migration (no DDL) rewrites every column using OLD to NEW:

```sql
UPDATE "ProjectAssignment" SET status = 'BOOKED' WHERE status = 'ASSIGNED_LEGACY';
```

This is reversible — the inverse UPDATE restores OLD. Writing
`rollback.sql` here is safe and should be committed (per DM-R-4).

### Migration #4 — drop old (FORWARD_ONLY)

Postgres cannot drop an enum value in place. The canonical dance:

```sql
-- 1. rename old type out of the way
ALTER TYPE "AssignmentStatus" RENAME TO "AssignmentStatus_old";

-- 2. create new type with ONLY new values
CREATE TYPE "AssignmentStatus" AS ENUM (
  'CREATED', 'PROPOSED', 'REJECTED', 'BOOKED',
  'ONBOARDING', 'ASSIGNED', 'ON_HOLD', 'COMPLETED', 'CANCELLED'
);

-- 3. flip every column
ALTER TABLE "ProjectAssignment"
  ALTER COLUMN status TYPE "AssignmentStatus"
  USING status::text::"AssignmentStatus";

-- 4. drop the old type
DROP TYPE "AssignmentStatus_old";
```

This step is FORWARD_ONLY — rollback requires snapshot restore.

## Lint enforcement — `enum-single-step-rename`

`scripts/check-schema-conventions.cjs` rejects any migration whose
`migration.sql` contains BOTH of the following in the same file:

1. A statement that adds enum values (`ALTER TYPE … ADD VALUE`, or a
   `CREATE TYPE` that enumerates values alongside a pre-existing type of
   the same name).
2. A statement that removes enum values (`ALTER TYPE … RENAME TO …_old`,
   or a hand-rolled drop/recreate of the same type).

Triggering both in one file means the migration failed the 4-step split.

### Bypass (emergency only)

Prepend the migration file with:

```sql
-- ALLOW_SINGLE_STEP_ENUM: <one-line justification, signed by two reviewers>
```

CI permits the migration but the `FORWARD_ONLY.md` marker MUST cite the
override, and two `Approved-By:` trailers are required on the merge commit
(once DM-R-29 lands).

## Checklist for authors

- [ ] Is this enum rename split across ≥ 2 migrations? (1 additive + 1 drop)
- [ ] Do reads in application code handle BOTH old and new values while
      migrations #1–#3 are rolling?
- [ ] Does the backfill (migration #3) carry a committed `rollback.sql`?
- [ ] Does the drop (migration #4) carry `FORWARD_ONLY.md` with a pointer
      to the snapshot flow?
- [ ] Is the renamed enum's value used in any Prisma DTO that is
      serialized to the browser? If yes, the frontend release window must
      cover both shapes too — plan a frontend deploy at migration #2.

## References

- [docs/planning/data-model-decisions.md](data-model-decisions.md) — DMD-026 (enum evolution decision)
- [docs/planning/dm-r-plan.md](dm-r-plan.md) — DM-R resilience plan
- [scripts/check-schema-conventions.cjs](../../scripts/check-schema-conventions.cjs) — lint source
