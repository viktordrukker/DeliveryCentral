# FORWARD_ONLY — LEAN-P3-2 legacy-table drop

**Posture:** This migration is **FORWARD_ONLY** (DM-R-29). Two operator
signoffs were obtained before merge; see PR description for the
two-person rule receipts.

There is no `rollback.sql` — writing one that runs cleanly but silently
loses data is worse than having none. Recovery from a bad deploy goes
through the pre-migration snapshot toolchain (`scripts/db-snapshot.sh`),
not through automated reversal.

## Why forward-only

The 9 dropped tables (`ProjectAssignment`, `AssignmentApproval`,
`AssignmentHistory`, `staffing_requests`,
`StaffingRequestProposalSlate`, `StaffingRequestProposalCandidate`,
`staffing_request_fulfilments`, `person_release_requests`,
`person_release_approvals`) were the legacy staffing-and-release model.
They have been:

1. Backfilled into `ProjectPosition` / `ProjectPositionCandidate` /
   `ProjectPositionFillHistory` (LEAN-P0-3 + LEAN-P0-4 + LEAN-P0-5).
2. Cross-references nulled or migrated (LEAN-P3-1 fixup).
3. Every backend read path re-pointed (PR 14 of the V2 SoT).
4. Every backend write path re-pointed (PR 15 of the V2 SoT).
5. Soaked on staging with `divergenceCount: 0`
   (`docs/planning/lean-migration-soak-log/`).

Once those gates are green, the legacy tables hold no information that
isn't already in the canonical `ProjectPosition` aggregate or in
`AuditLog`. Dropping them is destructive in storage terms but
information-preserving in business terms.

## How to restore after a bad deploy

Every production/staging run of this migration MUST be preceded by a
pre-migration snapshot. The canonical flow is:

```bash
# 1) Before the migration (required by scripts/db-migrate-safe.sh):
./scripts/db-snapshot.sh pre-migrate

# 2) Run the migration via the safe wrapper:
./scripts/db-migrate-safe.sh deploy

# 3) If it turns out bad, restore the snapshot:
./scripts/db-restore.sh .snapshots/<timestamp>.pre-migrate-deploy.dump
```

Point-in-time recovery (DM-R-25) is the secondary path.

## Forward-only test

- Apply forward → `\dt ProjectAssignment` returns "Did not find any
  relation".
- Apply forward again → idempotent (`DROP TABLE IF EXISTS`).
- Pre-existing row data is destroyed on forward; only a snapshot
  restore brings rows back.

## Data loss surface

After forward (no snapshot restore):

| Lost | Source of truth that survives |
|---|---|
| Per-row `ProjectAssignment` history | `ProjectPositionFillHistory`, `AuditLog` ProjectPosition rows |
| `AssignmentApproval` decisions | `AuditLog` BudgetApproval / ProjectActivationApproval / ProjectPosition rows |
| `AssignmentHistory` change log | `AuditLog` ProjectPosition rows |
| `StaffingRequest` demand text | `ProjectPosition.role` / `skills` / `summary` |
| `StaffingRequestProposalSlate` slate decisions | `ProjectPositionCandidate.decision` |
| `StaffingRequestFulfilment` audit | `ProjectPositionFillHistory` |
| `PersonReleaseRequest` intake | `ProjectPosition.releaseReason` + `fillStatus=released` history |
| `PersonReleaseApproval` decisions | `AuditLog` ProjectPosition rows |

The lineage is preserved at the position level; per-row decision
trails inside the dropped tables are not.

See [`docs/planning/dm-r-plan.md`](../../docs/planning/dm-r-plan.md) and
[`docs/planning/schema-conventions.md`](../../docs/planning/schema-conventions.md)
for the full classification rules.
