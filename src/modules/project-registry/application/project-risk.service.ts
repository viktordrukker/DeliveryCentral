import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { RiskCategory, RiskReviewCadence, RiskStatus, RiskType } from '@prisma/client';

import { PlatformSettingsService } from '@src/modules/platform-settings/application/platform-settings.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import {
  CreateProjectRiskDto,
  UpdateProjectRiskDto,
  ProjectRiskResponseDto,
  RiskMatrixCellDto,
  RiskSummaryDto,
} from './contracts/project-risk.dto';

// F-11.6 / D-127 — risk authoring defaults + critical-score threshold,
// resolved from PlatformSettings with safe fallbacks.
const DEFAULT_RISK_PROBABILITY = 3;
const DEFAULT_RISK_IMPACT = 3;
const DEFAULT_CRITICAL_SCORE_THRESHOLD = 15;

// ── Helpers ──────────────────────────────────────────────────────────────────

const OPEN_STATUSES: RiskStatus[] = ['IDENTIFIED', 'ASSESSED', 'MITIGATING'];

/**
 * Derive a review cadence from impact × probability (PMI Practice Standard for
 * Project Risk Management §5.4).
 * H×H → weekly · H×M or M×H → fortnightly · M×M → monthly · L×× → quarterly.
 */
export function deriveRiskCadence(impact: number, probability: number): RiskReviewCadence {
  const high = impact >= 4 && probability >= 4;
  if (high) return 'WEEKLY';
  const medHigh = (impact >= 4 && probability >= 2) || (probability >= 4 && impact >= 2);
  if (medHigh) return 'FORTNIGHTLY';
  if (impact >= 2 && probability >= 2) return 'MONTHLY';
  return 'QUARTERLY';
}

/**
 * F-12.2 / D-128 — cadence-to-days mapping. This pure helper remains
 * the canonical fallback (used by `project-exceptions.service.ts`).
 * Tenants that customize cadence days via the `risk-review-cadence`
 * MetadataDictionary entries' `entryValue` can opt into the
 * dictionary-driven path via `ProjectRiskService.loadCadenceDays()`.
 */
export function cadenceDays(cadence: RiskReviewCadence): number {
  switch (cadence) {
    case 'WEEKLY':
      return 7;
    case 'FORTNIGHTLY':
      return 14;
    case 'MONTHLY':
      return 30;
    case 'QUARTERLY':
      return 90;
  }
}

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class ProjectRiskService {
  public constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly platformSettings?: PlatformSettingsService,
  ) {}

  private async numberSetting(key: string, fallback: number): Promise<number> {
    if (!this.platformSettings) return fallback;
    const raw = await this.platformSettings.getRawValue(key);
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
    return fallback;
  }

  /**
   * F-12.2 / D-128 — dictionary-driven cadence-to-days mapping.
   * Reads the `risk-review-cadence` MetadataDictionary entries (seeded
   * in F-12.1) whose `entryValue` holds the day count for each cadence
   * (`WEEKLY=7`, `FORTNIGHTLY=14`, `MONTHLY=30`, `QUARTERLY=90`).
   *
   * Falls back to the pure `cadenceDays()` helper per cadence whenever
   * the dictionary row is missing or carries a non-numeric value, so
   * tenants on a fresh install (pre-seed) still get the legacy defaults.
   */
  public async loadCadenceDays(): Promise<Record<RiskReviewCadence, number>> {
    const fallbackMap: Record<RiskReviewCadence, number> = {
      WEEKLY: cadenceDays('WEEKLY'),
      FORTNIGHTLY: cadenceDays('FORTNIGHTLY'),
      MONTHLY: cadenceDays('MONTHLY'),
      QUARTERLY: cadenceDays('QUARTERLY'),
    };

    try {
      const dictionary = await this.prisma.metadataDictionary.findFirst({
        where: { dictionaryKey: 'risk-review-cadence' },
        select: { id: true },
      });
      if (!dictionary) return fallbackMap;

      const entries = await this.prisma.metadataEntry.findMany({
        where: { metadataDictionaryId: dictionary.id, isEnabled: true, archivedAt: null },
        select: { entryKey: true, entryValue: true },
      });

      const out = { ...fallbackMap };
      for (const e of entries) {
        const days = Number(e.entryValue);
        if (Number.isFinite(days) && days > 0 && e.entryKey in fallbackMap) {
          out[e.entryKey as RiskReviewCadence] = days;
        }
      }
      return out;
    } catch {
      // Dictionary unavailable (fresh install pre-seed, transient DB error) —
      // fall through to the pure-helper defaults.
      return fallbackMap;
    }
  }

  public async create(projectId: string, dto: CreateProjectRiskDto): Promise<ProjectRiskResponseDto> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found.');

    const probability =
      dto.probability ?? (await this.numberSetting('project.risk.defaultProbability', DEFAULT_RISK_PROBABILITY));
    const impact =
      dto.impact ?? (await this.numberSetting('project.risk.defaultImpact', DEFAULT_RISK_IMPACT));
    const risk = await this.prisma.projectRisk.create({
      data: {
        projectId,
        title: dto.title,
        description: dto.description ?? null,
        category: dto.category,
        probability,
        impact,
        strategy: dto.strategy ?? null,
        strategyDescription: dto.strategyDescription ?? null,
        damageControlPlan: dto.damageControlPlan ?? null,
        ownerPersonId: dto.ownerPersonId ?? null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        lastReviewedAt: new Date(),
        reviewCadence: deriveRiskCadence(impact, probability),
      },
    });

    return this.toResponseDto(risk);
  }

  public async update(riskId: string, dto: UpdateProjectRiskDto): Promise<ProjectRiskResponseDto> {
    const existing = await this.prisma.projectRisk.findUnique({ where: { id: riskId } });
    if (!existing) throw new NotFoundException('Risk not found.');

    const nextProbability = dto.probability ?? existing.probability;
    const nextImpact = dto.impact ?? existing.impact;
    const cadenceChanged = dto.probability !== undefined || dto.impact !== undefined;

    const risk = await this.prisma.projectRisk.update({
      where: { id: riskId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.probability !== undefined ? { probability: dto.probability } : {}),
        ...(dto.impact !== undefined ? { impact: dto.impact } : {}),
        ...(dto.strategy !== undefined ? { strategy: dto.strategy } : {}),
        ...(dto.strategyDescription !== undefined ? { strategyDescription: dto.strategyDescription } : {}),
        ...(dto.damageControlPlan !== undefined ? { damageControlPlan: dto.damageControlPlan } : {}),
        ...(dto.ownerPersonId !== undefined ? { ownerPersonId: dto.ownerPersonId } : {}),
        ...(dto.assigneePersonId !== undefined ? { assigneePersonId: dto.assigneePersonId } : {}),
        ...(dto.dueDate !== undefined ? { dueDate: new Date(dto.dueDate) } : {}),
        lastReviewedAt: new Date(),
        ...(cadenceChanged ? { reviewCadence: deriveRiskCadence(nextImpact, nextProbability) } : {}),
      },
    });

    return this.toResponseDto(risk);
  }

  public async markReviewed(riskId: string): Promise<ProjectRiskResponseDto> {
    await this.ensureRiskExists(riskId);
    const risk = await this.prisma.projectRisk.update({
      where: { id: riskId },
      data: { lastReviewedAt: new Date() },
    });
    return this.toResponseDto(risk);
  }

  public async list(
    projectId: string,
    filters?: { riskType?: RiskType; status?: RiskStatus; category?: RiskCategory },
  ): Promise<ProjectRiskResponseDto[]> {
    const risks = await this.prisma.projectRisk.findMany({
      where: {
        projectId,
        ...(filters?.riskType ? { riskType: filters.riskType } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.category ? { category: filters.category } : {}),
      },
      orderBy: [{ raisedAt: 'desc' }],
    });

    return Promise.all(risks.map((r) => this.toResponseDto(r)));
  }

  public async getById(riskId: string): Promise<ProjectRiskResponseDto> {
    const risk = await this.prisma.projectRisk.findUnique({ where: { id: riskId } });
    if (!risk) throw new NotFoundException('Risk not found.');
    return this.toResponseDto(risk);
  }

  public async convertToIssue(riskId: string, assigneePersonId: string): Promise<ProjectRiskResponseDto> {
    const original = await this.prisma.projectRisk.findUnique({ where: { id: riskId } });
    if (!original) throw new NotFoundException('Risk not found.');

    const issue = await this.prisma.projectRisk.create({
      data: {
        projectId: original.projectId,
        title: original.title,
        description: original.description,
        category: original.category,
        riskType: 'ISSUE',
        probability: 5,
        impact: original.impact,
        strategy: original.strategy,
        strategyDescription: original.strategyDescription,
        damageControlPlan: original.damageControlPlan,
        ownerPersonId: original.ownerPersonId,
        assigneePersonId,
        convertedFromRiskId: original.id,
      },
    });

    await this.prisma.projectRisk.update({
      where: { id: riskId },
      data: { status: 'CONVERTED_TO_ISSUE' },
    });

    return this.toResponseDto(issue);
  }

  public async resolve(riskId: string): Promise<ProjectRiskResponseDto> {
    await this.ensureRiskExists(riskId);
    const risk = await this.prisma.projectRisk.update({
      where: { id: riskId },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
    });
    return this.toResponseDto(risk);
  }

  public async close(riskId: string): Promise<ProjectRiskResponseDto> {
    await this.ensureRiskExists(riskId);
    const risk = await this.prisma.projectRisk.update({
      where: { id: riskId },
      data: { status: 'CLOSED' },
    });
    return this.toResponseDto(risk);
  }

  public async getRiskMatrix(projectId: string): Promise<RiskMatrixCellDto[]> {
    const risks = await this.prisma.projectRisk.findMany({
      where: { projectId, riskType: 'RISK', status: { in: OPEN_STATUSES } },
      select: { id: true, title: true, probability: true, impact: true },
    });

    const grid = new Map<string, RiskMatrixCellDto>();
    for (const r of risks) {
      const key = `${r.probability}-${r.impact}`;
      if (!grid.has(key)) {
        grid.set(key, { probability: r.probability, impact: r.impact, count: 0, risks: [] });
      }
      const cell = grid.get(key)!;
      cell.count++;
      cell.risks.push({ id: r.id, title: r.title });
    }

    return Array.from(grid.values());
  }

  public async getRiskSummary(projectId: string): Promise<RiskSummaryDto> {
    const all = await this.prisma.projectRisk.findMany({ where: { projectId } });

    const totalRisks = all.filter((r) => r.riskType === 'RISK').length;
    const totalIssues = all.filter((r) => r.riskType === 'ISSUE').length;
    const openRisks = all.filter((r) => r.riskType === 'RISK' && OPEN_STATUSES.includes(r.status)).length;
    const openIssues = all.filter((r) => r.riskType === 'ISSUE' && OPEN_STATUSES.includes(r.status)).length;
    const criticalThreshold = await this.numberSetting(
      'project.risk.criticalScoreThreshold',
      DEFAULT_CRITICAL_SCORE_THRESHOLD,
    );
    const criticalCount = all.filter(
      (r) => OPEN_STATUSES.includes(r.status) && r.probability * r.impact >= criticalThreshold,
    ).length;

    const openItems = all
      .filter((r) => OPEN_STATUSES.includes(r.status))
      .sort((a, b) => b.probability * b.impact - a.probability * a.impact)
      .slice(0, 5);

    const topRisks = await Promise.all(openItems.map((r) => this.toResponseDto(r)));

    return { totalRisks, totalIssues, openRisks, openIssues, criticalCount, topRisks };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async ensureRiskExists(riskId: string): Promise<void> {
    const risk = await this.prisma.projectRisk.findUnique({ where: { id: riskId } });
    if (!risk) throw new NotFoundException('Risk not found.');
  }

  private async resolvePersonName(personId: string | null): Promise<string | null> {
    if (!personId) return null;
    const person = await this.prisma.person.findUnique({
      where: { id: personId },
      select: { displayName: true },
    });
    return person?.displayName ?? null;
  }

  private async toResponseDto(r: {
    id: string; projectId: string; title: string; description: string | null;
    category: string; riskType: string; probability: number; impact: number;
    strategy: string | null; strategyDescription: string | null; damageControlPlan: string | null;
    status: string; ownerPersonId: string | null; assigneePersonId: string | null;
    raisedAt: Date; dueDate: Date | null; resolvedAt: Date | null;
    convertedFromRiskId: string | null; relatedCaseId: string | null;
  }): Promise<ProjectRiskResponseDto> {
    const [ownerDisplayName, assigneeDisplayName] = await Promise.all([
      this.resolvePersonName(r.ownerPersonId),
      this.resolvePersonName(r.assigneePersonId),
    ]);

    return {
      id: r.id,
      projectId: r.projectId,
      title: r.title,
      description: r.description,
      category: r.category,
      riskType: r.riskType,
      probability: r.probability,
      impact: r.impact,
      score: r.probability * r.impact,
      strategy: r.strategy,
      strategyDescription: r.strategyDescription,
      damageControlPlan: r.damageControlPlan,
      status: r.status,
      ownerPersonId: r.ownerPersonId,
      ownerDisplayName,
      assigneePersonId: r.assigneePersonId,
      assigneeDisplayName,
      raisedAt: r.raisedAt.toISOString(),
      dueDate: r.dueDate?.toISOString().slice(0, 10) ?? null,
      resolvedAt: r.resolvedAt?.toISOString() ?? null,
      convertedFromRiskId: r.convertedFromRiskId,
      relatedCaseId: r.relatedCaseId,
    };
  }
}
