import { Injectable } from '@nestjs/common';

import {
  canonicalActivePersonWhere,
  listBenchPersonIds,
} from '@src/shared/persistence/bench-query';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { BenchEnrichedRowDto } from './contracts/bench-enriched.dto';

/**
 * FE-#261 — Enriched bench listing.
 *
 * Bench is derived (not a stored entity). This service delegates the
 * "who is on the bench" decision to the canonical helper in
 * `src/shared/persistence/bench-query.ts` — the same helper that backs
 * the sidebar nav badge, Staffing Desk supply panel, Director Org
 * Health, and Bench Aging matrix. The previous local predicate added a
 * spurious `positionsHeld: { none: {} }` clause on the org-position
 * relation (NOT the project-position relation), which silently masked
 * 99% of active employees and produced a 5-row response while the
 * sidebar showed 203.
 *
 * Performance: 3 Prisma reads regardless of bench size — canonical
 * bench-id resolution (2 reads inside the helper) + a fill-history
 * groupBy. Display attributes hydrate inline.
 */
@Injectable()
export class ListEnrichedBenchService {
  public constructor(private readonly prisma: PrismaService) {}

  public async listBench(args?: { asOf?: Date }): Promise<BenchEnrichedRowDto[]> {
    const asOf = args?.asOf ?? new Date();

    // Canonical bench-person ID set (single source of truth).
    const benchIds = await listBenchPersonIds(this.prisma, asOf);
    if (benchIds.size === 0) return [];

    // Hydrate display attributes for the bench cohort. Canonical predicate
    // is reapplied here to make the row select tenancy-safe — the helper
    // already enforces the same predicate, so the intersection equals the
    // original bench set.
    const benchPeople = await this.prisma.person.findMany({
      where: {
        ...canonicalActivePersonWhere(),
        id: { in: [...benchIds] },
      },
      select: {
        id: true,
        // W1-09 (issue 564) — emit publicId so FE row links can route to
        // /people/<publicId> instead of leaking the raw UUID.
        publicId: true,
        displayName: true,
        role: true,
        location: true,
        grade: true,
        hiredAt: true,
      },
    });
    if (benchPeople.length === 0) return [];

    // For each bench person: when was their most recent RELEASED transition?
    // groupBy gives one row per personId with max(occurredAt).
    const histories = await this.prisma.projectPositionFillHistory.groupBy({
      by: ['previousPersonId'],
      where: {
        changeType: 'RELEASED',
        previousPersonId: { in: benchPeople.map((p) => p.id) },
      },
      _max: { occurredAt: true },
    });
    const lastReleasedByPerson = new Map<string, Date>();
    for (const h of histories) {
      if (h.previousPersonId && h._max.occurredAt) {
        lastReleasedByPerson.set(h.previousPersonId, h._max.occurredAt);
      }
    }

    const now = asOf.getTime();
    return benchPeople.map((p) => {
      const lastReleased = lastReleasedByPerson.get(p.id) ?? p.hiredAt ?? asOf;
      const daysOnBench = Math.max(
        0,
        Math.floor((now - lastReleased.getTime()) / (24 * 60 * 60 * 1000)),
      );
      // Every bench person has 0 scheduled hours (no active fills); full 80h
      // available over the next two weeks.
      const availabilityHours14d = 80;
      return {
        personId: p.id,
        personPublicId: p.publicId ?? null,
        name: p.displayName,
        role: p.role ?? '',
        office: p.location,
        grade: p.grade,
        isOnBench: true,
        daysOnBench,
        availabilityHours14d,
        suggestedProjectIds: [],
      };
    });
  }
}
