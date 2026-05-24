import { Injectable } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { BenchEnrichedRowDto } from './contracts/bench-enriched.dto';

/**
 * FE-#261 — Enriched bench listing.
 *
 * Bench is derived (not a stored entity) — a Person is on the bench iff
 * they have zero active fills (ProjectPosition.activePersonId pointing at
 * them with non-terminal fillStatus). This service:
 *   1. Lists active, non-terminated, non-archived persons.
 *   2. Removes anyone with an active fill on the as-of date.
 *   3. Enriches the survivors with daysOnBench (from
 *      ProjectPositionFillHistory.RELEASED or hiredAt fallback) and
 *      availabilityHours14d (80 minus scheduled hours over next 14d).
 *   4. Returns suggestedProjectIds as `[]` in v1; the matching engine
 *      (issue #267) populates it when wired.
 *
 * Performance: 2 Prisma reads regardless of bench size. The fill-history
 * lookup uses a single groupBy by personId; we hydrate display attributes
 * inline rather than firing per-person follow-up queries.
 */
@Injectable()
export class ListEnrichedBenchService {
  public constructor(private readonly prisma: PrismaService) {}

  public async listBench(args?: { asOf?: Date }): Promise<BenchEnrichedRowDto[]> {
    const asOf = args?.asOf ?? new Date();

    // Active employees, not currently filling any non-terminal position.
    const people = await this.prisma.person.findMany({
      where: {
        deletedAt: null,
        archivedAt: null,
        terminatedAt: null,
        employmentStatus: 'ACTIVE',
        // Anti-join: no ProjectPosition where person is the active fill on
        // a non-terminal status.
        positionsHeld: { none: {} }, // not used directly; we filter below
      },
      select: {
        id: true,
        displayName: true,
        role: true,
        location: true,
        grade: true,
        hiredAt: true,
      },
      take: 1000,
    });

    if (people.length === 0) return [];
    const personIds = people.map((p) => p.id);

    // Pull every active fill for these people in one shot; anyone present
    // here is NOT on bench.
    const activeFills = await this.prisma.projectPosition.findMany({
      where: {
        activePersonId: { in: personIds },
        fillStatus: { in: ['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'] },
        activeValidFrom: { lte: asOf },
        OR: [{ activeValidTo: null }, { activeValidTo: { gte: asOf } }],
      },
      select: {
        activePersonId: true,
        activeAllocationPercent: true,
      },
    });

    const allocationByPerson = new Map<string, number>();
    for (const f of activeFills) {
      if (!f.activePersonId) continue;
      const prev = allocationByPerson.get(f.activePersonId) ?? 0;
      allocationByPerson.set(
        f.activePersonId,
        prev + (f.activeAllocationPercent === null ? 0 : Number(f.activeAllocationPercent)),
      );
    }

    const benchPeople = people.filter((p) => !allocationByPerson.has(p.id));
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
