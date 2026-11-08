import { BadRequestException, Injectable } from '@nestjs/common';

import { listBenchPersonIds } from '@src/shared/persistence/bench-query';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { OrgHealthResponseDto, OrgHealthUnitDto } from './contracts/org-health.dto';

/**
 * LEAN-P4-missing-5 — Director "Org Health" aggregation.
 *
 * Single read pass: per active OrgUnit, count active PersonOrgMembership rows,
 * intersect against the canonical bench set (see bench-query.ts) so the
 * portfolio bench number on this dashboard reconciles 1:1 with the sidebar
 * nav badge, the Bench page, the Staffing Desk supply panel, AND the
 * `/dashboard/portfolio/available-pool` endpoint (W4-02 unification).
 */

@Injectable()
export class OrgHealthService {
  public constructor(private readonly prisma: PrismaService) {}

  public async execute(asOfRaw?: string): Promise<OrgHealthResponseDto> {
    const asOf = asOfRaw ? new Date(asOfRaw) : new Date();
    if (Number.isNaN(asOf.getTime())) {
      throw new BadRequestException('Org health asOf is invalid.');
    }

    const [orgUnits, memberships, benchPersonIds] = await Promise.all([
      this.prisma.orgUnit.findMany({
        where: { archivedAt: null, status: 'ACTIVE' },
        select: { id: true, code: true, name: true },
      }),
      this.prisma.personOrgMembership.findMany({
        where: {
          archivedAt: null,
          validFrom: { lte: asOf },
          OR: [{ validTo: null }, { validTo: { gt: asOf } }],
          person: {
            deletedAt: null,
            archivedAt: null,
            terminatedAt: null,
            employmentStatus: 'ACTIVE',
          },
        },
        select: { personId: true, orgUnitId: true },
      }),
      listBenchPersonIds(this.prisma, asOf),
    ]);

    const membersByUnit = new Map<string, Set<string>>();
    for (const m of memberships) {
      const bucket = membersByUnit.get(m.orgUnitId);
      if (bucket) {
        bucket.add(m.personId);
      } else {
        membersByUnit.set(m.orgUnitId, new Set([m.personId]));
      }
    }

    const units: OrgHealthUnitDto[] = orgUnits.map((unit) => {
      const memberIds = membersByUnit.get(unit.id) ?? new Set<string>();
      const headcount = memberIds.size;
      let benchSize = 0;
      for (const pid of memberIds) {
        if (benchPersonIds.has(pid)) benchSize += 1;
      }
      const staffedCount = headcount - benchSize;
      const unfillRatePct = headcount > 0 ? Number(((benchSize / headcount) * 100).toFixed(1)) : 0;
      return {
        orgUnitId: unit.id,
        orgUnitCode: unit.code,
        orgUnitName: unit.name,
        headcount,
        staffedCount,
        benchSize,
        unfillRatePct,
      };
    });

    units.sort((left, right) => {
      if (right.unfillRatePct !== left.unfillRatePct) {
        return right.unfillRatePct - left.unfillRatePct;
      }
      return right.headcount - left.headcount;
    });

    const totalHeadcount = units.reduce((acc, u) => acc + u.headcount, 0);
    const totalBenchSize = units.reduce((acc, u) => acc + u.benchSize, 0);
    const portfolioUnfillRatePct =
      totalHeadcount > 0
        ? Number(((totalBenchSize / totalHeadcount) * 100).toFixed(1))
        : 0;

    return {
      asOf: asOf.toISOString(),
      totalHeadcount,
      totalBenchSize,
      portfolioUnfillRatePct,
      units,
    };
  }
}
