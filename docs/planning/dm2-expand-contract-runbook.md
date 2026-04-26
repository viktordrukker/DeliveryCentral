# DM-2 + DM-2.5 — Per-Table Expand-Contract Runbook

**Status:** v1.0 · 2026-04-18
**Goal:** normalise a table's TEXT primary key to `uuid` AND add the `publicId` security column in a single expand-contract cycle. Zero downtime; two-release contract.

The 12 affected tables are, in order of blast radius (ascending):
`skills` → `person_skills` → `pulse_entries` → `period_locks` → `person_cost_rates` → `project_budgets` → `in_app_notifications` → `leave_requests` → `staffing_request_fulfilments` → `staffing_requests` → `timesheet_entries` → `timesheet_weeks`.

Each table follows the same seven-step play. Run the steps for one table end-to-end before starting the next (except where dependencies force sequencing — `person_skills` waits for `skills`, `timesheet_entries` waits for `timesheet_weeks`, `staffing_request_fulfilments` waits for `staffing_requests`).

---

## Invariants (never broken, any step)

1. Old code path keeps working for the full duration of the expand-contract cycle.
2. `SET LOCAL lock_timeout = '3s'` at the top of every migration.
3. No `ALTER COLUMN ... TYPE` on a populated table. Ever.
4. No Prisma-Client type-signature change in the same release as the SQL that enables it — two-release contract.
5. Blue/green clone verified before each production step.
6. Every migration logs its own start/end to `AuditLog` (or `DomainEvent` once DM-7 lands).
7. Rollback SQL drafted and kept beside the migration for each step.

## Terminology

- **TABLE** — the Postgres relation name (`@@map` value), e.g. `skills`.
- **MODEL** — the Prisma model name, e.g. `Skill`.
- **AGG_PREFIX** — the DMD-026 entity prefix, e.g. `skl_`.
- **AGG_TYPE** — the `AggregateType` enum value, e.g. `SKILL`.

---

## Step 1 — Release N: Expand (additive, no cutover)

Landed as one Prisma migration + schema change. The Prisma Client signature does **not** change in release N because we only add columns; existing `id` stays TEXT.

### 1a. SQL migration `prisma/migrations/YYYYMMDDHHMM_dm2_expand_<table>/migration.sql`

```sql
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

-- Add shadow uuid PK column + publicId column. Both nullable during backfill.
ALTER TABLE "<TABLE>" ADD COLUMN IF NOT EXISTS "id_new"     uuid        DEFAULT gen_random_uuid();
ALTER TABLE "<TABLE>" ADD COLUMN IF NOT EXISTS "publicId"   varchar(32);

-- Backfill id_new for existing rows (idempotent). Small tables fit in one pass.
UPDATE "<TABLE>" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;

-- Backfill publicId deterministically from a per-tenant + row sequence. Until DM-7.5
-- lands, use a single platform tenant salt; the column is nullable during release N
-- and made NOT NULL after application code guarantees it populates new rows.
-- The generation helper lives in src/infrastructure/public-id/public-id.service.ts.
-- The migration itself only fills pre-existing rows. Example (Sqids alphabet abbreviated):
--   UPDATE "<TABLE>" SET "publicId" = '<AGG_PREFIX>' || sqids.encode(ARRAY[tenant_salt, row_number()::bigint])
--   WHERE "publicId" IS NULL;
-- For DM-2-pilot (skills) we invoke the backfill from a TS script because pl/pgsql sqids
-- would be an extra extension dependency; the script is idempotent and re-runnable.

-- Concurrent unique index on publicId; SHARE UPDATE EXCLUSIVE only, no write block.
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "<TABLE>_publicId_key" ON "<TABLE>" ("publicId");
-- And on id_new (will become the new PK later).
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "<TABLE>_id_new_key" ON "<TABLE>" ("id_new");

-- Dual-maintain: triggers keep id_new + publicId populated on every INSERT / UPDATE
-- that lands through the old code path during the transition window.
CREATE OR REPLACE FUNCTION "<TABLE>_dm2_dualmaintain"() RETURNS trigger AS $$
BEGIN
  IF NEW."id_new" IS NULL THEN
    NEW."id_new" := gen_random_uuid();
  END IF;
  IF NEW."publicId" IS NULL THEN
    -- Application layer is expected to populate this once the DM-2.5 Prisma extension
    -- is live; the trigger is a safety net only and writes a prefixed uuid segment.
    NEW."publicId" := '<AGG_PREFIX>' || substr(replace(NEW."id_new"::text, '-', ''), 1, 12);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "<TABLE>_dm2_dualmaintain" ON "<TABLE>";
CREATE TRIGGER "<TABLE>_dm2_dualmaintain"
BEFORE INSERT OR UPDATE ON "<TABLE>"
FOR EACH ROW EXECUTE FUNCTION "<TABLE>_dm2_dualmaintain"();

-- Audit trail.
INSERT INTO "AuditLog" ("id", "aggregateType", "aggregateId", "eventName", "payload", "createdAt")
VALUES (gen_random_uuid(), 'Migration', gen_random_uuid(), 'DM-2-Expand-<TABLE>',
  jsonb_build_object('migration', 'dm2_expand_<TABLE>', 'phase', 'expand'), NOW());
```

### 1b. Prisma schema update

Add `idNew` + `publicId` **without** changing `@id`. Old `id` stays TEXT PK.

```prisma
model <MODEL> {
  id       String  @id @default(uuid())
  idNew    String  @default(uuid()) @db.Uuid @map("id_new")  // shadow PK for DM-2
  publicId String? @unique @db.VarChar(32)                    // DM-2.5 public face
  // ... existing fields ...
}
```

The only behavioural change in release N is that every new row arrives with `idNew` and `publicId` populated. Existing services keep reading/writing `id`.

### 1c. Ops checklist for release N

- [ ] PITR snapshot before the migration.
- [ ] Apply on blue/green clone; traffic replay (last 24 h); assert p95 latency delta < 10 %.
- [ ] Assert every row has `id_new IS NOT NULL` and `publicId IS NOT NULL` after the backfill script runs.
- [ ] Staging rolling-deploy drill (50/50 old/new pods).
- [ ] Production migration in a low-traffic window.

---

## Step 2 — Release N+1: Switch Callers

Application code starts reading/writing `publicId` externally and using `idNew` internally. Old `id` is still live; we do not remove it.

### 2a. Prisma client extension (DM-2.5)

`src/infrastructure/public-id/public-id-prisma.extension.ts` — a Prisma `$extends` that populates `publicId` on every `create` / `createMany` using `PublicIdService.generate(aggregateType, tenantId)`. The trigger from step 1 becomes a safety net; application-owned generation takes over.

### 2b. Controllers

Every endpoint for this aggregate switches to `publicId`:
- Path params typed `@Param('xId', ParsePublicId(AggregateType.<AGG_TYPE>)) internalId: string`.
- Responses rewritten by the serializer so every `id` / `<foreign>Id` is the target entity's `publicId`.
- Backward-compat: controllers also accept UUIDs during this release via a feature flag, so frontends on the old release keep working.

### 2c. Frontend

- Routes: `/<resource>/:<resource>Id` where `:<resource>Id` is now a publicId.
- Link components: use the returned `publicId` field from the API.
- Test assertions updated to match `^<AGG_PREFIX>[A-Za-z0-9]{8,}$`.

### 2d. Ops checklist for release N+1

- [ ] Rolling deploy; both old and new pods hit the same DB — triggers keep them consistent.
- [ ] E2E + integration tests pass against the deployed blue/green stack.
- [ ] Monitoring: alerts on any `publicId IS NULL` seen in production reads.

---

## Step 3 — Release N+2: Contract (cutover + drop)

Old code path is gone. Time to flip the PK and drop the shadow.

### 3a. SQL migration `YYYYMMDDHHMM_dm2_contract_<table>/migration.sql`

```sql
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

-- Assertion: every row has id_new and publicId.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "<TABLE>" WHERE "id_new" IS NULL OR "publicId" IS NULL) THEN
    RAISE EXCEPTION 'DM-2 contract pre-check failed: found rows with NULL id_new or publicId in <TABLE>';
  END IF;
END $$;

-- Drop old PK constraint, rename columns, promote id_new to PK.
ALTER TABLE "<TABLE>" DROP CONSTRAINT "<TABLE>_pkey";
ALTER TABLE "<TABLE>" RENAME COLUMN "id" TO "id_old";
ALTER TABLE "<TABLE>" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "<TABLE>" ADD PRIMARY KEY ("id");

-- Make publicId NOT NULL — at this point every row has it and every write path sets it.
ALTER TABLE "<TABLE>" ALTER COLUMN "publicId" SET NOT NULL;

-- Drop the safety-net trigger and its function; application owns generation.
DROP TRIGGER IF EXISTS "<TABLE>_dm2_dualmaintain" ON "<TABLE>";
DROP FUNCTION IF EXISTS "<TABLE>_dm2_dualmaintain"();

-- Keep id_old for one release as a rollback escape; drop in DM-2-finish.
-- (Do NOT drop here.)

-- Audit trail.
INSERT INTO "AuditLog" ("id", "aggregateType", "aggregateId", "eventName", "payload", "createdAt")
VALUES (gen_random_uuid(), 'Migration', gen_random_uuid(), 'DM-2-Contract-<TABLE>',
  jsonb_build_object('migration', 'dm2_contract_<TABLE>', 'phase', 'contract'), NOW());
```

### 3b. Prisma schema update

```prisma
model <MODEL> {
  id       String  @id @default(uuid()) @db.Uuid
  publicId String  @unique @db.VarChar(32)
  // idNew is dropped from the model; id is now the uuid column.
  // id_old stays in the DB for one more release (rollback escape); omitted from Prisma.
  // ... existing fields ...
}
```

Once the Prisma schema flips, the generated client types change. This is the release that carries the two-release contract risk — every consumer must be on release N+1 code or later before release N+2 deploys. The rolling-deploy drill is what proves this.

### 3c. Release N+3 — drop `id_old`

A trailing migration removes the shadow column once confidence is high. One line, metadata-only, safe.

```sql
ALTER TABLE "<TABLE>" DROP COLUMN "id_old";
```

---

## Per-Table Dependencies

Child tables whose FK column needs TEXT→UUID conversion must wait for the parent table's DM-2. In our scope:

- `person_skills.skillId` waits for `skills`.
- `person_skills.personId` waits for `Person` (already uuid — no wait).
- `timesheet_entries.timesheetWeekId` waits for `timesheet_weeks`.
- `timesheet_entries.projectId` waits for `Project` (already uuid).
- `timesheet_entries.assignmentId` waits for `ProjectAssignment` (already uuid).
- `staffing_request_fulfilments.requestId` waits for `staffing_requests`.

FK columns pointing at already-uuid parent tables (Person, Project, ProjectAssignment) can be converted independently — no cross-table coordination needed.

## After All 12 Tables: DM-2-finish

- Regenerate `prisma/seed.ts` fixtures without any hardcoded TEXT IDs.
- Run DM-3-2b: add FK constraints on the 14 previously-blocked TEXT→UUID pairs using the same NOT VALID + VALIDATE pattern from `20260417_dm3_relation_closure/migration.sql`.
- Shrink the schema-conventions lint baseline (expect `id-not-uuid` and `fk-not-uuid` counts to drop to zero outside the `PlatformSetting.key` whitelist).
- Drop all `id_old` shadow columns across tables that have been in release N+3 long enough.

## Rollback

Each migration has a companion `drop-YYYY-MM-DD.sql` next to it. Rollback windows:

- Release N expand: reversible until the dual-maintain trigger has accumulated significant `id_new` values. Rollback drops `id_new`, `publicId`, the trigger, the function, the indexes.
- Release N+1 callers: application rollback only — revert the container image.
- Release N+2 contract: the hard cutover. Rollback requires renaming `id_old` back to `id`, restoring the old PK constraint, and rolling back the Prisma client. Blue/green verification before this step is mandatory.
- Release N+3 drop: one-way (the shadow column is gone). Treat as non-reversible.

## Reference Implementation

The `DM-2-pilot` migration for `skills` is the canonical example; every subsequent table follows it mechanically. See:

- `prisma/migrations/20260418_dm2_expand_skills/migration.sql` (added when pilot lands).
- `prisma/schema.prisma` diff on the `Skill` model (`idNew` + `publicId`).
- `scripts/dm2-backfill-public-ids.ts` (one-shot backfill helper; idempotent).
