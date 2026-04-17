import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { ProjectRolePlanService } from './project-role-plan.service';

// ── Types ─────────────────────────────────────────────────────────────────────

export type RagRating = 'GREEN' | 'AMBER' | 'RED';

export interface RagSnapshotDto {
  id: string;
  projectId: string;
  weekStarting: string;
  staffingRag: RagRating;
  scheduleRag: RagRating;
  budgetRag: RagRating;
  clientRag: RagRating | null;
  overallRag: RagRating;
  autoComputedOverall: RagRating | null;
  isOverridden: boolean;
  overrideReason: string | null;
  narrative: string | null;
  accomplishments: string | null;
  nextSteps: string | null;
  recordedByPersonId: string;
}

export interface ComputedRag {
  staffingRag: RagRating;
  staffingExplanation: string;
  scheduleRag: RagRating;
  scheduleExplanation: string;
  budgetRag: RagRating;
  budgetExplanation: string;
  overallRag: RagRating;
}

export interface DimensionDetailsJson {
  staffing: { fillRate: number; gapCount: number };
  schedule: { daysRemaining: number | null; pctRemaining: number | null };
  budget: { burnPct: number | null };
  scope: { fillRate: number };
  business: { avgMood: number | null };
}

export interface EnhancedComputedRag extends ComputedRag {
  scopeRag: RagRating;
  scopeExplanation: string;
  businessRag: RagRating;
  businessExplanation: string;
  dimensionHints: DimensionDetailsJson;
  riskSummary: string;
}

export interface StaffingAlert {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  message: string;
  actionLink?: string;
}

export interface CreateRagSnapshotDto {
  scheduleRag: RagRating;
  budgetRag: RagRating;
  clientRag?: RagRating;
  scopeRag?: RagRating;
  businessRag?: RagRating;
  overallRag?: RagRating;
  overrideReason?: string;
  narrative?: string;
  accomplishments?: string;
  nextSteps?: string;
  dimensionDetails?: DimensionDetailsJson;
  riskSummary?: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class ProjectRagService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly rolePlanService: ProjectRolePlanService,
  ) {}

  // ── Computed RAG (real-time, no snapshot) ────────────────────────────────

  public async computeRag(projectId: string): Promise<ComputedRag> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found.');

    const staffing = await this.computeStaffingRag(projectId, project.engagementModel);
    const schedule = this.computeScheduleRag(project.startsOn, project.endsOn);
    const budget = await this.computeBudgetRag(projectId);

    const scores = [staffing.rag, schedule.rag, budget.rag];
    const overallRag = scores.includes('RED') ? 'RED' : scores.includes('AMBER') ? 'AMBER' : 'GREEN';

    return {
      staffingRag: staffing.rag,
      staffingExplanation: staffing.explanation,
      scheduleRag: schedule.rag,
      scheduleExplanation: schedule.explanation,
      budgetRag: budget.rag,
      budgetExplanation: budget.explanation,
      overallRag,
    };
  }

  // ── Enhanced RAG (with scope, business, risk dimensions) ────────────────

  public async computeEnhancedRag(projectId: string): Promise<EnhancedComputedRag> {
    const base = await this.computeRag(projectId);
    const summary = await this.rolePlanService.getStaffingSummary(projectId);

    // Scope RAG — derived from fill rate (scope creep = more roles planned vs filled)
    const fillRate = summary.totalPlanned > 0 ? summary.fillRate : 100;
    const scopeRag: RagRating = fillRate >= 85 ? 'GREEN' : fillRate >= 60 ? 'AMBER' : 'RED';
    const scopeExplanation = summary.totalPlanned === 0
      ? 'No role plan — scope not measurable.'
      : `Scope fill rate ${fillRate}% (${summary.totalFilled}/${summary.totalPlanned} roles filled).`;

    // Business RAG — derived from pulse mood average for team members
    const business = await this.computeBusinessRag(projectId);

    // Risk summary text
    const riskCounts = await this.prisma.projectRisk.groupBy({
      by: ['riskType'],
      where: { projectId, status: { in: ['IDENTIFIED', 'ASSESSED', 'MITIGATING'] } },
      _count: true,
    });
    const openRisks = riskCounts.find((r) => r.riskType === 'RISK')?._count ?? 0;
    const openIssues = riskCounts.find((r) => r.riskType === 'ISSUE')?._count ?? 0;
    const criticalRisks = await this.prisma.projectRisk.count({
      where: {
        projectId,
        status: { in: ['IDENTIFIED', 'ASSESSED', 'MITIGATING'] },
        probability: { gte: 3 },
        impact: { gte: 5 },
      },
    });
    const riskSummary = `${openRisks} open risk(s), ${openIssues} open issue(s), ${criticalRisks} critical.`;

    // Schedule dimension hints
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    let daysRemaining: number | null = null;
    let pctRemaining: number | null = null;
    if (project?.endsOn) {
      const now = new Date();
      const totalMs = project.endsOn.getTime() - (project.startsOn?.getTime() ?? now.getTime());
      daysRemaining = Math.max(0, (project.endsOn.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      pctRemaining = totalMs > 0 ? Math.round((daysRemaining / (totalMs / (1000 * 60 * 60 * 24))) * 100) : 0;
      daysRemaining = Math.round(daysRemaining);
    }

    // Budget burn dimension hint
    const budgetSnap = await this.prisma.projectBudget.findFirst({
      where: { projectId },
      orderBy: { fiscalYear: 'desc' },
    });
    let burnPct: number | null = null;
    if (budgetSnap) {
      const totalBudget = Number(budgetSnap.capexBudget) + Number(budgetSnap.opexBudget);
      if (totalBudget > 0) {
        const timesheetHours = await this.prisma.timesheetEntry.aggregate({
          _sum: { hours: true },
          where: { projectId, timesheetWeek: { status: 'APPROVED' } },
        });
        const totalHours = Number(timesheetHours._sum?.hours ?? 0);
        burnPct = Math.round((totalHours * 100) / totalBudget * 100) / 100;
      }
    }

    const allRags = [base.staffingRag, base.scheduleRag, base.budgetRag, scopeRag, business.rag];
    const overallRag: RagRating = allRags.includes('RED') ? 'RED' : allRags.includes('AMBER') ? 'AMBER' : 'GREEN';

    return {
      ...base,
      overallRag,
      scopeRag,
      scopeExplanation,
      businessRag: business.rag,
      businessExplanation: business.explanation,
      dimensionHints: {
        staffing: { fillRate, gapCount: summary.totalGap },
        schedule: { daysRemaining, pctRemaining },
        budget: { burnPct },
        scope: { fillRate },
        business: { avgMood: business.avgMood },
      },
      riskSummary,
    };
  }

  /** Business RAG — derived from pulse mood of assigned team members */
  private async computeBusinessRag(
    projectId: string,
  ): Promise<{ rag: RagRating; explanation: string; avgMood: number | null }> {
    // Get person IDs assigned to this project
    const assignments = await this.prisma.projectAssignment.findMany({
      where: { projectId, status: { in: ['ACTIVE', 'APPROVED'] } },
      select: { personId: true },
    });
    const personIds = assignments.map((a) => a.personId);

    if (personIds.length === 0) {
      return { rag: 'GREEN', explanation: 'No assigned team — no pulse data.', avgMood: null };
    }

    // Get recent pulse entries (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const pulseEntries = await this.prisma.pulseEntry.findMany({
      where: {
        personId: { in: personIds },
        submittedAt: { gte: thirtyDaysAgo },
      },
      select: { mood: true },
    });

    if (pulseEntries.length === 0) {
      return { rag: 'GREEN', explanation: 'No recent pulse data for team.', avgMood: null };
    }

    const avgMood = pulseEntries.reduce((sum, e) => sum + e.mood, 0) / pulseEntries.length;
    const roundedMood = Math.round(avgMood * 10) / 10;

    if (avgMood >= 3.5) {
      return { rag: 'GREEN', explanation: `Team mood ${roundedMood}/5 (${pulseEntries.length} entries).`, avgMood: roundedMood };
    }
    if (avgMood >= 2.5) {
      return { rag: 'AMBER', explanation: `Team mood ${roundedMood}/5 — moderate concern.`, avgMood: roundedMood };
    }
    return { rag: 'RED', explanation: `Team mood ${roundedMood}/5 — low morale risk.`, avgMood: roundedMood };
  }

  /** Staffing RAG — fully automatic, engagement-aware */
  private async computeStaffingRag(
    projectId: string,
    engagementModel: string | null,
  ): Promise<{ rag: RagRating; explanation: string }> {
    const summary = await this.rolePlanService.getStaffingSummary(projectId);

    if (summary.totalPlanned === 0) {
      return { rag: 'GREEN', explanation: 'No role plan defined — no gaps detected.' };
    }

    const fillRate = summary.fillRate;
    const isFixedPrice = engagementModel === 'FIXED_PRICE';

    // Fixed price: stricter thresholds (we absorb cost of gaps)
    const greenThreshold = isFixedPrice ? 90 : 80;
    const amberThreshold = isFixedPrice ? 70 : 50;

    if (fillRate >= greenThreshold) {
      return { rag: 'GREEN', explanation: `Fill rate ${fillRate}% (${isFixedPrice ? 'FP' : 'T&M'} threshold: ${greenThreshold}%).` };
    }
    if (fillRate >= amberThreshold) {
      return { rag: 'AMBER', explanation: `Fill rate ${fillRate}% — ${summary.totalGap} gap(s). ${isFixedPrice ? 'Fixed price: gaps increase cost risk.' : ''}` };
    }
    return { rag: 'RED', explanation: `Fill rate ${fillRate}% — ${summary.totalGap} critical gap(s).${isFixedPrice ? ' Fixed price project at high cost risk.' : ''}` };
  }

  /** Schedule RAG — semi-automatic from timeline */
  private computeScheduleRag(
    startsOn: Date | null,
    endsOn: Date | null,
  ): { rag: RagRating; explanation: string } {
    if (!endsOn) return { rag: 'GREEN', explanation: 'Open-ended project — no schedule pressure.' };

    const now = new Date();
    const totalDays = endsOn.getTime() - (startsOn?.getTime() ?? now.getTime());
    const remainingDays = Math.max(0, (endsOn.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const pctRemaining = totalDays > 0 ? (remainingDays / (totalDays / (1000 * 60 * 60 * 24))) * 100 : 0;

    if (remainingDays <= 0) return { rag: 'RED', explanation: 'Project past end date.' };
    if (pctRemaining > 30) return { rag: 'GREEN', explanation: `${Math.round(remainingDays)} days remaining (${Math.round(pctRemaining)}% of timeline).` };
    if (pctRemaining > 10) return { rag: 'AMBER', explanation: `${Math.round(remainingDays)} days remaining — nearing completion.` };
    return { rag: 'RED', explanation: `Only ${Math.round(remainingDays)} days remaining — critical timeline.` };
  }

  /** Budget RAG — semi-automatic from financial data */
  private async computeBudgetRag(projectId: string): Promise<{ rag: RagRating; explanation: string }> {
    const budget = await this.prisma.projectBudget.findFirst({
      where: { projectId },
      orderBy: { fiscalYear: 'desc' },
    });

    if (!budget) return { rag: 'GREEN', explanation: 'No budget defined.' };

    const totalBudget = Number(budget.capexBudget) + Number(budget.opexBudget);
    if (totalBudget <= 0) return { rag: 'GREEN', explanation: 'Budget is zero — no financial tracking.' };

    // Simple burn check — count approved timesheet hours × avg cost rate
    const timesheetHours = await this.prisma.timesheetEntry.aggregate({
      _sum: { hours: true },
      where: {
        projectId,
        timesheetWeek: { status: 'APPROVED' },
      },
    });

    const totalHours = Number(timesheetHours._sum?.hours ?? 0);
    // Assume average cost of $100/hr as rough estimate
    const estimatedCost = totalHours * 100;
    const burnPct = Math.round((estimatedCost / totalBudget) * 100);

    if (burnPct < 70) return { rag: 'GREEN', explanation: `Estimated ${burnPct}% of budget consumed.` };
    if (burnPct < 90) return { rag: 'AMBER', explanation: `Estimated ${burnPct}% of budget consumed — monitor closely.` };
    return { rag: 'RED', explanation: `Estimated ${burnPct}% of budget consumed — at risk of overrun.` };
  }

  // ── Staffing Alerts ─────────────────────────────────────────────────────

  public async getStaffingAlerts(projectId: string): Promise<StaffingAlert[]> {
    const alerts: StaffingAlert[] = [];
    const now = new Date();
    const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    // Check for key roles unfilled
    const comparison = await this.rolePlanService.getRolePlanVsActual(projectId);
    for (const row of comparison.rows) {
      if (row.gap > 0 && row.plannedHeadcount > 0) {
        const isKeyRole = ['lead', 'architect', 'manager'].some(
          (k) => row.roleName.toLowerCase().includes(k) || (row.seniorityLevel?.toLowerCase().includes(k) ?? false),
        );
        if (isKeyRole) {
          alerts.push({
            severity: 'CRITICAL',
            message: `Key role "${row.roleName}" has ${row.gap} unfilled position(s).`,
            actionLink: `/staffing-requests?projectId=${projectId}`,
          });
        } else {
          alerts.push({
            severity: 'HIGH',
            message: `Role "${row.roleName}" has ${row.gap} unfilled position(s).`,
            actionLink: `/staffing-requests?projectId=${projectId}`,
          });
        }
      }
    }

    // Check for assignments ending soon with no replacement
    const endingSoon = await this.prisma.projectAssignment.findMany({
      where: {
        projectId,
        status: { in: ['ACTIVE', 'APPROVED'] },
        validTo: { lte: twoWeeksFromNow, gte: now },
      },
      include: { person: { select: { displayName: true } } },
    });

    for (const a of endingSoon) {
      alerts.push({
        severity: 'MEDIUM',
        message: `${a.person.displayName} (${a.staffingRole}) rolling off ${a.validTo?.toISOString().slice(0, 10)}.`,
        actionLink: `/assignments/${a.id}`,
      });
    }

    // Check for vendor engagements expiring soon
    const expiringVendors = await this.prisma.projectVendorEngagement.findMany({
      where: {
        projectId,
        status: 'ACTIVE',
        endDate: { lte: twoWeeksFromNow, gte: now },
      },
      include: { vendor: { select: { name: true } } },
    });

    for (const v of expiringVendors) {
      alerts.push({
        severity: 'MEDIUM',
        message: `Vendor "${v.vendor.name}" engagement expires ${v.endDate?.toISOString().slice(0, 10)}.`,
        actionLink: `/projects/${projectId}?tab=team`,
      });
    }

    return alerts.sort((a, b) => {
      const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };
      return order[a.severity] - order[b.severity];
    });
  }

  // ── Snapshot CRUD ───────────────────────────────────────────────────────

  public async createOrUpdateSnapshot(
    projectId: string,
    dto: CreateRagSnapshotDto,
    recordedByPersonId: string,
  ): Promise<RagSnapshotDto> {
    const weekStarting = this.getCurrentWeekStart();
    const computed = await this.computeRag(projectId);

    // Staffing RAG is always computed — never manual
    const staffingRag = computed.staffingRag;
    const autoComputedOverall = computed.overallRag;
    const overallRag = dto.overallRag ?? autoComputedOverall;
    const isOverridden = dto.overallRag !== undefined && dto.overallRag !== autoComputedOverall;

    const commonData = {
      staffingRag,
      scheduleRag: dto.scheduleRag,
      budgetRag: dto.budgetRag,
      clientRag: dto.clientRag ?? null,
      scopeRag: dto.scopeRag ?? null,
      businessRag: dto.businessRag ?? null,
      overallRag,
      autoComputedOverall,
      isOverridden,
      overrideReason: isOverridden ? (dto.overrideReason ?? null) : null,
      narrative: dto.narrative ?? null,
      accomplishments: dto.accomplishments ?? null,
      nextSteps: dto.nextSteps ?? null,
      dimensionDetails: dto.dimensionDetails ? (dto.dimensionDetails as any) : undefined,
      riskSummary: dto.riskSummary ?? null,
      recordedByPersonId,
    };

    const snapshot = await this.prisma.projectRagSnapshot.upsert({
      where: { projectId_weekStarting: { projectId, weekStarting } },
      create: { projectId, weekStarting, ...commonData },
      update: commonData,
    });

    return this.snapshotToDto(snapshot);
  }

  public async getLatestSnapshot(projectId: string): Promise<RagSnapshotDto | null> {
    const snapshot = await this.prisma.projectRagSnapshot.findFirst({
      where: { projectId },
      orderBy: { weekStarting: 'desc' },
    });
    return snapshot ? this.snapshotToDto(snapshot) : null;
  }

  public async getSnapshotHistory(projectId: string, weeksBack = 12): Promise<RagSnapshotDto[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - weeksBack * 7);

    const snapshots = await this.prisma.projectRagSnapshot.findMany({
      where: { projectId, weekStarting: { gte: cutoff } },
      orderBy: { weekStarting: 'asc' },
    });

    return snapshots.map((s) => this.snapshotToDto(s));
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private getCurrentWeekStart(): Date {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  private snapshotToDto(s: {
    id: string; projectId: string; weekStarting: Date;
    staffingRag: string; scheduleRag: string; budgetRag: string; clientRag: string | null;
    overallRag: string; autoComputedOverall: string | null; isOverridden: boolean;
    overrideReason: string | null; narrative: string | null; accomplishments: string | null;
    nextSteps: string | null; recordedByPersonId: string;
  }): RagSnapshotDto {
    return {
      id: s.id,
      projectId: s.projectId,
      weekStarting: s.weekStarting.toISOString().slice(0, 10),
      staffingRag: s.staffingRag as RagRating,
      scheduleRag: s.scheduleRag as RagRating,
      budgetRag: s.budgetRag as RagRating,
      clientRag: s.clientRag as RagRating | null,
      overallRag: s.overallRag as RagRating,
      autoComputedOverall: s.autoComputedOverall as RagRating | null,
      isOverridden: s.isOverridden,
      overrideReason: s.overrideReason,
      narrative: s.narrative,
      accomplishments: s.accomplishments,
      nextSteps: s.nextSteps,
      recordedByPersonId: s.recordedByPersonId,
    };
  }
}
