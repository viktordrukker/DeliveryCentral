import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@src/shared/persistence/prisma.service';
import { PlatformSettingsService } from '@src/modules/platform-settings/application/platform-settings.service';
import { CreateOvertimePolicyDto, OvertimePolicyDto } from './contracts/overtime.dto';

@Injectable()
export class OvertimePolicyService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly platformSettings: PlatformSettingsService,
  ) {}

  public async list(): Promise<OvertimePolicyDto[]> {
    const policies = await this.prisma.overtimePolicy.findMany({
      where: { effectiveTo: null },
      include: {
        orgUnit: { select: { id: true, name: true } },
        resourcePool: { select: { id: true, name: true } },
        setBy: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return policies.map((p) => ({
      id: p.id,
      orgUnitId: p.orgUnitId,
      orgUnitName: p.orgUnit?.name ?? null,
      resourcePoolId: p.resourcePoolId,
      resourcePoolName: p.resourcePool?.name ?? null,
      standardHoursPerWeek: p.standardHoursPerWeek,
      maxOvertimeHoursPerWeek: p.maxOvertimeHoursPerWeek,
      setByPersonId: p.setByPersonId,
      setByDisplayName: p.setBy.displayName,
      approvalStatus: p.approvalStatus,
      effectiveFrom: p.effectiveFrom.toISOString(),
      effectiveTo: p.effectiveTo?.toISOString() ?? null,
    }));
  }

  public async create(dto: CreateOvertimePolicyDto, actorId: string): Promise<OvertimePolicyDto> {
    if (!dto.orgUnitId && !dto.resourcePoolId) {
      throw new BadRequestException('Either orgUnitId or resourcePoolId must be provided.');
    }
    if (dto.orgUnitId && dto.resourcePoolId) {
      throw new BadRequestException('Only one of orgUnitId or resourcePoolId can be provided.');
    }

    const settings = await this.platformSettings.getAll();
    const orgMax = settings.overtime.defaultMaxOvertimePerWeek;
    const exceedsOrg = dto.maxOvertimeHoursPerWeek > orgMax;
    const approvalStatus = exceedsOrg && settings.overtime.requireApproval ? 'PENDING_APPROVAL' : 'ACTIVE';

    const policy = await this.prisma.overtimePolicy.create({
      data: {
        orgUnitId: dto.orgUnitId ?? null,
        resourcePoolId: dto.resourcePoolId ?? null,
        standardHoursPerWeek: dto.standardHoursPerWeek,
        maxOvertimeHoursPerWeek: dto.maxOvertimeHoursPerWeek,
        setByPersonId: actorId,
        approvalStatus,
      },
      include: {
        orgUnit: { select: { id: true, name: true } },
        resourcePool: { select: { id: true, name: true } },
        setBy: { select: { id: true, displayName: true } },
      },
    });

    return {
      id: policy.id,
      orgUnitId: policy.orgUnitId,
      orgUnitName: policy.orgUnit?.name ?? null,
      resourcePoolId: policy.resourcePoolId,
      resourcePoolName: policy.resourcePool?.name ?? null,
      standardHoursPerWeek: policy.standardHoursPerWeek,
      maxOvertimeHoursPerWeek: policy.maxOvertimeHoursPerWeek,
      setByPersonId: policy.setByPersonId,
      setByDisplayName: policy.setBy.displayName,
      approvalStatus: policy.approvalStatus,
      effectiveFrom: policy.effectiveFrom.toISOString(),
      effectiveTo: policy.effectiveTo?.toISOString() ?? null,
    };
  }

  public async remove(id: string): Promise<void> {
    await this.prisma.overtimePolicy.update({
      where: { id },
      data: { effectiveTo: new Date() },
    });
  }
}
