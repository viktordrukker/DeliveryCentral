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
