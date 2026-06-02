# LEAN-P0-4 — ProjectPositionMirrorService decision

_Phase 0 of the V2 Master Plan lean migration. Authored: 2026-06-02._

## Resolution chosen: **Invert** (legacy follower)

The `ProjectPositionMirrorService` is **kept** but its direction is **flipped**.
Before this change it propagated legacy `ProjectAssignment` writes *forward*
into the lean `ProjectPosition` aggregate (the Sprint-2 dual-write mirror).
After this change it propagates canonical `ProjectPosition` writes *back* into
the paired legacy `ProjectAssignment` row.

The DI registration in `ProjectPositionsModule` is retained. The legacy caller
(`TransitionProjectAssignmentService`) no longer invokes the mirror — the
lean canonical writer (Phase 1) will pick it up instead.

## Why invert, not delete

Phase 1 of the lean migration re-points canonical writes from
`ProjectAssignment` onto `ProjectPosition.activeFill`. Phase 3 (the
`20260720_lean_staffing_contract` migration) drops the legacy
`ProjectAssignment` / `StaffingRequest` family entirely. Between Phase 1 and
Phase 3 there is a **read-path transition window** where the lean model is
canonical but ~34 legacy reader callsites (see tracker item `NEW-LGL-10`,
verifier-corrected from the "21 callsites" estimate in `V2-H.13`) still query
`ProjectAssignment` directly. Those readers include role dashboards,
person-profile aggregators, and three time-domain reads.

Deleting the mirror in Phase 0 would, the moment Phase 1 cuts writes onto
`ProjectPosition`, leave every one of those legacy readers observing a frozen
snapshot of `ProjectAssignment`. The mirror inverted closes that gap: each
canonical write trickles back into the paired legacy row, so legacy readers
keep seeing live data through the transition window.

The forward direction is no longer needed because the legacy table will not
receive any new authoritative writes once Phase 1 lands — the lean aggregate
is the source of truth and there is nothing to mirror "forward" from.

## What the inverted service does

`mirrorBackToLegacy(position: ProjectPosition, actorId: string)`:

1. Reads `ProjectPosition` from Prisma (fresh row, includes
   `legacyAssignmentId` provenance and active-fill columns).
2. If `legacyAssignmentId` is null — i.e. this position was created lean-natively
   after Phase 1 and never had a paired legacy row — return silently.
3. Otherwise update the legacy row via `prisma.projectAssignment.updateMany`
   (idempotent over the unique id): status, allocation, dates, reason fields,
   `updatedByPersonId`. Approval rows, history rows, and SLA fields are NOT
   touched — those continue to be owned by the legacy module's own write paths
   until those callsites are migrated (Phase 2 of read re-pointing).
4. Emit a `project_position.legacy_follower.synced` DomainEvent into the
   outbox for observability.
5. Swallow any error — never block the canonical write.

The legacy status mapping `mapPositionFillStatusToLegacy` is added alongside
the existing `mapLegacyAssignmentStatus`. Most states map 1:1; the lossy
direction is `RELEASED → CANCELLED` because the lean model collapsed
`REJECTED/COMPLETED/CANCELLED` into one terminal state with disambiguation via
the reason columns. Legacy readers that need to distinguish those three
sub-cases continue to read the underlying reason columns
(`cancellationReason`, `rejectionReason`, `releaseReason`).

## What was changed

| File | Change |
|------|--------|
| `src/modules/project-positions/application/project-position-mirror.service.ts` | Direction inverted. Method renamed `mirrorAssignment` → `mirrorBackToLegacy`. Input type `ProjectAssignment` → `ProjectPosition`. Writes target table flipped. Event name flipped to `project_position.legacy_follower.synced`. |
| `src/modules/project-positions/domain/value-objects/position-fill-status.ts` | Added `mapPositionFillStatusToLegacy(value)` — reverse of the existing `mapLegacyAssignmentStatus`. |
| `src/modules/assignments/application/transition-project-assignment.service.ts` | Removed the forward-mirror call site + the optional constructor injection. The legacy transition service no longer participates in mirror dual-write. |
| `src/modules/assignments/assignments.module.ts` | Removed `ProjectPositionMirrorService` injection + `ProjectPositionsModule` import (no longer a transitive dep). |
| `test/unit/project-positions/project-position-mirror.spec.ts` | New 5-case unit suite covering: legacy status mapping, RELEASED → CANCELLED with reason, skip-when-native, missing-legacy-row, error swallowing. |

The DI registration of `ProjectPositionMirrorService` in
`ProjectPositionsModule` is **kept**. Phase 1 will wire it into the lean
canonical writers (`TransitionProjectPositionFillService` and the
`CreateProjectPositionService` path) by adding it as an optional constructor
dependency — a single factory edit per service.

## What this unblocks in Phase 1

Phase 1 ("re-point canonical writes onto `ProjectPosition`") can land without
breaking the ~34 legacy reader callsites that `NEW-LGL-10` will migrate over
Phase 2. The mirror absorbs the legacy-reader compatibility cost for the
duration of the transition window. The Phase 3 contract migration (`V2-H.14`)
deletes the mirror service file entirely along with the legacy tables.

## Test plan

- TypeScript clean (`node node_modules/typescript/bin/tsc --project
  tsconfig.build.json --noEmit`).
- Unit suite for the inverted mirror — 5 cases, all green.
- Existing `position-fill-status` value-object suite — green (65 cases).
- Existing `transition-rate-card-pin` suite — green (6 cases) after removing
  the optional mirror argument from `TransitionProjectAssignmentService`.
