import { Injectable } from '@nestjs/common';
import { InMemoryProjectAssignmentRepository } from '@src/modules/assignments/infrastructure/repositories/in-memory/in-memory-project-assignment.repository';
import { PlatformSettingsService } from '@src/modules/platform-settings/application/platform-settings.service';
import { InMemoryProjectRepository } from '@src/modules/project-registry/infrastructure/repositories/in-memory/in-memory-project.repository';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { InMemoryStaffingRequestService } from '@src/modules/staffing-requests/infrastructure/services/in-memory-staffing-request.service';

import { PlannedVsActualQueryService } from './planned-vs-actual-query.service';
import { DeliveryManagerDashboardResponseDto, ProjectScorecardHistoryItemDto } from './contracts/delivery-manager-dashboard.dto';

interface DeliveryManagerDashboardQuery {
  asOf?: string;
}

@Injectable()
export class DeliveryManagerDashboardQueryService {
  public constructor(
    private readonly projectRepository: InMemoryProjectRepository,
    private readonly projectAssignmentRepository: InMemoryProjectAssignmentRepository,
    private readonly plannedVsActualQueryService: PlannedVsActualQueryService,
    private readonly staffingRequestService: InMemoryStaffingRequestService,
    private readonly platformSettingsService: PlatformSettingsService,
    private readonly prisma: PrismaService,
  ) {}

  public async execute(query: DeliveryManagerDashboardQuery): Promise<DeliveryManagerDashboardResponseDto> {
    const asOf = query.asOf ? new Date(query.asOf) : new Date();

    if (Number.isNaN(asOf.getTime())) {
      throw new Error('Delivery manager dashboard asOf is invalid.');
    }

    const settings = await this.platformSettingsService.getAll();
    const staffingGapDays = settings.dashboard.staffingGapDaysThreshold;

    const allProjects = await this.projectRepository.findAll();
    const activeProjects = allProjects.filter((project) => project.status === 'ACTIVE');
    const activeProjectIds = new Set(activeProjects.map((project) => project.projectId.value));

    const allAssignments = await this.projectAssignmentRepository.findAll();
    const activeAssignments = allAssignments.filter(
      (assignment) => activeProjectIds.has(assignment.projectId) && assignment.isActiveAt(asOf),
    );

    const comparison = await this.plannedVsActualQueryService.execute({ asOf: asOf.toISOString() });
    const approvedTimeByProject = await this.readApprovedTimeByProject(activeProjectIds, asOf);
    const approvedEntryDatesByProject = await this.readLatestApprovedEntryDatesByProject(activeProjectIds, asOf);

    const assignmentsByProject = new Map<string, typeof activeAssignments>();
    for (const assignment of activeAssignments) {
      const projectAssignments = assignmentsByProject.get(assignment.projectId);
      if (projectAssignments) {
        projectAssignments.push(assignment);
      } else {
        assignmentsByProject.set(assignment.projectId, [assignment]);
      }
    }

    const anomaliesByProject = new Map<string, string[]>();
    for (const projectId of activeProjectIds) {
      anomaliesByProject.set(projectId, []);
    }
    for (const item of comparison.assignedButNoEvidence) {
      if (!activeProjectIds.has(item.project.id)) continue;
      anomaliesByProject.get(item.project.id)?.push('PLANNED_WITHOUT_APPROVED_TIME');
    }
    for (const anomaly of comparison.anomalies) {
      if (!activeProjectIds.has(anomaly.project.id)) continue;
      anomaliesByProject.get(anomaly.project.id)?.push(
        anomaly.type === 'EVIDENCE_AFTER_ASSIGNMENT_END'
          ? 'APPROVED_TIME_AFTER_ASSIGNMENT_END'
          : 'APPROVED_TIME_WITHOUT_ASSIGNMENT',
      );
    }

    const activeProjectMap = new Map(activeProjects.map((project) => [project.projectId.value, project]));
    const staffedProjectIds = new Set(activeAssignments.map((assignment) => assignment.projectId));
    const projectsWithNoStaff = activeProjects.filter(
      (project) => !staffedProjectIds.has(project.projectId.value),
    ).length;
    const projectsWithTimeVariance = [...anomaliesByProject.values()].filter((flags) => flags.length > 0).length;

    const projectsMissingApprovedTime = activeProjects
      .filter((project) => {
        const projectId = project.projectId.value;
        const projectAssignments = assignmentsByProject.get(projectId);
        if (!projectAssignments || projectAssignments.length === 0) {
          return false;
        }
        return !approvedEntryDatesByProject.has(projectId);
      })
      .map((project) => {
        const projectId = project.projectId.value;
        return {
          activeAssignmentCount: (assignmentsByProject.get(projectId) ?? []).length,
          lastApprovedTimeDate: null,
          name: project.name,
          projectCode: project.projectCode,
          projectId,
        };
      });

    const portfolioHealth = activeProjects.map((project) => {
      const projectId = project.projectId.value;
      return {
        anomalyFlags: anomaliesByProject.get(projectId) ?? [],
        approvedHours: Number((approvedTimeByProject.get(projectId)?.hours ?? 0).toFixed(2)),
        name: project.name,
        projectCode: project.projectCode,
        projectId,
        staffingCount: (assignmentsByProject.get(projectId) ?? []).length,
        status: project.status,
      };
    });

    const approvedTimeAfterAssignmentEndCount = comparison.anomalies.filter(
      (item) => activeProjectIds.has(item.project.id) && item.type === 'EVIDENCE_AFTER_ASSIGNMENT_END',
    ).length;

    const timeAlignment = {
      approvedTimeAfterAssignmentEndCount,
      approvedTimeWithoutAssignmentCount: comparison.evidenceButNoApprovedAssignment.filter((item) =>
        activeProjectIds.has(item.project.id),
      ).length,
      matchedCount: comparison.matchedRecords.filter((item) => activeProjectIds.has(item.project.id)).length,
      plannedWithoutApprovedTimeCount: comparison.assignedButNoEvidence.filter((item) =>
        activeProjectIds.has(item.project.id),
      ).length,
    };

    const gapCutoff = new Date(asOf);
    gapCutoff.setUTCDate(gapCutoff.getUTCDate() + staffingGapDays);
    const staffingGaps = allAssignments
      .filter((assignment) => {
        if (!activeProjectIds.has(assignment.projectId)) return false;
        if (!assignment.isActiveAt(asOf)) return false;
        const endDate = assignment.validTo;
        if (!endDate) return false;
        return endDate >= asOf && endDate <= gapCutoff;
      })
      .map((assignment) => {
        const project = activeProjectMap.get(assignment.projectId);
        const endDate = assignment.validTo!;
        const daysUntilEnd = Math.round((endDate.getTime() - asOf.getTime()) / 86400000);
        return {
          assignmentId: assignment.assignmentId.value,
          daysUntilEnd,
          endDate: endDate.toISOString().slice(0, 10),
          personId: assignment.personId,
          projectCode: project?.projectCode ?? assignment.projectId,
          projectId: assignment.projectId,
          projectName: project?.name ?? assignment.projectId,
        };
      })
      .sort((left, right) => left.daysUntilEnd - right.daysUntilEnd);

    const openRequests = await this.staffingRequestService.list({ status: 'OPEN' });
    const requestsByProjectMap = new Map<string, { count: number; required: number; fulfilled: number }>();
    for (const request of openRequests) {
      if (!activeProjectIds.has(request.projectId)) continue;
      const existing = requestsByProjectMap.get(request.projectId) ?? { count: 0, required: 0, fulfilled: 0 };
      existing.count++;
      existing.required += request.headcountRequired;
      existing.fulfilled += request.headcountFulfilled;
      requestsByProjectMap.set(request.projectId, existing);
    }
    const openRequestsByProject = Array.from(requestsByProjectMap.entries()).map(([projectId, data]) => {
      const project = activeProjectMap.get(projectId);
      return {
        openRequestCount: data.count,
        projectCode: project?.projectCode ?? projectId,
        projectId,
        projectName: project?.name ?? projectId,
        totalHeadcountFulfilled: data.fulfilled,
        totalHeadcountRequired: data.required,
      };
    }).sort((left, right) => right.openRequestCount - left.openRequestCount);

    const burnRateTrend = await this.buildBurnRateTrend(asOf, activeProjectIds);

    return {
      asOf: asOf.toISOString(),
      burnRateTrend,
      dataSources: ['projects', 'assignments', 'timesheets', 'planned_vs_actual', 'staffing_requests'],
      openRequestsByProject,
      portfolioHealth,
      projectsMissingApprovedTime,
      staffingGaps,
      summary: {
        projectsMissingApprovedTimeCount: projectsMissingApprovedTime.length,
        projectsWithNoStaff,
        projectsWithTimeVariance,
        totalActiveAssignments: activeAssignments.length,
        totalActiveProjects: activeProjects.length,
      },
      timeAlignment,
    };
  }

  private async readApprovedTimeByProject(
    projectIds: Set<string>,
    asOf: Date,
  ): Promise<Map<string, { entryCount: number; hours: number }>> {
    if (projectIds.size === 0) {
      return new Map();
    }

    const weekStart = this.startOfIsoWeek(asOf);
    const weekEnd = this.endOfIsoWeek(asOf);
    const entries = await this.prisma.timesheetEntry.findMany({
      where: {
        date: { gte: weekStart, lte: weekEnd },
        projectId: { in: [...projectIds] },
        timesheetWeek: { status: 'APPROVED' },
      },
      select: {
        hours: true,
        projectId: true,
      },
    });

    const totals = new Map<string, { entryCount: number; hours: number }>();
    for (const entry of entries) {
      const current = totals.get(entry.projectId) ?? { entryCount: 0, hours: 0 };
      current.entryCount += 1;
      current.hours += Number(entry.hours ?? 0);
      totals.set(entry.projectId, current);
    }

    return totals;
  }

  private async readLatestApprovedEntryDatesByProject(
    projectIds: Set<string>,
    asOf: Date,
  ): Promise<Map<string, string>> {
    if (projectIds.size === 0) {
      return new Map();
    }

    const entries = await this.prisma.timesheetEntry.findMany({
      where: {
        date: { lte: asOf },
        projectId: { in: [...projectIds] },
        timesheetWeek: { status: 'APPROVED' },
      },
      orderBy: { date: 'desc' },
      select: {
        date: true,
        projectId: true,
      },
    });

    const dates = new Map<string, string>();
    for (const entry of entries) {
      if (!dates.has(entry.projectId)) {
        dates.set(entry.projectId, entry.date.toISOString());
      }
    }
    return dates;
  }

  private async buildBurnRateTrend(
    asOf: Date,
    activeProjectIds: Set<string>,
  ): Promise<{ week: string; approvedEntryCount: number; projectCount: number }[]> {
    const weekBoundaries: Array<{ label: string; weekStart: Date; weekEnd: Date }> = [];

    for (let weekOffset = 7; weekOffset >= 0; weekOffset--) {
      const weekStart = this.startOfIsoWeek(new Date(asOf));
      weekStart.setUTCDate(weekStart.getUTCDate() - weekOffset * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

      const jan4 = new Date(Date.UTC(weekStart.getUTCFullYear(), 0, 4));
      const startOfWeek1 = this.startOfIsoWeek(jan4);
      const weekNum = Math.round((weekStart.getTime() - startOfWeek1.getTime()) / (7 * 86400000)) + 1;
      const label = `${weekStart.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;

      weekBoundaries.push({ label, weekStart, weekEnd });
    }

    const entries = await this.prisma.timesheetEntry.findMany({
      where: {
        date: { gte: weekBoundaries[0].weekStart, lte: weekBoundaries[weekBoundaries.length - 1].weekEnd },
        projectId: { in: [...activeProjectIds] },
        timesheetWeek: { status: 'APPROVED' },
      },
      select: {
        date: true,
        projectId: true,
      },
    });

    const weekBuckets: Array<{ entryCount: number; projects: Set<string> }> = weekBoundaries.map(() => ({
      entryCount: 0,
      projects: new Set(),
    }));

    for (const entry of entries) {
      for (let index = 0; index < weekBoundaries.length; index++) {
        if (entry.date >= weekBoundaries[index].weekStart && entry.date < weekBoundaries[index].weekEnd) {
          weekBuckets[index].entryCount += 1;
          weekBuckets[index].projects.add(entry.projectId);
          break;
        }
      }
    }

    return weekBoundaries.map((boundary, index) => ({
      approvedEntryCount: weekBuckets[index].entryCount,
      projectCount: weekBuckets[index].projects.size,
      week: boundary.label,
    }));
  }

  public async getScorecardHistory(query: {
    asOf?: string;
    projectId?: string;
    weeks?: number;
  }): Promise<ProjectScorecardHistoryItemDto[]> {
    const asOf = query.asOf ? new Date(query.asOf) : new Date();
    const weekCount = Math.min(query.weeks ?? 12, 52);

    const allProjects = await this.projectRepository.findAll();
    const activeProjects = allProjects.filter((project) => project.status === 'ACTIVE');
    const targetProjects = query.projectId
      ? activeProjects.filter((project) => project.projectId.value === query.projectId)
      : activeProjects;

    const allAssignments = await this.projectAssignmentRepository.findAll();

    const weekBoundaries: Array<{ weekStart: Date; weekEnd: Date }> = [];
    for (let index = weekCount - 1; index >= 0; index--) {
      const weekStart = this.startOfIsoWeek(new Date(asOf));
      weekStart.setUTCDate(weekStart.getUTCDate() - index * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
      weekBoundaries.push({ weekStart, weekEnd });
    }

    const assignmentsByProject = new Map<string, typeof allAssignments>();
    for (const assignment of allAssignments) {
      const projectAssignments = assignmentsByProject.get(assignment.projectId);
      if (projectAssignments) {
        projectAssignments.push(assignment);
      } else {
        assignmentsByProject.set(assignment.projectId, [assignment]);
      }
    }

    const entries = await this.prisma.timesheetEntry.findMany({
      where: {
        date: { gte: weekBoundaries[0].weekStart, lte: weekBoundaries[weekBoundaries.length - 1].weekEnd },
        projectId: { in: targetProjects.map((project) => project.projectId.value) },
        timesheetWeek: { status: 'APPROVED' },
      },
      select: {
        date: true,
        projectId: true,
      },
    });

    const approvedEntryCountByProjectWeek = new Map<string, number>();
    for (const entry of entries) {
      for (let weekIndex = 0; weekIndex < weekBoundaries.length; weekIndex++) {
        if (entry.date >= weekBoundaries[weekIndex].weekStart && entry.date < weekBoundaries[weekIndex].weekEnd) {
          const key = `${entry.projectId}:${weekIndex}`;
          approvedEntryCountByProjectWeek.set(key, (approvedEntryCountByProjectWeek.get(key) ?? 0) + 1);
          break;
        }
      }
    }

    return targetProjects.map((project) => {
      const projectId = project.projectId.value;
      const projectAssignments = assignmentsByProject.get(projectId) ?? [];

      const history = weekBoundaries.map((boundary, weekIndex) => {
        const hasStaff = projectAssignments.some((assignment) => assignment.isActiveAt(boundary.weekStart));
        const approvedEntryCount = approvedEntryCountByProjectWeek.get(`${projectId}:${weekIndex}`) ?? 0;

        return {
          staffingPct: hasStaff ? 100 : 0,
          timePct: approvedEntryCount > 0 ? Math.min(100, approvedEntryCount * 20) : 0,
          timelinePct: 100,
          weekStart: boundary.weekStart.toISOString().slice(0, 10),
        };
      });

      return { history, projectId, projectName: project.name };
    });
  }

  private startOfIsoWeek(date: Date): Date {
    const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = start.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setUTCDate(start.getUTCDate() + diff);
    start.setUTCHours(0, 0, 0, 0);
    return start;
  }

  private endOfIsoWeek(date: Date): Date {
    const end = this.startOfIsoWeek(date);
    end.setUTCDate(end.getUTCDate() + 6);
    end.setUTCHours(23, 59, 59, 999);
    return end;
  }
}
