import { Injectable, NotFoundException, Optional } from '@nestjs/common';

import { PlatformSettingsService } from '@src/modules/platform-settings/application/platform-settings.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

export interface ClosureReadinessResult {
  projectId: string;
  activeAssignmentCount: number;
  activeVendorEngagementCount: number;
  pendingTimesheetCount: number;
  budgetVariancePercent: number | null;
  openAlertCount: number;
  hasCurrentWeekRag: boolean;
  isReady: boolean;
  blockers: string[];
}

// F-11.7 / D-129 — budget variance threshold above which closure
// is blocked. Default 10 (= +10% over budget); admin-tunable.
const DEFAULT_BUDGET_VARIANCE_THRESHOLD_PERCENT = 10;

@Injectable()
export class ProjectClosureReadinessService {
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

  public async checkClosureReadiness(projectId: string): Promise<ClosureReadinessResult> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found.');

    const blockers: string[] = [];

    // 1. Active assignments
    const activeAssignmentCount = await this.prisma.projectAssignment.count({
      where: { projectId, status: { in: ['CREATED', 'PROPOSED', 'BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'] } },
    });
    if (activeAssignmentCount > 0) {
      blockers.push(`${activeAssignmentCount} active assignment(s) still open.`);
    }

    // 2. Active vendor engagements
    const activeVendorEngagementCount = await this.prisma.projectVendorEngagement.count({
      where: { projectId, status: 'ACTIVE' },
    });
    if (activeVendorEngagementCount > 0) {
      blockers.push(`${activeVendorEngagementCount} active vendor engagement(s) not ended.`);
    }

    // 3. Pending timesheets (SUBMITTED but not APPROVED for this project)
    const pendingTimesheetCount = await this.prisma.timesheetEntry.count({
      where: {
        projectId,
        timesheetWeek: { status: 'SUBMITTED' },
      },
    });
    if (pendingTimesheetCount > 0) {
      blockers.push(`${pendingTimesheetCount} timesheet entries pending approval.`);
    }

    // 4. Budget variance
    let budgetVariancePercent: number | null = null;
    const budget = await this.prisma.projectBudget.findFirst({
      where: { projectId },
      orderBy: { fiscalYear: 'desc' },
    });
    if (budget) {
      const totalBudget = Number(budget.capexBudget) + Number(budget.opexBudget);
      const totalHours = await this.prisma.timesheetEntry.aggregate({
        _sum: { hours: true },
        where: { projectId, timesheetWeek: { status: 'APPROVED' } },
      });
      const estimatedCost = Number(totalHours._sum?.hours ?? 0) * 100;
      budgetVariancePercent = totalBudget > 0 ? Math.round(((estimatedCost - totalBudget) / totalBudget) * 100) : 0;
      const varianceThreshold = await this.numberSetting(
        'project.closure.budgetVarianceThresholdPercent',
        DEFAULT_BUDGET_VARIANCE_THRESHOLD_PERCENT,
      );
      if (budgetVariancePercent > varianceThreshold) {
        blockers.push(`Budget overrun: ${budgetVariancePercent}% over budget.`);
      }
    }

    // 5. Open staffing alerts (key roles unfilled)
    const rolePlan = await this.prisma.projectRolePlan.findMany({ where: { projectId } });
    const assignments = await this.prisma.projectAssignment.findMany({
      where: { projectId, status: { in: ['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'] } },
    });
    let openAlertCount = 0;
    for (const plan of rolePlan) {
      const filled = assignments.filter(
        (a) => a.staffingRole.toLowerCase() === plan.roleName.toLowerCase(),
      ).length;
      if (filled < plan.headcount) openAlertCount++;
    }

    // 6. Current week RAG snapshot
    // DATE-01: compute Monday in UTC. ProjectRagSnapshot.weekStarting is stored
    // as a UTC date and matched exactly in the query below — building `monday`
    // via local-time setDate()+setHours(0,0,0,0) produced an off-by-day match
    // for any client TZ ahead of UTC at midnight local.
    const nowMs = Date.now();
    const dayOfWeek = new Date(nowMs).getUTCDay();
    const mondayOffsetDays = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(nowMs + mondayOffsetDays * 86400000);
    monday.setUTCHours(0, 0, 0, 0);

    const hasCurrentWeekRag = !!(await this.prisma.projectRagSnapshot.findFirst({
      where: { projectId, weekStarting: monday },
    }));
    if (!hasCurrentWeekRag) {
      blockers.push('No RAG status recorded for current week.');
    }

    return {
      projectId,
      activeAssignmentCount,
      activeVendorEngagementCount,
      pendingTimesheetCount,
      budgetVariancePercent,
      openAlertCount,
      hasCurrentWeekRag,
      isReady: blockers.length === 0,
      blockers,
    };
  }
}
