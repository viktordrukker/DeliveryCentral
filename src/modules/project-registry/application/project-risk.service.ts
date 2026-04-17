import { Injectable, NotFoundException } from '@nestjs/common';
import { RiskCategory, RiskStatus, RiskType } from '@prisma/client';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import {
  CreateProjectRiskDto,
  UpdateProjectRiskDto,
  ProjectRiskResponseDto,
  RiskMatrixCellDto,
  RiskSummaryDto,
} from './contracts/project-risk.dto';

// ── Helpers ──────────────────────────────────────────────────────────────────

const OPEN_STATUSES: RiskStatus[] = ['IDENTIFIED', 'ASSESSED', 'MITIGATING'];

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class ProjectRiskService {
  public constructor(private readonly prisma: PrismaService) {}

  public async create(projectId: string, dto: CreateProjectRiskDto): Promise<ProjectRiskResponseDto> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found.');

    const risk = await this.prisma.projectRisk.create({
      data: {
        projectId,
        title: dto.title,
        description: dto.description ?? null,
        category: dto.category,
        probability: dto.probability ?? 3,
        impact: dto.impact ?? 3,
        strategy: dto.strategy ?? null,
        strategyDescription: dto.strategyDescription ?? null,
        damageControlPlan: dto.damageControlPlan ?? null,
        ownerPersonId: dto.ownerPersonId ?? null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
    });

    return this.toResponseDto(risk);
  }

  public async update(riskId: string, dto: UpdateProjectRiskDto): Promise<ProjectRiskResponseDto> {
    await this.ensureRiskExists(riskId);

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
      },
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
    const criticalCount = all.filter(
      (r) => OPEN_STATUSES.includes(r.status) && r.probability * r.impact >= 15,
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
