# Lean Migration — C0 Exit Checklist

The "C0 cutover" is the **final** step of the lean migration: flipping
the `dsRefresh` and `workspaceMe` feature-flag defaults from `false` to
`true` and routing every regular environment (staging + prod) onto the
lean `ProjectPosition` aggregate.

This document is the gate. **Do not flip the defaults** until every box
below is checked. The rationale and the explicit sequencing rule live
in the memory `feedback-v2-build-fully-before-cutover` — quoted here for
operators:

> Build v2 fully first → testers accept it → then switch over. Flipping
> the default would push an *unfinished* redesign onto the main test
> and prod surface.

## What this PR does not do

LEAN-P2-9 ships the **monitoring infrastructure** for the staging soak,
not the cutover itself:

- `GET /api/admin/lean-migration/parity` returns daily parity counts
  (`LeanMigrationParityController` + service).
- `scripts/lean-migration-soak-monitor.ts` captures one JSON snapshot
  per day under `docs/planning/lean-migration-soak-log/YYYY-MM-DD.json`.
- The defaults for `dsRefresh` + `workspaceMe` stay OFF.

## Pre-cutover soak — what to measure

The soak is run against `deliverit-test-v2.agentic.uz` (force-flagged
on via build args) for **at least 7 consecutive days** before C0. The
monitor must report the same shape every day:

| Probe | Required value |
|---|---|
| `divergenceCount` | `0` for ≥ 7 consecutive days |
| `positionsWithOrphanedAssignmentLink` | `0` |
| `positionsWithOrphanedStaffingRequestLink` | `0` |
| `assignmentsWithoutPosition` | `0` |
| `staffingRequestsWithoutPosition` | `0` |
| `lean-readiness-check` | exit code `0` against v2-staging DB |

Any non-zero day resets the 7-day counter.

## Soak runbook

1. **Capture today's snapshot (CI / cron / manual).**

   Via the admin endpoint (recommended; uses the same code path as the
   FE will consume post-cutover):

   ```bash
   API_BASE=https://deliverit-test-v2.agentic.uz \
   ADMIN_BEARER=<admin-token> \
     npx ts-node --transpile-only \
       --project tsconfig.json scripts/lean-migration-soak-monitor.ts
   ```

   Via direct Prisma (CI in the backend container):

   ```bash
   docker compose exec backend \
     sh -c "npx ts-node --transpile-only \
       --project tsconfig.json scripts/lean-migration-soak-monitor.ts --direct"
   ```

2. **Verify the snapshot landed.** The script writes
   `docs/planning/lean-migration-soak-log/YYYY-MM-DD.json` and exits
   non-zero (`1`) if `divergenceCount > 0`.

3. **If any divergence > 0:**
   - Inspect the offending row (`positionsWithOrphanedAssignmentLink`
     pinpoints lean rows that point at deleted assignment rows;
     `assignmentsWithoutPosition` pinpoints legacy rows that the mirror
     missed).
   - Re-run `scripts/lean-readiness-check.ts` to surface the canonical
     probe that fired (LEAN-P0-1).
   - Fix forward — never delete legacy rows during the soak.

4. **At 7 consecutive clean days**, the soak gate is satisfied. Proceed
   to the C0 exit gate below.

## C0 exit gate — DO NOT CHECK EARLY

Before the flag flip can be merged, every item below must be true.
**Order matters** — the v2 product must be fully built and accepted by
testing first; the flip is the last step.

- [ ] **V2 product 100% complete** — every page on the
      `DS/page-*.jsx` crafted-page set is implemented behind the flag.
- [ ] **Testing acceptance.** The user (or named testing owners) has
      explicitly signed off on the v2 redesign on
      `deliverit-test-v2.agentic.uz`.
- [ ] **V2-G.1 visual-regression gate** is green for the v2 build.
- [ ] **V2-G.3 staging-soak gate** is green: 7 consecutive clean
      snapshots in `docs/planning/lean-migration-soak-log/`.
- [ ] **`lean-readiness-check.ts` exit code 0** against the v2 staging
      DB on the day of the flip.
- [ ] **No open `LEAN-P*` PRs** other than the C0 flip itself.
- [ ] **Phase 3 drop PRs (`LEAN-P3-*`) are PRE-AUTHORED** but NOT
      merged — they ship after C0 lands and stabilises.

Only then may the C0 flip PR (toggling
`src/shared/config/platform-flags.service.ts` and
`frontend/src/lib/feature-flags.ts` defaults `false → true`) be merged.

## Rollback plan

If the post-cutover surface shows any user-visible regression:

1. Flip the defaults back via a follow-up PR (NOT a revert — keeps the
   migration history additive).
2. Re-route `deliverit-test.agentic.uz` to the legacy bundle while the
   bug is triaged.
3. The lean aggregate stays canonical at the DB layer regardless;
   only the surface flag flips. The mirror keeps both sides in sync.

## Why the order is strict

The lean migration touches the DB shape (additive, via the
LEAN-P0-5 backfill), the BE service code (Phase 1 writes onto
ProjectPosition with legacy mirror), and the FE shape (Phase 2 reads
from ProjectPosition through the position-to-assignment mapper). The
mirror (LEAN-P0-4) means both DB rows stay in sync regardless of which
code path writes — so the soak is the only thing that can prove the
two sides agree under live traffic. Once the soak is green, flipping
the FE flag is a one-line PR. Flipping the flag before the soak is
green ships an unfinished surface to real users.

## Related artefacts

- `docs/planning/lean-data-shape-audit.md` — full column map.
- `docs/planning/lean-phase-0-exit.md` — Phase 0 sign-off.
- `docs/planning/lean-enum-mapping.md` — legacy → lean enum table.
- `scripts/lean-readiness-check.ts` — five canonical reconciliation probes.
- `scripts/lean-migration-soak-monitor.ts` — this PR.
- `src/modules/admin/presentation/lean-migration-parity.controller.ts` —
  admin parity endpoint.
- `src/modules/admin/application/lean-migration-parity.service.ts` —
  the count queries.
