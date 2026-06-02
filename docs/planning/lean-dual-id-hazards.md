# Lean Dual-ID Hazards — LEAN-P0-3

V2 Master Plan Phase 0 / LEAN-P0-3. Resolution decisions for the 4 dual-ID
hazards surfaced by the LEAN-P0-1 data-shape audit
(`docs/planning/lean-data-shape-audit.md`).

A *dual-ID hazard* is any column whose meaning is ambiguous because two
candidate identifiers exist (legacy text + UUID `id_new`), or whose
referential link to a soon-to-be-dropped table is not constrained tightly
enough for the lean migration to drop the source aggregate cleanly.

Each hazard below documents:

1. **Current state** — column types, FK constraints, indexes (from
   `prisma/schema.prisma` and `prisma/migrations/`).
2. **The question** — what's ambiguous, and what breaks if we get it wrong.
3. **Resolution decision** — which field is canonical / what happens when
   the legacy table drops.
4. **Pre-Phase-3 backfill required** — what must be backfilled / verified
   *before* the Phase 3 drop migrations run.
5. **Pre-Phase-3 verification SQL** — the standalone query that surfaces
   AT-RISK rows. Each query is also wired into
   `scripts/lean-dual-id-audit.sql` + `scripts/lean-dual-id-audit.ts`.

Read-only audit: this document does not propose any schema change. The
backfill migrations live in **LEAN-P0-5** (not in this PR). The drop
migrations live in **LEAN-P3-*** (Phase 3 cutover).

---

## Hazard 1 — `StaffingRequest.id` (TEXT) vs `StaffingRequest.idNew` (UUID)

### Current state

`prisma/schema.prisma` — model `StaffingRequest` (`@@map("staffing_requests")`):

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT, PK, `@default(uuid())` | Original primary key. Application-generated UUID v4 stored as TEXT. |
| `id_new` (mapped from `idNew`) | UUID, `DEFAULT gen_random_uuid()` | DM-2 expand column. `UNIQUE` index `staffing_requests_id_new_key`. |
| `publicId` | VARCHAR(32), unique | DM-2 expand. Format `stf_<12 hex>`. Generated from `id_new`. |

FK incoming references (other tables → `staffing_requests.id`):

| From | Column | Type | On delete |
|---|---|---|---|
| `ProjectAssignment` | `staffingRequestId` | TEXT (nullable) | `SET NULL` |
| `staffing_request_fulfilments` | `requestId` | TEXT | `CASCADE` |
| `StaffingRequestProposalSlate` | `staffingRequestId` | TEXT | `CASCADE` |

Lean side provenance:

| `ProjectPosition.legacyStaffingRequestId` | UUID (nullable) | Backfill mirror; resolves via DM-2 `id_new`. |

Active triggers: `staffing_requests_dm2_dualmaintain` (BEFORE INSERT/UPDATE)
keeps `id_new` and `publicId` populated on every write.

### The question

Two ids — `id` (TEXT) and `id_new` (UUID) — coexist on every row. Which one
does the lean migration treat as canonical, and what happens to the legacy
`id` after Phase 3?

### Resolution decision

**`id_new` is canonical.** Phase 3 will:

1. Replace `staffing_requests.id` (TEXT) with the value of `id_new` (UUID)
   in a swap migration (DM-2 contract phase), promoting `id_new` into the
   PK slot.
2. Drop the old TEXT `id` column.
3. Migrate inbound FK columns (`ProjectAssignment.staffingRequestId`,
   `staffing_request_fulfilments.requestId`,
   `StaffingRequestProposalSlate.staffingRequestId`) from TEXT to UUID,
   converting values via the parent `staffing_requests.id` ↔ `id_new`
   relationship that the DM-2 expand window guaranteed in lock-step.
4. After that swap, the lean `ProjectPosition.legacyStaffingRequestId`
   already holds UUIDs sourced from `id_new`, so no further work is needed
   on the lean side.

The lean migration ultimately retires `staffing_requests` entirely
(`ProjectPosition` becomes the canonical demand row). The dual-id swap is
a prerequisite to that retirement — it cleans up the legacy TEXT id before
the table is dropped so any forensic queries against the dropped data have
a UUID to anchor on.

### Pre-Phase-3 backfill required

- **Every row** must have a non-NULL `id_new` matching the trigger
  contract. The DM-2 expand migration already enforces this with a
  `RAISE EXCEPTION` if any row is missing `id_new`; the trigger keeps new
  inserts populated. The verification SQL below double-checks at audit
  time.
- **Every row** must have a `ProjectPosition` mirror with
  `legacyStaffingRequestId = id_new::uuid` so that the
  `ProjectPosition.legacyStaffingRequestId` pointer remains valid when the
  TEXT id is dropped. This is the same probe as
  `staffing_request_backfill_completeness` in LEAN-P0-1.

### Pre-Phase-3 verification SQL

```sql
SELECT
  COUNT(*)::bigint AS violation_count,
  (SELECT id FROM "staffing_requests" WHERE "id_new" IS NULL LIMIT 1) AS sample_id
FROM "staffing_requests"
WHERE "id_new" IS NULL;
```

Expected: `violation_count = 0`. Any row with NULL `id_new` blocks the
Phase 3 swap.

---

## Hazard 2 — `StaffingRequestFulfilment.id` (TEXT) vs `StaffingRequestFulfilment.idNew` (UUID)

### Current state

`prisma/schema.prisma` — model `StaffingRequestFulfilment`
(`@@map("staffing_request_fulfilments")`):

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT, PK, `@default(uuid())` | Original primary key. |
| `id_new` | UUID, `DEFAULT gen_random_uuid()` | DM-2 expand column. `UNIQUE`. |
| `requestId` | TEXT, FK → `staffing_requests.id` (CASCADE) | Parent pointer. |
| `assignedPersonId` | TEXT | No FK to Person (TEXT, not UUID). |

There are **no inbound FK references** to
`staffing_request_fulfilments.id` from any other table — this is a leaf
aggregate.

### The question

Same as Hazard 1 — two ids coexist. Which is canonical, and does anything
else rely on the TEXT id?

### Resolution decision

**`id_new` is canonical.** Phase 3 will:

1. Promote `id_new` into the PK slot (same DM-2 swap pattern as Hazard 1).
2. Drop the old TEXT `id` column.
3. No inbound FKs to migrate (leaf table).

The lean migration treats `StaffingRequestFulfilment` as a fully retired
table. Its semantics are absorbed into `ProjectPositionFillHistory`
(`changeType IN ('BOOKED','ASSIGNED')` for the fulfilment moment) and into
`ProjectPosition.activePersonId` for the resulting active fill state.

There is no lean column that holds the legacy fulfilment id; the
`ProjectPositionFillHistory.previousSnapshot` / `newSnapshot` JSONB may
contain a copy if backfill chooses to embed it, but no relational link.

### Pre-Phase-3 backfill required

- **Every row** must have a non-NULL `id_new` (mirror of Hazard 1's
  constraint, enforced by the DM-2 expand trigger).
- **No lean-side mirroring required.** The fulfilment semantic survives in
  `ProjectPositionFillHistory`; the row itself does not need to be
  represented one-for-one. This is unlike Hazard 1, where the parent
  `StaffingRequest` is mirrored to `ProjectPosition` and a relational link
  remains.

### Pre-Phase-3 verification SQL

```sql
SELECT
  COUNT(*)::bigint AS violation_count,
  (SELECT id FROM "staffing_request_fulfilments" WHERE "id_new" IS NULL LIMIT 1) AS sample_id
FROM "staffing_request_fulfilments"
WHERE "id_new" IS NULL;
```

Expected: `violation_count = 0`.

---

## Hazard 3 — `TimesheetEntry.assignmentId` (TEXT, no FK)

### Current state

`prisma/schema.prisma` — model `TimesheetEntry`
(`@@map("timesheet_entries")`):

| Column | Type | Notes |
|---|---|---|
| `assignmentId` | TEXT, nullable | **No `@relation`.** No FK constraint to `ProjectAssignment.id`. No index. Free-text pointer to a UUID. |
| `projectId` | TEXT | (See note below — separate hazard, scoped to LEAN-P0-5.) |

Origin (from `prisma/migrations/20260405_timesheets/migration.sql`):

```sql
"assignmentId" TEXT,
```

— defined as plain TEXT with no constraint. The historical reasoning was
that timesheet entries needed to survive an assignment row's deletion (for
audit/history retention), and a soft pointer was used instead of an FK
with `ON DELETE SET NULL`.

`ProjectAssignment.id` is UUID. The lean replacement is `ProjectPosition`
(`id` UUID), but the timesheet does not point at a position — it points
at the assignment that **produced** the position.

### The question

When the `ProjectAssignment` table drops in Phase 3, what happens to
`timesheet_entries.assignmentId`? There is no FK to fail; the column
silently becomes orphan text. Queries that join
`timesheet_entries → ProjectAssignment` will return empty, and downstream
reporting (Planned vs Actual, billable hours by assignment) will lose its
row-level link.

### Resolution decision

**The timesheet must carry its own position-aware lineage columns** before
the legacy `ProjectAssignment` table can drop. The lean migration cannot
simply rewrite `assignmentId` to point at `ProjectPosition.id`, because:

- One legacy `ProjectAssignment` maps to **one or more** `ProjectPosition`
  rows (the "split per headcount unit" path documented in LEAN-P0-1).
- The timesheet's true semantic anchor is **the person who worked +
  the project they worked on + the date** — not the assignment row.

Concretely, Phase 3 will:

1. Add `timesheet_entries.positionId` (UUID, nullable, FK →
   `ProjectPosition.id ON DELETE SET NULL`).
2. Add `timesheet_entries.personId` (UUID, nullable — sourced from
   `TimesheetWeek.personId` via the existing relation; denormalised so
   reports don't have to join).
3. Backfill both columns from `ProjectAssignment.personId` +
   `legacyAssignmentId`-keyed `ProjectPosition.id` lookups.
4. Drop the `assignmentId` column after the backfill verifies.
5. Add an index `(positionId, date)` to preserve query performance for
   "hours by position over time" reports.

The new pointer is `positionId`, **not** a derivative of `assignmentId`.
The lean side is the canonical truth.

### Pre-Phase-3 backfill required

- For every `timesheet_entries` row with `assignmentId IS NOT NULL`, a
  matching `ProjectPosition` row must exist whose `legacyAssignmentId`
  equals `assignmentId::uuid`. If not, the timesheet row is **orphaned**
  and the backfill cannot resolve a `positionId` for it.
- Orphan rows are the AT-RISK population for this hazard. Operator
  decision tree (recorded in LEAN-P0-5):
  - If `assignmentId` is `NULL` → leave `positionId` `NULL` (bench time
    or unassigned work — already supported in the lean model).
  - If `assignmentId` resolves to a `ProjectPosition` → backfill
    `positionId`.
  - If `assignmentId` is set but has **no matching position** → operator
    must either:
    (a) accept dropping the link by setting `positionId` `NULL` (the
    timesheet hours remain attached to project + week, just not to a
    specific position), or
    (b) reject the migration and reconcile the orphan upstream.

### Pre-Phase-3 verification SQL

```sql
-- Surfaces orphan rows: timesheet entries whose assignmentId points at
-- a ProjectAssignment that has no ProjectPosition mirror.
SELECT
  COUNT(*)::bigint AS violation_count,
  (SELECT te.id
     FROM "timesheet_entries" te
     WHERE te."assignmentId" IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM "ProjectPosition" pp
         WHERE pp."legacyAssignmentId"::text = te."assignmentId"
       )
     LIMIT 1) AS sample_id
FROM "timesheet_entries" te
WHERE te."assignmentId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "ProjectPosition" pp
    WHERE pp."legacyAssignmentId"::text = te."assignmentId"
  );
```

Expected at audit time: ideally `0`. Any orphans flag operator-triggered
data cleanup before Phase 3.

---

## Hazard 4 — `CaseRecord.relatedAssignmentId` (FK → ProjectAssignment, SET NULL)

### Current state

`prisma/schema.prisma` — model `CaseRecord`:

| Column | Type | Notes |
|---|---|---|
| `relatedAssignmentId` | UUID, nullable | FK to `ProjectAssignment.id`. `ON DELETE SET NULL`. Index `CaseRecord_relatedAssignmentId_idx`. |

Per `prisma/migrations/00000000000001_domain_foundation/migration.sql`:

```sql
ALTER TABLE "CaseRecord" ADD CONSTRAINT "CaseRecord_relatedAssignmentId_fkey"
  FOREIGN KEY ("relatedAssignmentId") REFERENCES "ProjectAssignment"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
```

Caseload semantics (from a sampling of usages — e.g. on-hold reasons,
assignment-related issues, contract case-record linkage):

- Some `CaseRecord` rows carry a **non-NULL** `relatedAssignmentId` — they
  exist *because of* a specific assignment.
- Many `CaseRecord` rows have `relatedAssignmentId = NULL` — they are not
  tied to staffing at all.

### The question

When Phase 3 drops the `ProjectAssignment` table, the FK constraint
`CaseRecord_relatedAssignmentId_fkey` will block the drop *or* (if dropped
without preflight) the column will retain stale UUID values pointing at a
table that no longer exists. The `ON DELETE SET NULL` triggers per row but
does **not** fire on full-table drops.

### Resolution decision

**Add `CaseRecord.relatedPositionId` (UUID, FK → `ProjectPosition.id`,
`ON DELETE SET NULL`) before dropping `ProjectAssignment`. Then drop the
`relatedAssignmentId` column.**

Resolution mapping during Phase 3 backfill:

- If `relatedAssignmentId` is `NULL` → `relatedPositionId` stays `NULL`.
- If `relatedAssignmentId` resolves via
  `ProjectPosition.legacyAssignmentId` → set `relatedPositionId` to that
  position's `id`.
- If `relatedAssignmentId` is non-NULL but no matching `ProjectPosition`
  exists (orphan) → set `relatedPositionId` `NULL` and record a row in
  `lean_migration_orphan_log` (LEAN-P0-5 deliverable) so operators can
  audit which cases lost their assignment link.

Note the 1:N split (one assignment → many positions): for cases that
referenced the legacy `ProjectAssignment`, the closest single-row anchor
on the lean side is the position with the same `legacyAssignmentId`.
If the legacy assignment spawned multiple positions (multi-headcount
staffing request), the case keeps a link to **one** of them — chosen
deterministically by `ORDER BY pp.id` to make the migration replayable.

### Pre-Phase-3 backfill required

- Add `CaseRecord.relatedPositionId` column + FK + index.
- Backfill from `ProjectPosition.legacyAssignmentId` lookup.
- Drop the `relatedAssignmentId` column **only after** the backfill has
  recorded a `relatedPositionId` (or explicit NULL) for every row.

### Pre-Phase-3 verification SQL

```sql
-- Surfaces "at risk" CaseRecord rows: non-NULL relatedAssignmentId with
-- no matching ProjectPosition. These rows will silently lose their
-- staffing link in Phase 3.
SELECT
  COUNT(*)::bigint AS violation_count,
  (SELECT cr.id
     FROM "CaseRecord" cr
     WHERE cr."relatedAssignmentId" IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM "ProjectPosition" pp
         WHERE pp."legacyAssignmentId" = cr."relatedAssignmentId"
       )
     LIMIT 1) AS sample_id
FROM "CaseRecord" cr
WHERE cr."relatedAssignmentId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "ProjectPosition" pp
    WHERE pp."legacyAssignmentId" = cr."relatedAssignmentId"
  );
```

Expected at audit time: ideally `0`. Any non-zero count is an operator
heads-up that a case will lose its staffing link unless the lean mirror
is populated first.

---

## Summary table

| Hazard | Canonical id / column | Mirror requirement | Phase-3 action | Audit probe (in `scripts/lean-dual-id-audit.ts`) |
|---|---|---|---|---|
| 1. `StaffingRequest.id` vs `idNew` | `idNew` (UUID) | LEAN-P0-1 mirror | Promote `id_new` → PK; drop TEXT `id`; convert inbound FKs to UUID. | `staffing_request_id_promotion_ready` |
| 2. `StaffingRequestFulfilment.id` vs `idNew` | `idNew` (UUID) | None (no inbound FKs) | Promote `id_new` → PK; drop TEXT `id`. | `staffing_request_fulfilment_id_promotion_ready` |
| 3. `TimesheetEntry.assignmentId` (TEXT, no FK) | Replace with `positionId` (UUID) | Mirror via `ProjectPosition.legacyAssignmentId` | Add `positionId` + `personId`; backfill; drop `assignmentId`. | `timesheet_entry_assignment_orphan_check` |
| 4. `CaseRecord.relatedAssignmentId` (UUID, FK) | Replace with `relatedPositionId` (UUID) | Mirror via `ProjectPosition.legacyAssignmentId` | Add `relatedPositionId`; backfill; drop `relatedAssignmentId`. | `case_record_assignment_orphan_check` |

## What this document does NOT do

- It does **not** alter `prisma/schema.prisma`. The schema mutations are
  Phase-3 (LEAN-P3-*).
- It does **not** add any backfill migration. Backfill SQL lives in
  LEAN-P0-5 (next ticket).
- It does **not** add any new lean-side column. The lean schema is
  already populated by the mirror service (LEAN-P0-4 territory).

The deliverable here is purely:

1. This authoritative resolution document.
2. `scripts/lean-dual-id-audit.sql` — 4 standalone SQL queries.
3. `scripts/lean-dual-id-audit.ts` — read-only TypeScript runner.
4. `test/unit/lean/lean-dual-id-audit.spec.ts` — shape-verification unit
   test (no live DB).
