# V2 Soak Acceptance Protocol

This document is the operator-facing companion to
`docs/planning/lean-migration-c0-exit-checklist.md`. The C0 cutover
(flipping `dsRefresh` + `workspaceMe` defaults `false → true`) ships
**only** after a 7-day soak against `deliverit-test-v2.agentic.uz`
produces 7 consecutive clean parity snapshots.

SoT PR 19 wires up the three moving parts that turn the soak from a
manual procedure into a CI-observable gate:

1. `.github/workflows/v2-soak-monitor.yml` — daily cron at 07:00 UTC.
2. `scripts/lean-migration-soak-monitor.ts` — captures one snapshot.
3. `scripts/check-soak-7-day-green.ts` — verifies the trailing 7-day
   window before the C0 flip merges.

## The 7-day soak protocol

1. **Operator pre-flight (one-time).** Before the cron starts emitting
   real snapshots, set the `SOAK_ADMIN_BEARER` repo secret to a bearer
   token for an admin principal on `deliverit-test-v2.agentic.uz`. The
   token only needs `GET /api/admin/lean-migration/parity` access. Until
   the secret is set, every cron run will fail fast with a clear
   `::error::SOAK_ADMIN_BEARER secret is not set` message.

2. **Daily cadence.** The cron fires at 07:00 UTC and:
   - hits `GET /api/admin/lean-migration/parity` against v2-staging
   - writes the response to
     `docs/planning/lean-migration-soak-log/YYYY-MM-DD.json` on the
     dedicated `lean-migration-soak-snapshots` branch
   - opens a GitHub issue (label: `soak-divergence`) if any probe is
     non-zero, AND marks the workflow run as red

3. **Acceptance gate.** Before merging the C0 flip PR, the operator
   runs:

   ```bash
   git fetch origin lean-migration-soak-snapshots
   git checkout lean-migration-soak-snapshots
   npm run soak:check-7-day
   ```

   The script exits `0` if every one of the trailing 7 days exists on
   disk and meets the green threshold. It exits `1` otherwise — either
   a day is missing (snapshot wasn't captured), or a probe was non-zero
   on that day.

## How to read a JSON snapshot

Each `docs/planning/lean-migration-soak-log/YYYY-MM-DD.json` is the
response from `GET /api/admin/lean-migration/parity`. The shape
(`SoakSnapshot` in `scripts/lean-migration-soak-monitor.ts`):

| Field | Meaning |
|---|---|
| `capturedAt` | ISO timestamp when the snapshot was taken |
| `projectPositionCount` | rows in the lean aggregate (`ProjectPosition`) |
| `projectAssignmentCount` | rows in the legacy `ProjectAssignment` table |
| `staffingRequestCount` | rows in the legacy `StaffingRequest` table |
| `positionsLinkedToAssignment` | lean rows that point at a live legacy assignment |
| `positionsLinkedToStaffingRequest` | lean rows that point at a live legacy staffing request |
| `positionsWithOrphanedAssignmentLink` | **must be 0** — lean rows pointing at a deleted assignment |
| `positionsWithOrphanedStaffingRequestLink` | **must be 0** — lean rows pointing at a deleted staffing request |
| `assignmentsWithoutPosition` | **must be 0** — legacy assignments the mirror missed |
| `staffingRequestsWithoutPosition` | **must be 0** — legacy staffing requests the mirror missed |
| `divergenceCount` | **must be 0** — sum of the four "must be 0" probes above |

A day is **green** when all five "must be 0" probes are exactly `0`.

## Acceptance criterion (gates the C0 flip)

The C0 flip PR (`src/shared/config/platform-flags.service.ts` and
`frontend/src/lib/feature-flags.ts` defaults `false → true`) **does
not merge** until all of these are true:

- [ ] `npm run soak:check-7-day` exits `0` on `main` (or on the
      `lean-migration-soak-snapshots` branch — whichever has the
      authoritative log)
- [ ] No `soak-divergence` issues are open
- [ ] `scripts/lean-readiness-check.ts` exits `0` on v2-staging on the
      day of the flip
- [ ] All other gates in
      `docs/planning/lean-migration-c0-exit-checklist.md` are checked

Any one failing item resets the 7-day counter — the next 7 daily
snapshots must all be green before the gate re-opens.

## Manual smoke-test addendum

The numerical parity probes catch *data* divergence between the legacy
and lean shapes; they cannot catch a v2 *surface* regression (a button
that no longer works, a page that 404s, an RBAC bypass). Before the
flip, an operator must also exercise the canonical journeys from
`docs/testing/v2-soak-journeys.json` against
`deliverit-test-v2.agentic.uz` and record outcomes in the soak
checklist (`/admin/soak-checklist` — see `MANUAL-CLICK-THROUGH-30`).

A minimum-viable smoke pass:

1. Log in as each role in `docs/testing/v2-soak-journeys.json`'s
   `roles` array.
2. For each role, walk the journeys flagged `PASS` for that persona.
3. Record observations in the soak checklist (PASS / FAIL /
   FAIL_EXPECTED / NOT_APPLICABLE).
4. The checklist's `summary.cutoverReady` must be `true` — meaning zero
   `FAIL` cells against a `PASS_EXPECTED` row.

## Why this gate matters

Live mirror traffic (Phase 1) writes both shapes; the soak proves the
two stay in lock-step under real load. If the 7-day window is dirty,
the C0 flip would expose users to a surface backed by an aggregate
that's silently drifting from the legacy source of truth. Once the
mirror is removed (LEAN-P3-2, already shipped), the lean shape is
canonical — divergence at that point is a data-loss bug, not a
reconcilable drift. The soak gate is the last safety net.

## Related files

- `scripts/lean-migration-soak-monitor.ts` — daily snapshot capture
- `scripts/check-soak-7-day-green.ts` — 7-day acceptance gate
- `.github/workflows/v2-soak-monitor.yml` — cron + commit + alerting
- `docs/planning/lean-migration-c0-exit-checklist.md` — full C0 gate
- `docs/planning/lean-migration-soak-log/` — daily JSON snapshots
- `docs/testing/v2-soak-journeys.json` — manual smoke matrix
- `src/modules/admin/presentation/lean-migration-parity.controller.ts`
- `src/modules/admin/application/lean-migration-parity.service.ts`
