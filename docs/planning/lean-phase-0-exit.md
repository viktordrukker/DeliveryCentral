# Lean Migration — Phase 0 Exit

V2 Master Plan Phase 0 ends here. LEAN-P0-5 lands the reconciliation
backfill migration, after which `scripts/lean-readiness-check.ts` returns
exit code 0 against a well-mirrored database and Phase 1 is unblocked.

## What Phase 0 delivered

| Item | Artifact | Status |
|---|---|---|
| LEAN-P0-1 | `docs/planning/lean-data-shape-audit.md` + `scripts/lean-readiness-check.ts` | shipped (PR #477) |
| LEAN-P0-2 | `docs/planning/lean-enum-mapping.md` + `src/shared/lean-migration/enum-mappings.ts` | shipped (PR #478) |
| LEAN-P0-3 | `docs/planning/lean-dual-id-hazards.md` + `scripts/lean-dual-id-audit.ts` | shipped (PR #479) |
| LEAN-P0-4 | `ProjectPositionMirrorService` inverted to legacy follower | shipped (PR #480) |
| LEAN-P0-5 | `prisma/migrations/20260602_lean_p0_5_reconciliation_backfill/` + this doc | shipped (this PR) |

## What the backfill migration does

`prisma/migrations/20260602_lean_p0_5_reconciliation_backfill/migration.sql`
is idempotent (CLAUDE.md rule 10) and REVERSIBLE (DM-R-4 — rollback.sql
drops the additive columns; see the migration's REVERSIBLE.md for the
data-safety contract). It performs:

1. **`ProjectPosition.legacyAssignmentId` + `legacyStaffingRequestId`
   backfill** via fingerprint match
   `(activePersonId, projectId, activeValidFrom, role)` against
   `ProjectAssignment`. Only updates rows where the legacy* columns are
   currently NULL.
2. **`ProjectPositionCandidate.legacyCandidateId` column add + backfill**
   from `StaffingRequestProposalCandidate` via the slate → SR →
   `legacyStaffingRequestId` join.
3. **`staffing_requests.id_new` + `staffing_request_fulfilments.id_new`**
   NULL-row repair (LEAN-P0-3 hazards 1 + 2). The DM-2 expand trigger
   keeps live writes populated; this fixes pre-trigger backups.
4. **`timesheet_entries.positionId` + `timesheet_entries.personId`**
   column add + backfill (LEAN-P0-3 hazard 3). `positionId` resolves via
   `assignmentId → ProjectPosition.legacyAssignmentId`; `personId` is
   denormalised from `TimesheetWeek.personId`.
5. **`CaseRecord.relatedAssignmentId`** — intentionally untouched.
   Phase 3 will NULL the FK column when `ProjectAssignment` drops
   (LEAN-P0-3 hazard 4).

## Phase 0 exit gate

After this migration is applied, every probe in
`scripts/lean-readiness-check.ts` must return `count=0`:

```text
ok    assignment_backfill_completeness count=0
ok    staffing_request_backfill_completeness count=0
ok    status_mapping_consistency count=0
ok    candidate_backfill_completeness count=0
ok    headcount_parity count=0

Summary: 0 probe(s) failed, 0 error(s), 5 ok across 5 probes.
```

Exit code `0` is the formal Phase 0 EXIT GATE. CI runs the readiness
check against staging after every merge to main; a non-zero exit code
blocks the next promote.

## How to verify locally

```bash
# Apply the migration (requires a running test DB).
docker compose exec backend npx prisma migrate deploy

# Run the readiness check.
docker compose exec backend \
  sh -c "npx ts-node --transpile-only --project tsconfig.json scripts/lean-readiness-check.ts"
```

Expected output: 5 lines of `ok` + summary line, exit code 0.

## What unblocks now

Phase 1 work can start:

- LEAN-P1 cutover gating (read-side migrations to the lean aggregate).
- Service-layer plumbing for the new `timesheet_entries.positionId` +
  `timesheet_entries.personId` columns (population on new writes plus
  consumption in reports).
- Operator runbook updates referencing the new `id_new` invariant.

Phase 3 (legacy drops) remains gated on Phase 1 + Phase 2 cutover. The
column adds in this migration are deliberately additive — Phase 3 owns
the destructive `DROP COLUMN` migrations for `assignmentId` /
`relatedAssignmentId` and the table drops for `ProjectAssignment` /
`staffing_requests` / `staffing_request_fulfilments` /
`StaffingRequestProposalSlate` / `StaffingRequestProposalCandidate`.

## What this PR does NOT do

- Does not drop any legacy column or table. Drops live in LEAN-P3-*.
- Does not change consumer code. Service code still writes to the legacy
  models; the mirror (LEAN-P0-4) keeps the lean aggregate in sync.
- Does not modify any UI. Read-side cutover happens in Phase 1.
- Does not change the readiness check's logic. The probes already
  describe the post-LEAN-P0-5 contract; this migration just makes the
  data conform to them.
