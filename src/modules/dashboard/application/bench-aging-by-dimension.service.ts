import { Injectable } from '@nestjs/common';

import {
  canonicalActivePersonWhere,
  listBenchPersonIds,
} from '@src/shared/persistence/bench-query';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import {
  BenchAgingByDimensionResponseDto,
  BenchAgingDimension,
  BenchAgingRowDto,
} from './contracts/bench-aging-by-dimension.dto';

interface Bucket {
  label: string;
  min: number;
  max: number;
}

const BUCKETS: Bucket[] = [
  { label: '0-7d', min: 0, max: 7 },
  { label: '8-30d', min: 7, max: 30 },
  { label: '31-60d', min: 30, max: 60 },
  { label: '61-90d', min: 60, max: 90 },
  { label: '90d+', min: 90, max: Number.POSITIVE_INFINITY },
];

/**
 * LEAN-P4b-3 — Director portfolio bench aging breakdown.
 *
 * A bench person is an ACTIVE Person who currently fills no ProjectPosition
 * (no row where `activePersonId = person.id` AND `fillStatus IN
 * BOOKED/ONBOARDING/ASSIGNED/ON_HOLD`). For each such person we compute the
 * days-on-bench from the most-recent ProjectPositionFillHistory `RELEASED`
 * event; if the person was never released we fall back to `hiredAt` (or
 * `createdAt`). We then group people into a [dimension × bucket] matrix.
 */
@Injectable()
export class BenchAgingByDimensionService {
  public constructor(private readonly prisma: PrismaService) {}

  public async summarize(
    dimension: BenchAgingDimension,
  ): Promise<BenchAgingByDimensionResponseDto> {
    const now = new Date();

    // Canonical bench-person ID set (single source of truth shared with
    // sidebar nav badge, /people/bench, Staffing Desk supply panel, and
    // Director Org Health). The previous local predicate diverged on the
    // `deletedAt` / `archivedAt` / `terminatedAt` filters which produced a
    // different "bench" denominator than the rest of the platform.
    const benchIdSet = await listBenchPersonIds(this.prisma, now);

    if (benchIdSet.size === 0) {
      return {
        dimension,
        asOf: now.toISOString(),
        bucketLabels: BUCKETS.map((b) => b.label),
        rows: [],
        benchCount: 0,
      };
    }

    const benchPeople = await this.prisma.person.findMany({
      where: {
        ...canonicalActivePersonWhere(),
        id: { in: [...benchIdSet] },
      },
      select: {
        id: true,
        hiredAt: true,
        createdAt: true,
        skillsets: true,
      },
    });
    const benchIds = benchPeople.map((p) => p.id);

    if (benchIds.length === 0) {
      return {
        dimension,
        asOf: now.toISOString(),
        bucketLabels: BUCKETS.map((b) => b.label),
        rows: [],
        benchCount: 0,
      };
    }

    // Most-recent RELEASED event per bench person.
    const releaseEvents = await this.prisma.projectPositionFillHistory.findMany({
      where: { previousPersonId: { in: benchIds }, changeType: 'RELEASED' },
      select: { previousPersonId: true, occurredAt: true },
      orderBy: { occurredAt: 'desc' },
    });
    const lastReleaseByPerson = new Map<string, Date>();
    for (const ev of releaseEvents) {
      if (!ev.previousPersonId) continue;
      if (!lastReleaseByPerson.has(ev.previousPersonId)) {
        lastReleaseByPerson.set(ev.previousPersonId, ev.occurredAt);
      }
    }

    // daysOnBench per person.
    const daysByPerson = new Map<string, number>();
    for (const p of benchPeople) {
      const benchStart = lastReleaseByPerson.get(p.id) ?? p.hiredAt ?? p.createdAt;
      const days = Math.max(
        0,
        Math.round((now.getTime() - benchStart.getTime()) / 86400000),
      );
      daysByPerson.set(p.id, days);
    }

    // Build [dimension value -> bench person ids].
    const peopleByDim = new Map<string, string[]>();
    if (dimension === 'skill') {
      for (const p of benchPeople) {
        const skills = (p.skillsets ?? []).filter((s) => s.length > 0);
        if (skills.length === 0) {
          const list = peopleByDim.get('Unspecified') ?? [];
          list.push(p.id);
          peopleByDim.set('Unspecified', list);
          continue;
        }
        for (const skill of skills) {
          const list = peopleByDim.get(skill) ?? [];
          list.push(p.id);
          peopleByDim.set(skill, list);
        }
      }
    } else {
      const memberships = await this.prisma.personOrgMembership.findMany({
        where: {
          personId: { in: benchIds },
          validFrom: { lte: now },
          OR: [{ validTo: null }, { validTo: { gt: now } }],
        },
        select: {
          personId: true,
          isPrimary: true,
          orgUnit: { select: { name: true } },
        },
        orderBy: { isPrimary: 'desc' },
      });
      const unitByPerson = new Map<string, string>();
      for (const m of memberships) {
        if (!unitByPerson.has(m.personId)) {
          unitByPerson.set(m.personId, m.orgUnit.name);
        }
      }
      for (const p of benchPeople) {
        const unit = unitByPerson.get(p.id) ?? 'Unassigned';
        const list = peopleByDim.get(unit) ?? [];
        list.push(p.id);
        peopleByDim.set(unit, list);
      }
    }

    // Bucket each row.
    const rows: BenchAgingRowDto[] = [];
    for (const [label, ids] of peopleByDim) {
      const bucketCounts = BUCKETS.map((b) => ({ bucket: b.label, count: 0 }));
      for (const personId of ids) {
        const days = daysByPerson.get(personId) ?? 0;
        const idx = BUCKETS.findIndex((b) => days >= b.min && days < b.max);
        if (idx >= 0) bucketCounts[idx].count += 1;
      }
      rows.push({ label, total: ids.length, buckets: bucketCounts });
    }
    rows.sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));

    return {
      dimension,
      asOf: now.toISOString(),
      bucketLabels: BUCKETS.map((b) => b.label),
      rows,
      benchCount: benchPeople.length,
    };
  }
}
