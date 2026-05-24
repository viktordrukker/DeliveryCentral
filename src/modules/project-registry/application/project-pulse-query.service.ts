import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import {
  ProjectPulseActivityEventDto,
  ProjectPulseDecisionDto,
  ProjectPulseExternalLinkDto,
  ProjectPulseExternalLinkKind,
  ProjectPulseMilestonesAggDto,
  ProjectPulsePositionSummaryDto,
  ProjectPulseSnapshotDto,
  ProjectPulseStaffingSummaryDto,
} from './contracts/project-pulse-snapshot.dto';
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

    const [
      radiator,
      positions,
      budget,
      nextMilestone,
      topRisks,
      decisions,
      positionsList,
      milestonesAgg,
      staffingSummary,
      externalLinks,
      recentActivity,
    ] = await Promise.all([
      this.radiator.computeRadiator(projectId),
      this.aggregatePositions(projectId),
      this.aggregateBudget(projectId),
      this.findNextMilestone(projectId),
      this.findTopRisks(projectId),
      this.findPendingDecisions(projectId),
      this.listOpenAndProposedPositions(projectId),
      this.aggregateMilestones(projectId),
      this.aggregateStaffing(projectId),
      this.listExternalLinks(projectId),
      this.listRecentActivity(projectId),
    ]);

    const quadrants = radiator.quadrants.map((q) => ({
      key: q.key,
      score: q.score,
      band: q.band,
    }));

    const nextDecision = decisions.length > 0 ? decisions[0]! : null;

    return {
      projectId,
      generatedAt: new Date().toISOString(),
      // Original S3-1 shape (preserved).
      overallScore: radiator.overallScore,
      overallBand: radiator.overallBand,
      quadrants,
      positions,
      budget,
      nextMilestone,
      topRisks,
      nextDecision,
      // FE-#259 additive shape.
      rag: {
        score: radiator.overallScore,
        band: radiator.overallBand,
        quadrants,
      },
      positionsList,
      risks: topRisks,
      decisions,
      milestones: milestonesAgg,
      recentActivity,
      staffingSummary,
      externalLinks,
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

  private async findPendingDecisions(
    projectId: string,
  ): Promise<ProjectPulseDecisionDto[]> {
    const candidates: ProjectPulseDecisionDto[] = [];

    const [pendingActivation, pendingBudgets, proposedChanges] = await Promise.all([
      this.prisma.projectActivationApproval.findMany({
        where: { projectId, decision: null },
        orderBy: { requestedAt: 'desc' },
        select: { id: true, requestedAt: true },
        take: 5,
      }),
      this.prisma.budgetApproval.findMany({
        where: { projectBudget: { projectId }, status: 'PENDING' },
        orderBy: { requestedAt: 'desc' },
        select: { id: true, requestedAt: true },
        take: 5,
      }),
      this.prisma.projectChangeRequest.findMany({
        where: { projectId, status: 'PROPOSED' },
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, createdAt: true },
        take: 5,
      }),
    ]);

    const now = Date.now();
    const ageDanger = 7 * 24 * 60 * 60 * 1000;
    const ageWarn = 2 * 24 * 60 * 60 * 1000;
    const severityFromAge = (at: Date): ProjectPulseDecisionDto['severity'] => {
      const age = now - at.getTime();
      if (age >= ageDanger) return 'danger';
      if (age >= ageWarn) return 'warning';
      return 'info';
    };

    for (const a of pendingActivation) {
      candidates.push({
        kind: 'activation_approval',
        id: a.id,
        summary: 'Project activation awaiting decision',
        pendingSince: a.requestedAt.toISOString(),
        severity: severityFromAge(a.requestedAt),
      });
    }
    for (const b of pendingBudgets) {
      candidates.push({
        kind: 'budget_approval',
        id: b.id,
        summary: 'Budget change awaiting decision',
        pendingSince: b.requestedAt.toISOString(),
        severity: severityFromAge(b.requestedAt),
      });
    }
    for (const c of proposedChanges) {
      candidates.push({
        kind: 'change_request',
        id: c.id,
        summary: `Change request: ${c.title}`,
        pendingSince: c.createdAt.toISOString(),
        severity: severityFromAge(c.createdAt),
      });
    }

    candidates.sort(
      (a, b) => new Date(b.pendingSince).getTime() - new Date(a.pendingSince).getTime(),
    );
    return candidates;
  }

  private async listOpenAndProposedPositions(
    projectId: string,
  ): Promise<ProjectPulsePositionSummaryDto[]> {
    const rows = await this.prisma.projectPosition.findMany({
      where: {
        projectId,
        fillStatus: {
          in: ['DRAFT', 'OPEN', 'PROPOSED', 'BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'],
        },
      },
      select: {
        id: true,
        role: true,
        fillStatus: true,
        activePersonId: true,
        activeAllocationPercent: true,
        startDate: true,
        endDate: true,
      },
      orderBy: { startDate: 'asc' },
      take: 200,
    });
    return rows.map((r) => ({
      id: r.id,
      role: r.role,
      fillStatus: r.fillStatus,
      activePersonId: r.activePersonId,
      allocationPercent:
        r.activeAllocationPercent === null ? null : Number(r.activeAllocationPercent),
      startDate: r.startDate.toISOString().slice(0, 10),
      endDate: r.endDate.toISOString().slice(0, 10),
    }));
  }

  private async aggregateMilestones(projectId: string): Promise<ProjectPulseMilestonesAggDto> {
    const rows = await this.prisma.projectMilestone.findMany({
      where: { projectId },
      select: { status: true, plannedDate: true },
    });
    const total = rows.length;
    const completed = rows.filter((r) => r.status === 'HIT').length;
    const ratio = total > 0 ? Math.round((completed / total) * 10_000) / 10_000 : 0;
    const upcoming = rows
      .filter((r) => r.status !== 'HIT')
      .sort((a, b) => a.plannedDate.getTime() - b.plannedDate.getTime());
    const nextGateDate = upcoming[0]
      ? upcoming[0].plannedDate.toISOString().slice(0, 10)
      : null;
    return { total, completed, ratio, nextGateDate };
  }

  private async aggregateStaffing(
    projectId: string,
  ): Promise<ProjectPulseStaffingSummaryDto> {
    const [activeFills, openOrProposed, recentReleased] = await Promise.all([
      this.prisma.projectPosition.findMany({
        where: {
          projectId,
          fillStatus: { in: ['BOOKED', 'ONBOARDING', 'ASSIGNED'] },
        },
        select: { activePersonId: true, activeAllocationPercent: true },
      }),
      this.prisma.projectPosition.count({
        where: { projectId, fillStatus: { in: ['OPEN', 'PROPOSED'] } },
      }),
      this.prisma.projectPositionFillHistory.count({
        where: {
          position: { projectId },
          changeType: 'RELEASED',
          occurredAt: { gte: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    const totalActiveAllocationPercent = activeFills.reduce(
      (sum, f) => sum + (f.activeAllocationPercent === null ? 0 : Number(f.activeAllocationPercent)),
      0,
    );
    const distinctActivePersons = new Set(
      activeFills.map((f) => f.activePersonId).filter((p): p is string => p !== null),
    ).size;

    return {
      totalActiveAllocationPercent,
      distinctActivePersons,
      openOrProposed,
      releasedLast28d: recentReleased,
    };
  }

  private async listExternalLinks(
    projectId: string,
  ): Promise<ProjectPulseExternalLinkDto[]> {
    const rows = await this.prisma.projectExternalLink.findMany({
      where: { projectId, archivedAt: null },
      select: {
        id: true,
        provider: true,
        externalProjectKey: true,
        externalProjectName: true,
        externalUrl: true,
      },
      take: 20,
    });
    return rows.map((r) => ({
      kind: providerToKind(r.provider),
      title: r.externalProjectName ?? r.externalProjectKey,
      href: r.externalUrl ?? '',
      meta: {
        provider: r.provider,
        externalProjectKey: r.externalProjectKey,
      },
    }));
  }

  private async listRecentActivity(
    projectId: string,
  ): Promise<ProjectPulseActivityEventDto[]> {
    // AuditLog is hash-chained and tracks aggregateType/aggregateId/eventName.
    // Direct project mutations land as aggregateType='Project'; we pull the
    // most recent 20 to surface in the activity rail.
    const rows = await this.prisma.auditLog.findMany({
      where: {
        aggregateType: 'Project',
        aggregateId: projectId,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        actorId: true,
        eventName: true,
      },
      take: 20,
    });
    return rows.map((r) => ({
      id: r.id,
      at: r.createdAt.toISOString(),
      actorPersonId: r.actorId,
      kind: r.eventName,
      summary: r.eventName,
    }));
  }
}

function providerToKind(provider: string): ProjectPulseExternalLinkKind {
  const p = provider.toLowerCase();
  if (p.includes('jira')) return 'jira';
  if (p.includes('confluence')) return 'confluence';
  if (p.includes('teams')) return 'teams';
  if (p.includes('gantt')) return 'gantt';
  return 'other';
}
