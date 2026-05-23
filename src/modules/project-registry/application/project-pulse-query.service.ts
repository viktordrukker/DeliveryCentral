import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { ProjectPulseSnapshotDto } from './contracts/project-pulse-snapshot.dto';
import { RadiatorScoringService } from './radiator-scoring.service';

/**
 * Sprint 3 / S3-1 — Project Pulse (lean PM Decision Dashboard) aggregator.
 *
 * Single-endpoint read that composes the existing scoring + lean staffing +
 * EVM-fed budget + milestones + risks + pending-approvals signals into one
 * payload. UI lands when DS regen completes; this PR is BE only.
 *
 * Composition notes:
 *  - Quadrant scores come from `RadiatorScoringService.computeRadiator()`,
 *    which is already cached and tenant-tuned via `RadiatorThresholdService`.
 *  - Position counts come from the lean `ProjectPosition` model (Sprint 2).
 *    Legacy `ProjectAssignment` rows are NOT consulted here — Pulse is a
 *    forward-looking surface and the lean aggregate is the source of truth
 *    for staffing state going forward.
 *  - Budget values come from `ProjectBudget` (latest fiscal year); the
 *    underlying numbers are kept truthful by S4-1 `EvmComputationService`
 *    when an admin (or future cron) runs the recompute.
 *  - `nextDecision` collapses three pending-approval sources into one
 *    "most-recent" pointer; the unified `/admin/approvals` queue (S4-6)
 *    will list all of them. This service surfaces just the next one so
 *    the Pulse card has a single CTA.
 *
 * Failure semantics: throws NotFoundException if the project doesn't exist.
 * Anything else (missing budget, no milestones, no risks) renders as nulls /
 * empty arrays so the UI can render a clean "nothing to show" state.
 */
@Injectable()
export class ProjectPulseQueryService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly radiator: RadiatorScoringService,
  ) {}

  public async getPulseSnapshot(projectId: string): Promise<ProjectPulseSnapshotDto> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found.`);
    }

    const [radiator, positions, budget, nextMilestone, topRisks, nextDecision] =
      await Promise.all([
        this.radiator.computeRadiator(projectId),
        this.aggregatePositions(projectId),
        this.aggregateBudget(projectId),
        this.findNextMilestone(projectId),
        this.findTopRisks(projectId),
        this.findNextDecision(projectId),
      ]);

    return {
      projectId,
      generatedAt: new Date().toISOString(),
      overallScore: radiator.overallScore,
      overallBand: radiator.overallBand,
      quadrants: radiator.quadrants.map((q) => ({
        key: q.key,
        score: q.score,
        band: q.band,
      })),
      positions,
      budget,
      nextMilestone,
      topRisks,
      nextDecision,
    };
  }

  private async aggregatePositions(
    projectId: string,
  ): Promise<ProjectPulseSnapshotDto['positions']> {
    const rows = await this.prisma.projectPosition.groupBy({
      by: ['fillStatus'],
      where: { projectId },
      _count: { _all: true },
    });

    const counts: Record<string, number> = {};
    for (const r of rows) {
      counts[r.fillStatus] = r._count._all;
    }

    const open = counts['OPEN'] ?? 0;
    const proposed = counts['PROPOSED'] ?? 0;
    const active = (counts['BOOKED'] ?? 0) + (counts['ONBOARDING'] ?? 0) + (counts['ASSIGNED'] ?? 0);
    const totalNonReleased = Object.entries(counts)
      .filter(([k]) => k !== 'RELEASED')
      .reduce((sum, [, n]) => sum + n, 0);

    return { open, proposed, active, totalNonReleased };
  }

  private async aggregateBudget(projectId: string): Promise<ProjectPulseSnapshotDto['budget']> {
    const budget = await this.prisma.projectBudget.findFirst({
      where: { projectId },
      orderBy: { fiscalYear: 'desc' },
      select: {
        fiscalYear: true,
        capexBudget: true,
        opexBudget: true,
        actualCost: true,
        earnedValue: true,
        plannedToDate: true,
        eac: true,
      },
    });
    if (!budget) {
      return {
        fiscalYear: null,
        bac: null,
        actualCost: null,
        earnedValue: null,
        plannedToDate: null,
        eac: null,
        variancePct: null,
      };
    }
    const bac = Number(budget.capexBudget) + Number(budget.opexBudget);
    const ac = budget.actualCost === null ? null : Number(budget.actualCost);
    const ptd = budget.plannedToDate === null ? null : Number(budget.plannedToDate);
    const variancePct =
      ac !== null && ptd !== null && ptd > 0
        ? Math.round(((ac - ptd) / ptd) * 10_000) / 100
        : null;
    return {
      fiscalYear: budget.fiscalYear,
      bac,
      actualCost: ac,
      earnedValue: budget.earnedValue === null ? null : Number(budget.earnedValue),
      plannedToDate: ptd,
      eac: budget.eac === null ? null : Number(budget.eac),
      variancePct,
    };
  }

  private async findNextMilestone(
    projectId: string,
  ): Promise<ProjectPulseSnapshotDto['nextMilestone']> {
    const m = await this.prisma.projectMilestone.findFirst({
      where: {
        projectId,
        status: { in: ['PLANNED', 'IN_PROGRESS'] },
      },
      orderBy: { plannedDate: 'asc' },
      select: {
        id: true,
        name: true,
        plannedDate: true,
        status: true,
        progressPct: true,
      },
    });
    if (!m) return null;
    return {
      id: m.id,
      name: m.name,
      plannedDate: m.plannedDate.toISOString().slice(0, 10),
      status: m.status,
      progressPct: m.progressPct,
    };
  }

  private async findTopRisks(projectId: string): Promise<ProjectPulseSnapshotDto['topRisks']> {
    const risks = await this.prisma.projectRisk.findMany({
      where: {
        projectId,
        status: { in: ['IDENTIFIED', 'ASSESSED', 'MITIGATING'] },
      },
      select: {
        id: true,
        title: true,
        category: true,
        probability: true,
        impact: true,
        status: true,
        ownerPersonId: true,
      },
      // Postgres can order by (probability * impact) via raw SQL; with the
      // current dataset sizes (low-hundreds of risks per project max) it's
      // cheaper to score + sort in memory than to introduce raw SQL.
      take: 50,
    });
    const scored = risks
      .map((r) => ({
        id: r.id,
        title: r.title,
        category: r.category,
        probability: r.probability,
        impact: r.impact,
        score: r.probability * r.impact,
        status: r.status,
        ownerPersonId: r.ownerPersonId,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    return scored;
  }

  private async findNextDecision(
    projectId: string,
  ): Promise<ProjectPulseSnapshotDto['nextDecision']> {
    const candidates: ProjectPulseSnapshotDto['nextDecision'][] = [];

    const pendingActivation = await this.prisma.projectActivationApproval.findFirst({
      where: { projectId, decision: null },
      orderBy: { requestedAt: 'desc' },
      select: { id: true, requestedAt: true },
    });
    if (pendingActivation) {
      candidates.push({
        kind: 'activation_approval',
        id: pendingActivation.id,
        summary: 'Project activation awaiting decision',
        pendingSince: pendingActivation.requestedAt.toISOString(),
      });
    }

    const pendingBudget = await this.prisma.budgetApproval.findFirst({
      where: { projectBudget: { projectId }, status: 'PENDING' },
      orderBy: { requestedAt: 'desc' },
      select: { id: true, requestedAt: true },
    });
    if (pendingBudget) {
      candidates.push({
        kind: 'budget_approval',
        id: pendingBudget.id,
        summary: 'Budget change awaiting decision',
        pendingSince: pendingBudget.requestedAt.toISOString(),
      });
    }

    const proposedChange = await this.prisma.projectChangeRequest.findFirst({
      where: { projectId, status: 'PROPOSED' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, createdAt: true },
    });
    if (proposedChange) {
      candidates.push({
        kind: 'change_request',
        id: proposedChange.id,
        summary: `Change request: ${proposedChange.title}`,
        pendingSince: proposedChange.createdAt.toISOString(),
      });
    }

    if (candidates.length === 0) return null;
    // Most-recent first by `pendingSince`.
    candidates.sort((a, b) => {
      const ta = a ? new Date(a.pendingSince).getTime() : 0;
      const tb = b ? new Date(b.pendingSince).getTime() : 0;
      return tb - ta;
    });
    return candidates[0] ?? null;
  }
}
