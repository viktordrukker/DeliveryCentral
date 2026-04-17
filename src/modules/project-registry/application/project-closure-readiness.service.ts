import { Injectable, NotFoundException } from '@nestjs/common';

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

@Injectable()
export class ProjectClosureReadinessService {
  public constructor(private readonly prisma: PrismaService) {}

  public async checkClosureReadiness(projectId: string): Promise<ClosureReadinessResult> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found.');

    const blockers: string[] = [];

    // 1. Active assignments
    const activeAssignmentCount = await this.prisma.projectAssignment.count({
      where: { projectId, status: { in: ['ACTIVE', 'APPROVED', 'REQUESTED'] } },
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
      if (budgetVariancePercent > 10) {
        blockers.push(`Budget overrun: ${budgetVariancePercent}% over budget.`);
      }
    }

    // 5. Open staffing alerts (key roles unfilled)
    const rolePlan = await this.prisma.projectRolePlan.findMany({ where: { projectId } });
    const assignments = await this.prisma.projectAssignment.findMany({
      where: { projectId, status: { in: ['ACTIVE', 'APPROVED'] } },
    });
    let openAlertCount = 0;
    for (const plan of rolePlan) {
      const filled = assignments.filter(
        (a) => a.staffingRole.toLowerCase() === plan.roleName.toLowerCase(),
      ).length;
      if (filled < plan.headcount) openAlertCount++;
    }

    // 6. Current week RAG snapshot
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayDiff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayDiff);
    monday.setHours(0, 0, 0, 0);

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
