# FORWARD_ONLY

**Posture:** This migration is **FORWARD_ONLY**. The drops below
remove rows / metadata that the application no longer references.
Reversing them would mean reconstructing tables and FK constraints
that have no live consumers, while losing whatever audit metadata
the dead structures still carry. If the migration turns out to be
a mistake, recovery goes through a pre-migration snapshot, not
through automated reversal. Per DM-R-4: a clean rollback.sql that
silently loses audit data is worse than none.

## What this migration does

Reconciles `prisma/schema.prisma` against the cumulative result of
applying every prior migration. The drift accumulated during the
DM-R sweep (DM-7 multi-tenant scaffolding, DM-R-22 timestamptz
rebuild, DM-R-31 honeypot canaries, DM-8 dictionary tables) without
a closing reconciliation pass; this is that pass.

### Truly dead drops (this migration's destructive scope)

- `DROP TABLE "Notification"` — superseded by `InAppNotification`
  + the `NotificationDelivery` / `NotificationRequest` /
  `NotificationTemplate` triplet. Last writer was retired in
  DM-7. Zero references in `src/`, `frontend/src/`, `test/`.
- `DROP TABLE "grades"`, `"job_roles"`, `"locations"`,
  `"project_domains"`, `"project_types"` — DM-7 dictionary
  tables. Person and Project had FK columns to them; both sets
  of FKs are also dropped here. No app code reads from these
  dictionaries (they were prep work for a metadata-driven
  taxonomy that landed elsewhere).
- `ALTER TABLE "Person" DROP COLUMN "gradeId"`, `"jobRoleId"`,
  `"locationId"` — orphan FK columns from above.
- `ALTER TABLE "Project" DROP COLUMN "domainId"`,
  `"projectTypeId"` — same.
- `DROP TYPE "NotificationChannelKind"`, `"NotificationStatus"`
  — only the dropped `Notification` table referenced them.

### Schema housekeeping (non-destructive of business logic)

- 16 FK constraints re-stated to align ON DELETE behaviour with
  schema's current declarations (was `Cascade`, now `Restrict`
  on audit-trail relations per the audit-remediation sweep).
- 22 stale unique indexes on `id_new` columns dropped — DM-R-22
  rebuild left them behind. The columns themselves are promoted
  to `NOT NULL` in the same migration (`gen_random_uuid()`
  default has populated every row).
- 14 columns aligned to `timestamptz(3)` (DM-R-22 follow-on).
- 8 `id` columns drop their `gen_random_uuid()` DB default;
  Prisma generates UUIDs client-side via `@default(uuid())`.
- 7 single-column `@unique` constraints added for caseNumber,
  code, personNumber, primaryEmail, projectCode, assignmentCode,
  skill name. The previous composite `(tenantId, X)` unique is
  dropped; tenantId is NULL across the board (tenant middleware
  not yet wired), so the single-column unique is functionally
  identical and matches schema.prisma's column-level `@unique`.
- 3 GIN trigram indexes (`Person_displayName_trgm_idx`,
  `Project_name_trgm_idx`, `project_risks_title_trgm_idx`)
  preserved by re-declaring them in `prisma/schema.prisma`.

### What is **kept** (preserved by re-declaring in schema)

- `Tenant` table (raw-SQL writes from setup wizard).
- `DomainEvent` partitioned table + hash-chain trigger.
- `capacity_audit`, `ddl_audit`, `migration_audit` (event
  trigger / DDL audit infrastructure, hash-chained).
- `honeypot`, `honeypot_alerts` (DM-R-31 tamper tripwires).
- `tenantId` columns on 14 tables (used by RLS policies; the
  `dm_r_current_tenant()` USING clause depends on column
  existence even though the value is currently always NULL).
- `AuditLog.chainSeq / prevHash / rowHash / tenantId /
  aggregateType` (DM-R-22 hash chain + DM-7 tenant scope).

## How to restore after a bad deploy

```bash
# 1) Before the migration (required by scripts/db-migrate-safe.sh):
./scripts/db-snapshot.sh pre-migrate

# 2) Run the migration via the safe wrapper:
./scripts/db-migrate-safe.sh deploy

# 3) If it turns out bad, restore the snapshot:
./scripts/db-restore.sh .snapshots/<timestamp>.pre-migrate-deploy.dump
```

## Why this isn't reversible

- `DROP TABLE Notification` deletes notification rows. Any
  delivery records attached via `NotificationDelivery` are
  orphaned (already orphaned in practice — no writer for years).
- `DROP TABLE grades / job_roles / locations / project_domains /
  project_types` deletes dictionary metadata that may still be
  populated on long-lived staging/prod databases.
- `DROP COLUMN Person.gradeId / jobRoleId / locationId` and
  `Project.domainId / projectTypeId` lose the FK linkage rows.
  Reconstructing them requires the dropped tables + a back-fill
  pass; both unrecoverable from the schema alone.
