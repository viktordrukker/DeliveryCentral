import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { OrgHealthResponseDto, OrgHealthUnitDto } from './contracts/org-health.dto';

/**
 * LEAN-P4-missing-5 — Director "Org Health" aggregation.
 *
 * Single read pass: per active OrgUnit, count active PersonOrgMembership rows,
 * intersect against active ProjectPosition rows (canonical staffing aggregate),
 * derive bench size and unfill rate. Person employment-status filter mirrors
 * DirectorDashboardQueryService (`ACTIVE` or `LEAVE` count as "in the org").
 */
const ACTIVE_FILL_STATUSES = ['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'] as const;

@Injectable()
export class OrgHealthService {
  public constructor(private readonly prisma: PrismaService) {}

  public async execute(asOfRaw?: string): Promise<OrgHealthResponseDto> {
    const asOf = asOfRaw ? new Date(asOfRaw) : new Date();
    if (Number.isNaN(asOf.getTime())) {
      throw new BadRequestException('Org health asOf is invalid.');
    }

    const [orgUnits, memberships, activePositions] = await Promise.all([
      this.prisma.orgUnit.findMany({
        where: { archivedAt: null, status: 'ACTIVE' },
        select: { id: true, code: true, name: true },
      }),
      this.prisma.personOrgMembership.findMany({
        where: {
          archivedAt: null,
          validFrom: { lte: asOf },
          OR: [{ validTo: null }, { validTo: { gt: asOf } }],
          person: { employmentStatus: { in: ['ACTIVE', 'LEAVE'] } },
        },
        select: { personId: true, orgUnitId: true },
      }),
      this.prisma.projectPosition.findMany({
        where: {
          archivedAt: null,
          fillStatus: { in: [...ACTIVE_FILL_STATUSES] },
          activePersonId: { not: null },
          OR: [
            { activeValidFrom: null },
            { activeValidFrom: { lte: asOf } },
          ],
          AND: [
            {
              OR: [
                { activeValidTo: null },
                { activeValidTo: { gt: asOf } },
              ],
            },
          ],
        },
        select: { activePersonId: true },
      }),
    ]);

    const staffedPersonIds = new Set<string>();
    for (const position of activePositions) {
      if (position.activePersonId) staffedPersonIds.add(position.activePersonId);
    }

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
      let staffedCount = 0;
      for (const pid of memberIds) {
        if (staffedPersonIds.has(pid)) staffedCount += 1;
      }
      const benchSize = headcount - staffedCount;
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
