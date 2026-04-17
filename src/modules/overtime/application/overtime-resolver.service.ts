import { Injectable } from '@nestjs/common';
import { PrismaService } from '@src/shared/persistence/prisma.service';
import { PlatformSettingsService } from '@src/modules/platform-settings/application/platform-settings.service';

export interface ResolvedPolicy {
  standardHoursPerWeek: number;
  maxOvertimeHoursPerWeek: number;
  source: 'exception' | 'pool' | 'department' | 'organization';
  sourceId: string | null;
  sourceName: string | null;
}

@Injectable()
export class OvertimeResolverService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly platformSettings: PlatformSettingsService,
  ) {}

  /** Resolve effective overtime policy for a person at a given date. */
  public async resolve(personId: string, date: Date): Promise<ResolvedPolicy> {
    const settings = await this.platformSettings.getAll();
    const orgDefault: ResolvedPolicy = {
      standardHoursPerWeek: settings.timesheets.standardHoursPerWeek,
      maxOvertimeHoursPerWeek: settings.overtime.defaultMaxOvertimePerWeek,
      source: 'organization',
      sourceId: null,
      sourceName: null,
    };

    if (!settings.overtime.enabled) return orgDefault;

    // 1. Person-level exception (highest priority)
    const exception = await this.prisma.overtimeException.findFirst({
      where: {
        personId,
        effectiveFrom: { lte: date },
        effectiveTo: { gte: date },
      },
      orderBy: { effectiveFrom: 'desc' },
      include: { person: { select: { displayName: true } } },
    });

    if (exception) {
      return {
        standardHoursPerWeek: orgDefault.standardHoursPerWeek,
        maxOvertimeHoursPerWeek: exception.maxOvertimeHoursPerWeek,
        source: 'exception',
        sourceId: exception.id,
        sourceName: `Exception for ${exception.person.displayName}`,
      };
    }

    // 2. Resource pool policy
    const poolMembership = await this.prisma.personResourcePoolMembership.findFirst({
      where: { personId, archivedAt: null },
      orderBy: { validFrom: 'desc' },
      select: { resourcePoolId: true, resourcePool: { select: { name: true } } },
    });

    if (poolMembership) {
      const poolPolicy = await this.prisma.overtimePolicy.findFirst({
        where: {
          resourcePoolId: poolMembership.resourcePoolId,
          approvalStatus: 'ACTIVE',
          effectiveFrom: { lte: date },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
        },
        orderBy: { effectiveFrom: 'desc' },
      });

      if (poolPolicy) {
        return {
          standardHoursPerWeek: poolPolicy.standardHoursPerWeek,
          maxOvertimeHoursPerWeek: poolPolicy.maxOvertimeHoursPerWeek,
          source: 'pool',
          sourceId: poolMembership.resourcePoolId,
          sourceName: poolMembership.resourcePool.name,
        };
      }
    }

    // 3. Department policy
    const orgMembership = await this.prisma.personOrgMembership.findFirst({
      where: { personId, archivedAt: null },
      orderBy: { validFrom: 'desc' },
      select: { orgUnitId: true, orgUnit: { select: { name: true } } },
    });

    if (orgMembership) {
      const deptPolicy = await this.prisma.overtimePolicy.findFirst({
        where: {
          orgUnitId: orgMembership.orgUnitId,
          approvalStatus: 'ACTIVE',
          effectiveFrom: { lte: date },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
        },
        orderBy: { effectiveFrom: 'desc' },
      });

      if (deptPolicy) {
        return {
          standardHoursPerWeek: deptPolicy.standardHoursPerWeek,
          maxOvertimeHoursPerWeek: deptPolicy.maxOvertimeHoursPerWeek,
          source: 'department',
          sourceId: orgMembership.orgUnitId,
          sourceName: orgMembership.orgUnit.name,
        };
      }
    }

    // 4. Organization default
    return orgDefault;
  }
}
