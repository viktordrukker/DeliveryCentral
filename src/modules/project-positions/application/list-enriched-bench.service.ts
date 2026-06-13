import { Injectable } from '@nestjs/common';

import {
  availabilityHours14d,
  benchTenure,
} from '@src/shared/persistence/active-fill-window';
import {
  canonicalActivePersonWhere,
  listBenchPersonIds,
} from '@src/shared/persistence/bench-query';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { BenchEnrichedRowDto } from './contracts/bench-enriched.dto';
import { SuggestFillsService } from './suggest-fills.service';

/** Top-N suggested projects per bench person, surfaced inline on /api/people/bench. */
const SUGGESTED_PROJECT_LIMIT = 5;

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
  public constructor(
    private readonly prisma: PrismaService,
    private readonly suggestFills: SuggestFillsService,
  ) {}

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

    // W2-06 — populate `suggestedProjectIds` server-side via SuggestFillsService.
    // Each bench person gets their top-N matched OPEN projects so the bench
    // list/KPI strip (`suggestedFills` total, "N matches" badge) reflects real
    // match counts without an N+1 client roundtrip per row. Failures degrade
    // gracefully — a single match failure leaves that row's list empty rather
    // than failing the whole endpoint.
    const suggestionsByPerson = new Map<string, string[]>();
    await Promise.all(
      benchPeople.map(async (p) => {
        try {
          const res = await this.suggestFills.suggestForPerson(p.id, SUGGESTED_PROJECT_LIMIT, asOf);
          const projectIds: string[] = [];
          for (const c of res.candidates) {
            if (!projectIds.includes(c.projectId)) projectIds.push(c.projectId);
          }
          suggestionsByPerson.set(p.id, projectIds);
        } catch {
          suggestionsByPerson.set(p.id, []);
        }
      }),
    );

    // PR-16 (Decision E) — derive real 14-day availability per bench person
    // (capacity minus Σ active allocation) instead of a hardcoded 80 h.
    const availabilityByPerson = new Map<string, number>();
    await Promise.all(
      benchPeople.map(async (p) => {
        availabilityByPerson.set(p.id, await availabilityHours14d(this.prisma, { personId: p.id, from: asOf }));
      }),
    );

    return benchPeople.map((p) => {
      // PR-16 (Decision E) — explicit provenance: `no-fill-history` when no
      // RELEASED fill exists and the count falls back to time-since-hire.
      const tenure = benchTenure({
        asOf,
        lastReleased: lastReleasedByPerson.get(p.id) ?? null,
        fallback: p.hiredAt ?? null,
      });
      return {
        personId: p.id,
        personPublicId: p.publicId ?? null,
        name: p.displayName,
        role: p.role ?? '',
        office: p.location,
        grade: p.grade,
        isOnBench: true,
        daysOnBench: tenure.days,
        daysOnBenchBasis: tenure.basis,
        availabilityHours14d: availabilityByPerson.get(p.id) ?? 0,
        suggestedProjectIds: suggestionsByPerson.get(p.id) ?? [],
      };
    });
  }
}
