/**
 * Canonical "is on bench" query shared by all surfaces that report bench
 * headcount. Before this helper, four services computed bench independently
 * and produced four different numbers (Bench page / Staffing Desk /
 * Director Org Health / sidebar nav badge) for the same input data.
 *
 * Definition (single source of truth):
 *   A Person is on the bench at `asOf` iff
 *     - they are an active employee
 *       (`deletedAt = null` AND `archivedAt = null` AND `terminatedAt = null`
 *        AND `employmentStatus = 'ACTIVE'`)
 *     - they hold NO `ProjectPosition` where they are the `activePersonId`
 *       with `fillStatus` in (`BOOKED`, `ONBOARDING`, `ASSIGNED`, `ON_HOLD`)
 *       AND `activeValidFrom <= asOf` AND
 *       (`activeValidTo IS NULL` OR `activeValidTo >= asOf`).
 *
 * The helper exposes two shapes:
 *   - `listBenchPersonIds(prisma, asOf?)` — Set of personIds on bench.
 *   - `countBench(prisma, asOf?)`         — convenience count over the same set.
 *
 * Callers that need richer bench data (days-on-bench, last-project, skills)
 * still own their own enrichment; this helper only owns the "who counts"
 * boolean.
 */
import { ProjectPositionFillStatus } from '@prisma/client';

import type { PrismaService } from './prisma.service';

export const ACTIVE_FILL_STATUSES: readonly ProjectPositionFillStatus[] = [
  ProjectPositionFillStatus.BOOKED,
  ProjectPositionFillStatus.ONBOARDING,
  ProjectPositionFillStatus.ASSIGNED,
  ProjectPositionFillStatus.ON_HOLD,
];

interface CanonicalPersonLike {
  deletedAt: null;
  archivedAt: null;
  terminatedAt: null;
  employmentStatus: 'ACTIVE';
}

export function canonicalActivePersonWhere(): CanonicalPersonLike {
  return {
    deletedAt: null,
    archivedAt: null,
    terminatedAt: null,
    employmentStatus: 'ACTIVE',
  };
}

export async function listBenchPersonIds(
  prisma: PrismaService,
  asOf: Date = new Date(),
): Promise<Set<string>> {
  const [activePeople, filledRows] = await Promise.all([
    prisma.person.findMany({
      where: canonicalActivePersonWhere(),
      select: { id: true },
    }),
    prisma.projectPosition.groupBy({
      by: ['activePersonId'],
      where: {
        activePersonId: { not: null },
        fillStatus: { in: [...ACTIVE_FILL_STATUSES] },
        activeValidFrom: { lte: asOf },
        OR: [{ activeValidTo: null }, { activeValidTo: { gte: asOf } }],
      },
    }),
  ]);
  const filled = new Set<string>();
  for (const row of filledRows) {
    if (row.activePersonId) filled.add(row.activePersonId);
  }
  const bench = new Set<string>();
  for (const person of activePeople) {
    if (!filled.has(person.id)) bench.add(person.id);
  }
  return bench;
}

export async function countBench(
  prisma: PrismaService,
  asOf: Date = new Date(),
): Promise<number> {
  const bench = await listBenchPersonIds(prisma, asOf);
  return bench.size;
}
