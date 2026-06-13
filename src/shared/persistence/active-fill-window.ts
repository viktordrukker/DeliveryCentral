/**
 * PR-14 (Decision D) — canonical active-fill window predicate.
 *
 * The deep-dive found four divergent "is this fill active in a window"
 * predicates across readers (bench-query, position repository, planner,
 * team-conflicts) — inclusive vs exclusive bounds, missing null-window
 * handling. This helper is the single source of truth for the predicate;
 * the Σ-allocation guard composes it on the write path. Reader conversion
 * is incremental — new code must use this helper.
 *
 * Semantics (inclusive on both bounds, null = open-ended):
 *   a fill window [activeValidFrom, activeValidTo] overlaps [from, to] iff
 *     (activeValidTo   IS NULL OR activeValidTo   >= from) AND
 *     (activeValidFrom IS NULL OR activeValidFrom <= to)
 *   Point-in-time checks pass from === to.
 */
import { Prisma, ProjectPositionFillStatus } from '@prisma/client';

import { ACTIVE_FILL_STATUSES } from './bench-query';
import { decimalToNumber } from './decimal';
import type { PrismaService } from './prisma.service';

/**
 * Fill states that consume a person's allocation budget. PROPOSED counts —
 * a proposed candidate is reserved capacity awaiting approval; excluding it
 * would let two parallel proposals double-book the same person.
 */
export const ALLOCATION_CONSUMING_FILL_STATUSES: readonly ProjectPositionFillStatus[] = [
  ProjectPositionFillStatus.PROPOSED,
  ProjectPositionFillStatus.BOOKED,
  ProjectPositionFillStatus.ONBOARDING,
  ProjectPositionFillStatus.ASSIGNED,
];

export interface ActiveFillWindowParams {
  from: Date;
  /** Open-ended window when null/undefined. */
  to?: Date | null;
  /** Defaults to the canonical ACTIVE_FILL_STATUSES (BOOKED/ONBOARDING/ASSIGNED/ON_HOLD). */
  statuses?: readonly ProjectPositionFillStatus[];
}

export function activeFillWindowWhere(params: ActiveFillWindowParams): Prisma.ProjectPositionWhereInput {
  const statuses = params.statuses ?? ACTIVE_FILL_STATUSES;
  const window: Prisma.ProjectPositionWhereInput[] = [
    { OR: [{ activeValidTo: null }, { activeValidTo: { gte: params.from } }] },
  ];
  if (params.to) {
    window.push({ OR: [{ activeValidFrom: null }, { activeValidFrom: { lte: params.to } }] });
  }
  return { fillStatus: { in: [...statuses] }, AND: window };
}

/**
 * PR-16 (Decision E) — canonical "open demand" definition.
 *
 * Three surfaces (Director KPI / bench matching / staffing desk) had each
 * invented their own answer to "what is open demand?": some counted only
 * `OPEN`, some lumped `OPEN` + `PROPOSED` into one bucket. The canonical
 * source of truth is `ProjectPosition.fillStatus`:
 *   - `OPEN`     ⇒ open demand        (no candidate proposed yet)
 *   - `PROPOSED` ⇒ in-progress demand (a candidate is proposed, not yet booked)
 *
 * Every surface MAY display both buckets, but the word "open" must count the
 * same rows everywhere. `openDemandWhere()` is the one place that defines it.
 */
export const OPEN_DEMAND_FILL_STATUS = ProjectPositionFillStatus.OPEN;
export const IN_PROGRESS_DEMAND_FILL_STATUS = ProjectPositionFillStatus.PROPOSED;

/** Both demand buckets — for surfaces that show open + in-progress together. */
export const DEMAND_FILL_STATUSES: readonly ProjectPositionFillStatus[] = [
  OPEN_DEMAND_FILL_STATUS,
  IN_PROGRESS_DEMAND_FILL_STATUS,
];

/**
 * Canonical predicate for OPEN demand (`fillStatus = OPEN`). Optionally scoped
 * to a single project. This is the single definition the Director KPI, bench
 * matching pool, and staffing-desk OPEN counter all read from.
 */
export function openDemandWhere(scope?: { projectId?: string }): Prisma.ProjectPositionWhereInput {
  const where: Prisma.ProjectPositionWhereInput = { fillStatus: OPEN_DEMAND_FILL_STATUS };
  if (scope?.projectId) where.projectId = scope.projectId;
  return where;
}

/**
 * Full-time capacity baseline over a 14-day window: 40 h/week × 2 weeks. The
 * firm has no per-person capacity field, so this is the firm-wide default.
 */
export const STANDARD_CAPACITY_HOURS_14D = 80;

/**
 * PR-16 (Decision E) — real availability over the next 14 days, replacing the
 * hardcoded-80 placeholder. Availability = full-time capacity minus the hours
 * already consumed by the person's Σ active allocation over the window.
 *
 * `sumOverlappingActiveAllocation` returns the Σ allocation percent across
 * allocation-consuming fills; we cap it at 100 % (an over-booked person has
 * zero free hours, never negative) and convert the remaining fraction into
 * hours against the 14-day capacity baseline. A pure-bench person (no active
 * fill) yields the full 80 h.
 */
export async function availabilityHours14d(
  prisma: PrismaService,
  params: { personId: string; from?: Date },
): Promise<number> {
  const from = params.from ?? new Date();
  const to = new Date(from.getTime() + 14 * 24 * 60 * 60 * 1000);
  const allocatedPercent = await sumOverlappingActiveAllocation(prisma, {
    personId: params.personId,
    from,
    to,
  });
  const freeFraction = Math.max(0, 1 - Math.min(100, allocatedPercent) / 100);
  return Math.round(STANDARD_CAPACITY_HOURS_14D * freeFraction);
}

export type BenchTenureBasis = 'fill-history' | 'no-fill-history';

export interface BenchTenure {
  /** Whole days the person has been on the bench as of `asOf`. */
  days: number;
  /**
   * `fill-history` when a RELEASED fill (or closeout-lag end date) anchors the
   * bench start; `no-fill-history` when the person has never held a fill and
   * the count falls back to time-since-hire. Surfaces must label the fallback
   * explicitly instead of presenting it as a genuine bench duration.
   */
  basis: BenchTenureBasis;
}

/**
 * PR-16 (Decision E) — compute days-on-bench with an explicit provenance flag.
 * `lastReleased` is the most-recent RELEASED-fill / closeout-lag end date when
 * one exists; when it is absent the caller passes the hire (or created) date as
 * `fallback`, and the result is tagged `no-fill-history` so the UI can say so.
 */
export function benchTenure(params: {
  asOf: Date;
  lastReleased: Date | null;
  fallback: Date | null;
}): BenchTenure {
  const anchor = params.lastReleased ?? params.fallback ?? params.asOf;
  const days = Math.max(0, Math.floor((params.asOf.getTime() - anchor.getTime()) / 86400000));
  return { days, basis: params.lastReleased ? 'fill-history' : 'no-fill-history' };
}

/**
 * Σ of a person's allocation across allocation-consuming positions whose
 * active window overlaps [from, to]. `excludePositionId` skips the position
 * being transitioned so it is not double-counted against itself.
 * Rows without an explicit `activeAllocationPercent` fall back to the
 * demand-side `requiredAllocationPercent`.
 */
export async function sumOverlappingActiveAllocation(
  prisma: PrismaService,
  params: { personId: string; from: Date; to?: Date | null; excludePositionId?: string },
): Promise<number> {
  const rows = await prisma.projectPosition.findMany({
    where: {
      ...activeFillWindowWhere({
        from: params.from,
        to: params.to,
        statuses: ALLOCATION_CONSUMING_FILL_STATUSES,
      }),
      activePersonId: params.personId,
      ...(params.excludePositionId ? { id: { not: params.excludePositionId } } : {}),
    },
    select: { activeAllocationPercent: true, requiredAllocationPercent: true },
  });
  return rows.reduce(
    (sum, row) => sum + decimalToNumber(row.activeAllocationPercent ?? row.requiredAllocationPercent),
    0,
  );
}
