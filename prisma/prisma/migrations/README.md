# Migrations

Every migration is authored and run as `prisma migrate deploy`. CI gates
enforce two invariants:

1. **`Schema drift check (DM-R-2)`** (`.github/workflows/ci.yml`) — spins
   an ephemeral Postgres, runs `prisma migrate deploy` from empty, then
   asserts `prisma migrate diff` between `schema.prisma` and the live DB
   is clean. This catches any migration that would not reproduce the
   committed schema on a fresh DB.

2. **`migrations:check`** (`scripts/check-migrations.cjs`) — DM-R-4 every
   migration directory ships with `migration.sql` + `rollback.sql` +
   `REVERSIBLE.md` (or `FORWARD_ONLY.md` for the rare cases where rolling
   back is impossible).

## DM-R-11 — orphan recovery (closed 2026-05-01)

The original DM-R-11 catalogue listed 6 tables and 4 enums that existed
in every live DB but had no `CREATE` in any committed migration, plus
two out-of-order references. `prisma migrate deploy` against a fresh
Postgres failed at the first migration that ALTERed an orphan.

The closure migration is `20260330_dm_r_11_orphan_recovery/`. It:

* Idempotently creates the 4 enums (`RagRating`, `RolePlanSource`,
  `VendorContractType`, `VendorEngagementStatus`, plus `ChangeRequest*`
  and `ThresholdDirection` discovered during validation).
* Idempotently creates 6 orphan tables (`EmployeeActivityEvent`,
  `clients`, `vendors`, `project_rag_snapshots`, `project_role_plans`,
  `project_vendor_engagements`) plus 3 out-of-order reference tables
  (`project_change_requests`, `project_radiator_overrides`,
  `radiator_threshold_configs`) and the `Tenant` table.
* Idempotently adds the orphan columns on `Person` (`grade`, `role`,
  `skillsets`, `location`, `timezone`) and `Project` (`clientId`,
  `deliveryManagerId`, `engagementModel`, `priority`, `domain`,
  `techStack`, `tags`, `outcomeRating`, `lessonsLearned`,
  `wouldStaffSameWay`).

A handful of pre-existing migrations were edited so they too are
idempotent on re-run (DM-R-11 markers in the comments):

* `20260418_project_radiator_v1` — `CREATE TABLE` and `CREATE TYPE`
  statements wrapped with `IF NOT EXISTS` / `DO duplicate_object` so the
  recovery's earlier creates don't collide.
* `20260418_dm_r_20_role_separation` — `GRANT CONNECT` uses
  `current_database()` and the `REVOKE` block guards on table
  existence, so the migration runs against any DB name and any state.
* `20260423_dm_8_4_postgres_roles` — same `current_database()` lift.
* `20260423_dm_7_6_aggregate_type_enum` — drops + recreates the
  `employee_activity_view` so the column-type alteration succeeds.
* `20260423_dm_7_5_tenant_foundation` — renamed to
  `20260423_dm_7_5_0_tenant_foundation` so it sorts BEFORE its 4 sibling
  `dm_7_5_*` migrations that depend on `tenantId` columns. The UPDATE
  loop now skips honeypot canary rows so re-applying is safe under the
  DM-R-31c trigger.

The companion follow-up migration `20260424_dm_r_11_rls_policies_install`
(removed during validation since `dm_7_5_5_rls_policies` runs cleanly
once tenant_foundation sorts first) is no longer present.

### Refreshing the baseline

`prisma/migrations/.baseline-schema.sql` is now informational — the
canonical correctness gate is the CI ephemeral migrate. Refresh after
intentional schema changes:

```bash
./scripts/refresh-baseline-schema.sh
```

and commit the new baseline alongside the migration that produced it.

## Operational notes

* **Production / staging seeding flow** uses `ops/bootstrap-app.sh` →
  `apply_baseline` (restores `.baseline-schema.sql`) → `mark_migrations_applied`
  (records every folder name in `_prisma_migrations` without re-running
  the SQL). After this script runs once, `prisma migrate deploy` only
  applies migrations newer than the baseline.
* **Re-seeding scenarios** uses the workflows
  `.github/workflows/staging-seed.yml` and
  `.github/workflows/prod-seed.yml`. See `CLAUDE.md` § 10 for the
  one-liner per environment.
