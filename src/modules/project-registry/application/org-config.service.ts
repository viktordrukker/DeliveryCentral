import { BadRequestException, Injectable } from '@nestjs/common';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { getCached, setCache } from '@src/shared/cache/simple-cache';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { OrgConfigDto, UpdateOrgConfigDto } from './contracts/org-config.dto';

const CACHE_KEY = 'org-config:default';
const CACHE_TTL_MS = 5 * 60 * 1000;

const DEFAULTS: Omit<OrgConfigDto, 'updatedAt' | 'updatedByPersonId'> = {
  id: 'default',
  reportingCadence: 'WEEKLY',
  tierLabels: { A: 'General', B: 'Quadrant' },
  exceptionAxisThreshold: 1,
  riskCadenceMap: { WEEKLY: 7, FORTNIGHTLY: 14, MONTHLY: 30, QUARTERLY: 90 },
  crStaleThresholdDays: 7,
  milestoneSlippedGraceDays: 0,
  timesheetGapDays: 14,
  pmReassignmentPolicy: 'pm-or-director-or-admin',
  defaultShapeForNewProject: 'STANDARD',
  defaultHourlyRate: null,
  ragThresholdCritical: 1.0,
  ragThresholdRed: 2.0,
  ragThresholdAmber: 3.0,
  colourBlindMode: false,
};

@Injectable()
export class OrgConfigService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogger: AuditLoggerService,
  ) {}

  public async getConfig(): Promise<OrgConfigDto> {
    const cached = getCached<OrgConfigDto>(CACHE_KEY);
    if (cached) return cached;

    const row = await this.prisma.organizationConfig.upsert({
      where: { id: 'default' },
      update: {},
      create: {
        id: 'default',
        reportingCadence: DEFAULTS.reportingCadence,
        tierLabels: DEFAULTS.tierLabels,
        exceptionAxisThreshold: DEFAULTS.exceptionAxisThreshold,
        riskCadenceMap: DEFAULTS.riskCadenceMap,
        crStaleThresholdDays: DEFAULTS.crStaleThresholdDays,
        milestoneSlippedGraceDays: DEFAULTS.milestoneSlippedGraceDays,
        timesheetGapDays: DEFAULTS.timesheetGapDays,
        pmReassignmentPolicy: DEFAULTS.pmReassignmentPolicy,
        defaultShapeForNewProject: DEFAULTS.defaultShapeForNewProject,
      },
    });

    const dto: OrgConfigDto = this.rowToDto(row);

    setCache(CACHE_KEY, dto, CACHE_TTL_MS);
    return dto;
  }

  public async updateConfig(
    patch: UpdateOrgConfigDto,
    actorPersonId: string | null,
  ): Promise<OrgConfigDto> {
    this.validate(patch);

    const before = await this.getConfig();
    const mergedTierLabels = patch.tierLabels
      ? { ...before.tierLabels, ...patch.tierLabels }
      : before.tierLabels;

    const row = await this.prisma.organizationConfig.update({
      where: { id: 'default' },
      data: {
        ...(patch.reportingCadence !== undefined ? { reportingCadence: patch.reportingCadence } : {}),
        ...(patch.tierLabels !== undefined ? { tierLabels: mergedTierLabels } : {}),
        ...(patch.exceptionAxisThreshold !== undefined
          ? { exceptionAxisThreshold: patch.exceptionAxisThreshold }
          : {}),
        ...(patch.riskCadenceMap !== undefined ? { riskCadenceMap: patch.riskCadenceMap } : {}),
        ...(patch.crStaleThresholdDays !== undefined
          ? { crStaleThresholdDays: patch.crStaleThresholdDays }
          : {}),
        ...(patch.milestoneSlippedGraceDays !== undefined
          ? { milestoneSlippedGraceDays: patch.milestoneSlippedGraceDays }
          : {}),
        ...(patch.timesheetGapDays !== undefined ? { timesheetGapDays: patch.timesheetGapDays } : {}),
        ...(patch.pmReassignmentPolicy !== undefined
          ? { pmReassignmentPolicy: patch.pmReassignmentPolicy }
          : {}),
        ...(patch.defaultShapeForNewProject !== undefined
          ? { defaultShapeForNewProject: patch.defaultShapeForNewProject }
          : {}),
        ...(patch.defaultHourlyRate !== undefined ? { defaultHourlyRate: patch.defaultHourlyRate } : {}),
        ...(patch.ragThresholdCritical !== undefined
          ? { ragThresholdCritical: patch.ragThresholdCritical }
          : {}),
        ...(patch.ragThresholdRed !== undefined ? { ragThresholdRed: patch.ragThresholdRed } : {}),
        ...(patch.ragThresholdAmber !== undefined ? { ragThresholdAmber: patch.ragThresholdAmber } : {}),
        ...(patch.colourBlindMode !== undefined ? { colourBlindMode: patch.colourBlindMode } : {}),
        updatedByPersonId: actorPersonId,
      },
    });

    setCache(CACHE_KEY, null as unknown as OrgConfigDto, 0);

    this.auditLogger.record({
      actionType: 'org-config.updated',
      actorId: actorPersonId,
      category: 'settings',
      subjectId: 'default',
      targetEntityType: 'OrganizationConfig',
      targetEntityId: 'default',
      metadata: { patch },
      details: { patch },
    });

    return this.rowToDto(row);
  }

  private rowToDto(row: {
    id: string;
    reportingCadence: string;
    tierLabels: unknown;
    exceptionAxisThreshold: number | null;
    riskCadenceMap: unknown;
    crStaleThresholdDays: number | null;
    milestoneSlippedGraceDays: number | null;
    timesheetGapDays: number | null;
    pmReassignmentPolicy: string;
    defaultShapeForNewProject: string;
    defaultHourlyRate: unknown;
    ragThresholdCritical: unknown;
    ragThresholdRed: unknown;
    ragThresholdAmber: unknown;
    colourBlindMode: boolean;
    updatedAt: Date;
    updatedByPersonId: string | null;
  }): OrgConfigDto {
    return {
      id: row.id,
      reportingCadence: (row.reportingCadence as OrgConfigDto['reportingCadence']) ?? DEFAULTS.reportingCadence,
      tierLabels: this.normaliseTierLabels(row.tierLabels),
      exceptionAxisThreshold: row.exceptionAxisThreshold ?? DEFAULTS.exceptionAxisThreshold,
      riskCadenceMap: this.normaliseRiskCadenceMap(row.riskCadenceMap),
      crStaleThresholdDays: row.crStaleThresholdDays ?? DEFAULTS.crStaleThresholdDays,
      milestoneSlippedGraceDays: row.milestoneSlippedGraceDays ?? DEFAULTS.milestoneSlippedGraceDays,
      timesheetGapDays: row.timesheetGapDays ?? DEFAULTS.timesheetGapDays,
      pmReassignmentPolicy:
        (row.pmReassignmentPolicy as OrgConfigDto['pmReassignmentPolicy']) ??
        DEFAULTS.pmReassignmentPolicy,
      defaultShapeForNewProject:
        (row.defaultShapeForNewProject as OrgConfigDto['defaultShapeForNewProject']) ??
        DEFAULTS.defaultShapeForNewProject,
      defaultHourlyRate:
        row.defaultHourlyRate !== null && row.defaultHourlyRate !== undefined
          ? Number(row.defaultHourlyRate)
          : null,
      ragThresholdCritical:
        row.ragThresholdCritical !== null && row.ragThresholdCritical !== undefined
          ? Number(row.ragThresholdCritical)
          : DEFAULTS.ragThresholdCritical,
      ragThresholdRed:
        row.ragThresholdRed !== null && row.ragThresholdRed !== undefined
          ? Number(row.ragThresholdRed)
          : DEFAULTS.ragThresholdRed,
      ragThresholdAmber:
        row.ragThresholdAmber !== null && row.ragThresholdAmber !== undefined
          ? Number(row.ragThresholdAmber)
          : DEFAULTS.ragThresholdAmber,
      colourBlindMode: row.colourBlindMode ?? DEFAULTS.colourBlindMode,
      updatedAt: row.updatedAt.toISOString(),
      updatedByPersonId: row.updatedByPersonId ?? null,
    };
  }

  public async resetDefaults(actorPersonId: string | null): Promise<OrgConfigDto> {
    return this.updateConfig(
      {
        reportingCadence: DEFAULTS.reportingCadence,
        tierLabels: DEFAULTS.tierLabels,
        exceptionAxisThreshold: DEFAULTS.exceptionAxisThreshold,
        riskCadenceMap: DEFAULTS.riskCadenceMap,
        crStaleThresholdDays: DEFAULTS.crStaleThresholdDays,
        milestoneSlippedGraceDays: DEFAULTS.milestoneSlippedGraceDays,
        timesheetGapDays: DEFAULTS.timesheetGapDays,
        pmReassignmentPolicy: DEFAULTS.pmReassignmentPolicy,
        defaultShapeForNewProject: DEFAULTS.defaultShapeForNewProject,
        defaultHourlyRate: DEFAULTS.defaultHourlyRate,
        ragThresholdCritical: DEFAULTS.ragThresholdCritical,
        ragThresholdRed: DEFAULTS.ragThresholdRed,
        ragThresholdAmber: DEFAULTS.ragThresholdAmber,
        colourBlindMode: DEFAULTS.colourBlindMode,
      },
      actorPersonId,
    );
  }

  private validate(patch: UpdateOrgConfigDto): void {
    if (patch.exceptionAxisThreshold !== undefined) {
      if (patch.exceptionAxisThreshold < 0 || patch.exceptionAxisThreshold > 4) {
        throw new BadRequestException('exceptionAxisThreshold must be between 0 and 4');
      }
    }
    if (patch.crStaleThresholdDays !== undefined && patch.crStaleThresholdDays < 0) {
      throw new BadRequestException('crStaleThresholdDays must be >= 0');
    }
    if (patch.milestoneSlippedGraceDays !== undefined && patch.milestoneSlippedGraceDays < 0) {
      throw new BadRequestException('milestoneSlippedGraceDays must be >= 0');
    }
    if (patch.timesheetGapDays !== undefined && patch.timesheetGapDays < 1) {
      throw new BadRequestException('timesheetGapDays must be >= 1');
    }
    if (patch.defaultHourlyRate !== undefined && patch.defaultHourlyRate !== null && patch.defaultHourlyRate < 0) {
      throw new BadRequestException('defaultHourlyRate must be >= 0');
    }
    // RAG cutoffs: must be strictly increasing, all within [0, 4]
    const crit = patch.ragThresholdCritical;
    const red = patch.ragThresholdRed;
    const amber = patch.ragThresholdAmber;
    if (
      (crit !== undefined && (crit < 0 || crit > 4)) ||
      (red !== undefined && (red < 0 || red > 4)) ||
      (amber !== undefined && (amber < 0 || amber > 4))
    ) {
      throw new BadRequestException('RAG thresholds must be between 0 and 4');
    }
    if (crit !== undefined || red !== undefined || amber !== undefined) {
      // Validate against existing when partial patch provided.
      // (The caller is expected to pass all three for a consistent change; if any one is passed,
      // we still ensure the supplied values are coherent.)
      if (crit !== undefined && red !== undefined && crit >= red) {
        throw new BadRequestException('ragThresholdCritical must be strictly less than ragThresholdRed');
      }
      if (red !== undefined && amber !== undefined && red >= amber) {
        throw new BadRequestException('ragThresholdRed must be strictly less than ragThresholdAmber');
      }
    }
    if (patch.riskCadenceMap) {
      for (const [k, v] of Object.entries(patch.riskCadenceMap)) {
        if (typeof v !== 'number' || v < 1) {
          throw new BadRequestException(`riskCadenceMap.${k} must be a positive number`);
        }
      }
    }
  }

  private normaliseTierLabels(value: unknown): { A: string; B: string } {
    if (value && typeof value === 'object' && 'A' in value && 'B' in value) {
      const v = value as { A: unknown; B: unknown };
      return {
        A: typeof v.A === 'string' ? v.A : DEFAULTS.tierLabels.A,
        B: typeof v.B === 'string' ? v.B : DEFAULTS.tierLabels.B,
      };
    }
    return DEFAULTS.tierLabels;
  }

  private normaliseRiskCadenceMap(value: unknown): Record<string, number> {
    if (value && typeof value === 'object') {
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(value)) {
        if (typeof v === 'number') out[k] = v;
      }
      return Object.keys(out).length > 0 ? out : DEFAULTS.riskCadenceMap;
    }
    return DEFAULTS.riskCadenceMap;
  }
}
