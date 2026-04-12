import { Injectable } from '@nestjs/common';
import { InMemoryProjectAssignmentRepository } from '@src/modules/assignments/infrastructure/repositories/in-memory/in-memory-project-assignment.repository';
import { InMemoryProjectRepository } from '@src/modules/project-registry/infrastructure/repositories/in-memory/in-memory-project.repository';
import { InMemoryWorkEvidenceRepository } from '@src/modules/work-evidence/infrastructure/repositories/in-memory/in-memory-work-evidence.repository';
import { PlatformSettingsService } from '@src/modules/platform-settings/application/platform-settings.service';

import { InMemoryStaffingRequestService } from '@src/modules/staffing-requests/infrastructure/services/in-memory-staffing-request.service';
import { demoProjects } from '../../../../prisma/seeds/demo-dataset';
import { lifeDemoProjects } from '../../../../prisma/seeds/life-demo-dataset';

const allSeedProjects = [...demoProjects, ...lifeDemoProjects];

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
    private readonly workEvidenceRepository: InMemoryWorkEvidenceRepository,
    private readonly plannedVsActualQueryService: PlannedVsActualQueryService,
    private readonly staffingRequestService: InMemoryStaffingRequestService,
    private readonly platformSettingsService: PlatformSettingsService,
  ) {}

  public async execute(query: DeliveryManagerDashboardQuery): Promise<DeliveryManagerDashboardResponseDto> {
    const asOf = query.asOf ? new Date(query.asOf) : new Date();

    if (Number.isNaN(asOf.getTime())) {
      throw new Error('Delivery manager dashboard asOf is invalid.');
    }

    const settings = await this.platformSettingsService.getAll();
    const staffingGapDays = settings.dashboard.staffingGapDaysThreshold;
    const inactiveDays = settings.dashboard.evidenceInactiveDaysThreshold;

    const allProjects = await this.projectRepository.findAll();
    const activeProjects = allProjects.filter((project) => project.status === 'ACTIVE');
    const activeProjectIds = new Set(activeProjects.map((project) => project.projectId.value));

    const allAssignments = await this.projectAssignmentRepository.findAll();
    const activeAssignments = allAssignments.filter(
      (assignment) => activeProjectIds.has(assignment.projectId) && assignment.isActiveAt(asOf),
    );

    const allEvidence = await this.workEvidenceRepository.list({ dateTo: asOf });
    const activeProjectEvidence = allEvidence.filter(
      (item) => item.projectId && activeProjectIds.has(item.projectId),
    );

    const comparison = await this.plannedVsActualQueryService.execute({ asOf: asOf.toISOString() });

    // Projects with no active staffing
    const staffedProjectIds = new Set(
      activeAssignments.map((assignment) => assignment.projectId),
    );
    const projectsWithNoStaff = activeProjects.filter(
      (project) => !staffedProjectIds.has(project.projectId.value),
    ).length;

    // Projects with evidence anomalies (from planned-vs-actual comparison)
    const anomalyProjectIds = new Set(
      comparison.anomalies
        .filter((anomaly) => activeProjectIds.has(anomaly.project.id))
        .map((anomaly) => anomaly.project.id),
    );
    const projectsWithEvidenceAnomalies = anomalyProjectIds.size;

    // Inactive evidence: active project, has active staffing, no evidence in last N days
    const recentEvidenceCutoff = new Date(asOf);
    recentEvidenceCutoff.setUTCDate(recentEvidenceCutoff.getUTCDate() - inactiveDays);

    const inactiveEvidenceProjects = activeProjects
      .filter((project) => {
        const projectId = project.projectId.value;
        const hasActiveStaffing = activeAssignments.some(
          (assignment) => assignment.projectId === projectId,
        );

        if (!hasActiveStaffing) {
          return false;
        }

        const hasRecentEvidence = activeProjectEvidence.some(
          (item) =>
            item.projectId === projectId &&
            (item.occurredOn ?? item.recordedAt) >= recentEvidenceCutoff,
        );

        return !hasRecentEvidence;
      })
      .map((project) => {
        const projectEvidence = activeProjectEvidence.filter(
          (item) => item.projectId === project.projectId.value,
        );
        const latestEvidence = projectEvidence
          .map((item) => item.occurredOn ?? item.recordedAt)
          .sort((left, right) => right.getTime() - left.getTime())[0];

        return {
          activeAssignmentCount: activeAssignments.filter(
            (assignment) => assignment.projectId === project.projectId.value,
          ).length,
          lastEvidenceDate: latestEvidence?.toISOString() ?? null,
          name: project.name,
          projectCode: project.projectCode,
          projectId: project.projectId.value,
        };
      });

    // Portfolio health table — one row per active project
    const portfolioHealth = activeProjects.map((project) => {
      const projectId = project.projectId.value;
      const staffingCount = activeAssignments.filter(
        (assignment) => assignment.projectId === projectId,
      ).length;
      const evidenceCount = activeProjectEvidence.filter(
        (item) => item.projectId === projectId,
      ).length;
      const anomalyFlags = comparison.anomalies
        .filter((anomaly) => anomaly.project.id === projectId)
        .map((anomaly) => anomaly.type);

      return {
        anomalyFlags,
        evidenceCount,
        name: project.name,
        projectCode: project.projectCode,
        projectId,
        staffingCount,
        status: project.status,
      };
    });

    // Reconciliation block (cross-portfolio, no filter)
    const reconciliation = {
      assignedButNoEvidenceCount: comparison.assignedButNoEvidence.filter((item) =>
        activeProjectIds.has(item.project.id),
      ).length,
      evidenceWithoutAssignmentCount: comparison.evidenceButNoApprovedAssignment.filter((item) =>
        activeProjectIds.has(item.project.id),
      ).length,
      matchedCount: comparison.matchedRecords.filter((item) =>
        activeProjectIds.has(item.project.id),
      ).length,
    };

    // Staffing gaps: active assignments ending within N days (13-B13)
    const gapCutoff = new Date(asOf);
    gapCutoff.setUTCDate(gapCutoff.getUTCDate() + staffingGapDays);
    const staffingGaps = allAssignments
      .filter((a) => {
        if (!activeProjectIds.has(a.projectId)) return false;
        if (!a.isActiveAt(asOf)) return false;
        const endDate = a.validTo;
        if (!endDate) return false;
        return endDate >= asOf && endDate <= gapCutoff;
      })
      .map((a) => {
        const project = activeProjects.find((p) => p.projectId.value === a.projectId);
        const seedProject = allSeedProjects.find((p) => p.id === a.projectId);
        const endDate = a.validTo!;
        const daysUntilEnd = Math.round((endDate.getTime() - asOf.getTime()) / 86400000);
        return {
          assignmentId: a.assignmentId.value,
          daysUntilEnd,
          endDate: endDate.toISOString().slice(0, 10),
          personId: a.personId,
          projectCode: project?.projectCode ?? seedProject?.projectCode ?? a.projectId,
          projectId: a.projectId,
          projectName: project?.name ?? seedProject?.name ?? a.projectId,
        };
      })
      .sort((a, b) => a.daysUntilEnd - b.daysUntilEnd);

    // Open requests by project rollup (13-B14)
    const openRequests = await this.staffingRequestService.list({ status: 'OPEN' });
    const requestsByProjectMap = new Map<string, { count: number; required: number; fulfilled: number }>();
    for (const req of openRequests) {
      if (!activeProjectIds.has(req.projectId)) continue;
      const existing = requestsByProjectMap.get(req.projectId) ?? { count: 0, required: 0, fulfilled: 0 };
      existing.count++;
      existing.required += req.headcountRequired;
      existing.fulfilled += req.headcountFulfilled;
      requestsByProjectMap.set(req.projectId, existing);
    }
    const openRequestsByProject = Array.from(requestsByProjectMap.entries()).map(([projectId, data]) => {
      const project = activeProjects.find((p) => p.projectId.value === projectId);
      const seedProject = allSeedProjects.find((p) => p.id === projectId);
      return {
        openRequestCount: data.count,
        projectCode: project?.projectCode ?? seedProject?.projectCode ?? projectId,
        projectId,
        projectName: project?.name ?? seedProject?.name ?? projectId,
        totalHeadcountFulfilled: data.fulfilled,
        totalHeadcountRequired: data.required,
      };
    }).sort((a, b) => b.openRequestCount - a.openRequestCount);

    // Burn rate trend: evidence entries grouped by ISO week for last 8 weeks
    const burnRateTrend: { week: string; evidenceCount: number; projectCount: number }[] = [];
    for (let weekOffset = 7; weekOffset >= 0; weekOffset--) {
      const weekStart = new Date(asOf);
      // Go to Monday of current week then subtract weekOffset weeks
      const dayOfWeek = weekStart.getUTCDay(); // 0=Sun
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      weekStart.setUTCDate(weekStart.getUTCDate() - daysToMonday - weekOffset * 7);
      weekStart.setUTCHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

      // ISO week label: YYYY-Www
      const jan4 = new Date(Date.UTC(weekStart.getUTCFullYear(), 0, 4));
      const startOfWeek1 = new Date(jan4);
      startOfWeek1.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7));
      const weekNum = Math.round((weekStart.getTime() - startOfWeek1.getTime()) / (7 * 86400000)) + 1;
      const weekLabel = `${weekStart.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;

      const weekEvidence = allEvidence.filter((item) => {
        const d = item.occurredOn ?? item.recordedAt;
        return d >= weekStart && d < weekEnd;
      });

      const projectsThisWeek = new Set(weekEvidence.map((item) => item.projectId).filter(Boolean));
      burnRateTrend.push({ week: weekLabel, evidenceCount: weekEvidence.length, projectCount: projectsThisWeek.size });
    }

    return {
      asOf: asOf.toISOString(),
      burnRateTrend,
      dataSources: ['projects', 'assignments', 'work_evidence', 'planned_vs_actual', 'staffing_requests'],
      inactiveEvidenceProjects,
      openRequestsByProject,
      portfolioHealth,
      reconciliation,
      staffingGaps,
      summary: {
        inactiveEvidenceProjectCount: inactiveEvidenceProjects.length,
        projectsWithEvidenceAnomalies,
        projectsWithNoStaff,
        totalActiveAssignments: activeAssignments.length,
        totalActiveProjects: activeProjects.length,
      },
    };
  }

  public async getScorecardHistory(query: {
    asOf?: string;
    projectId?: string;
    weeks?: number;
  }): Promise<ProjectScorecardHistoryItemDto[]> {
    const asOf = query.asOf ? new Date(query.asOf) : new Date();
    const weekCount = Math.min(query.weeks ?? 12, 52);

    const allProjects = await this.projectRepository.findAll();
    const activeProjects = allProjects.filter((p) => p.status === 'ACTIVE');
    const targetProjects = query.projectId
      ? activeProjects.filter((p) => p.projectId.value === query.projectId)
      : activeProjects;

    const allAssignments = await this.projectAssignmentRepository.findAll();
    const allEvidence = await this.workEvidenceRepository.list({ dateTo: asOf });

    const results: ProjectScorecardHistoryItemDto[] = targetProjects.map((project) => {
      const projectId = project.projectId.value;
      const history: { weekStart: string; staffingPct: number; evidencePct: number; timelinePct: number }[] = [];

      for (let i = weekCount - 1; i >= 0; i--) {
        const weekStart = new Date(asOf);
        const dayOfWeek = weekStart.getUTCDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        weekStart.setUTCDate(weekStart.getUTCDate() - daysToMonday - i * 7);
        weekStart.setUTCHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

        const hasStaff = allAssignments.some(
          (a) => a.projectId === projectId && a.isActiveAt(weekStart),
        );
        const weekEvidenceCount = allEvidence.filter((e) => {
          if (e.projectId !== projectId) return false;
          const d = e.occurredOn ?? e.recordedAt;
          return d >= weekStart && d < weekEnd;
        }).length;

        history.push({
          weekStart: weekStart.toISOString().slice(0, 10),
          staffingPct: hasStaff ? 100 : 0,
          evidencePct: weekEvidenceCount > 0 ? Math.min(100, weekEvidenceCount * 20) : 0,
          timelinePct: 100,
        });
      }

      return { history, projectId, projectName: project.name };
    });

    return results;
  }
}
