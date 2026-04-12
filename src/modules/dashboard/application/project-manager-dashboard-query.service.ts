import { Injectable } from '@nestjs/common';
import { InMemoryProjectAssignmentRepository } from '@src/modules/assignments/infrastructure/repositories/in-memory/in-memory-project-assignment.repository';
import { PersonDirectoryQueryService } from '@src/modules/organization/application/person-directory-query.service';
import { PlatformSettingsService } from '@src/modules/platform-settings/application/platform-settings.service';
import { InMemoryProjectRepository } from '@src/modules/project-registry/infrastructure/repositories/in-memory/in-memory-project.repository';
import { InMemoryWorkEvidenceRepository } from '@src/modules/work-evidence/infrastructure/repositories/in-memory/in-memory-work-evidence.repository';
import { demoPeople } from '../../../../prisma/seeds/demo-dataset';
import { lifeDemoPeople } from '../../../../prisma/seeds/life-demo-dataset';

const allPeople = [...demoPeople, ...lifeDemoPeople];

import { InMemoryStaffingRequestService } from '@src/modules/staffing-requests/infrastructure/services/in-memory-staffing-request.service';

import { PlannedVsActualQueryService } from './planned-vs-actual-query.service';
import { ProjectManagerDashboardResponseDto } from './contracts/project-manager-dashboard.dto';

interface ProjectManagerDashboardQuery {
  asOf?: string;
  personId: string;
}

@Injectable()
export class ProjectManagerDashboardQueryService {
  public constructor(
    private readonly personDirectoryQueryService: PersonDirectoryQueryService,
    private readonly projectRepository: InMemoryProjectRepository,
    private readonly projectAssignmentRepository: InMemoryProjectAssignmentRepository,
    private readonly workEvidenceRepository: InMemoryWorkEvidenceRepository,
    private readonly plannedVsActualQueryService: PlannedVsActualQueryService,
    private readonly staffingRequestService: InMemoryStaffingRequestService,
    private readonly platformSettingsService: PlatformSettingsService,
  ) {}

  public async execute(query: ProjectManagerDashboardQuery): Promise<ProjectManagerDashboardResponseDto> {
    const asOf = query.asOf ? new Date(query.asOf) : new Date();

    if (Number.isNaN(asOf.getTime())) {
      throw new Error('Project manager dashboard asOf is invalid.');
    }

    const settings = await this.platformSettingsService.getAll();
    const nearingClosureDays = settings.dashboard.nearingClosureDaysThreshold;

    const person = await this.personDirectoryQueryService.getPersonById(query.personId, asOf);
    if (!person) {
      throw new Error('Project manager dashboard person was not found.');
    }

    const allProjects = await this.projectRepository.findAll();
    const managedProjects = allProjects
      .filter((project) => project.projectManagerId?.value === query.personId)
      .sort((left, right) => left.projectCode.localeCompare(right.projectCode));
    const managedProjectIds = new Set(managedProjects.map((project) => project.projectId.value));
    const assignments = await this.projectAssignmentRepository.findAll();
    const activeAssignments = assignments.filter(
      (assignment) =>
        managedProjectIds.has(assignment.projectId) && assignment.isActiveAt(asOf),
    );
    const allEvidence = await this.workEvidenceRepository.list({ dateTo: asOf });
    const managedProjectEvidence = allEvidence.filter(
      (item) => item.projectId && managedProjectIds.has(item.projectId),
    );
    const comparison = await this.plannedVsActualQueryService.execute({ asOf: asOf.toISOString() });

    const projectsWithStaffingGaps = this.groupProjectAttentionItems([
      ...managedProjects
        .filter(
          (project) =>
            !activeAssignments.some(
              (assignment) => assignment.projectId === project.projectId.value,
            ),
        )
        .map((project) => ({
          detail: 'No active staffing assignments are currently covering this project.',
          projectCode: project.projectCode,
          projectId: project.projectId.value,
          projectName: project.name,
          reason: 'NO_ACTIVE_STAFFING',
        })),
      ...comparison.assignedButNoEvidence
        .filter((item) => managedProjectIds.has(item.project.id))
        .map((item) => ({
          detail: 'Assignments exist, but no observed work evidence is currently matching them.',
          projectCode: item.project.projectCode,
          projectId: item.project.id,
          projectName: item.project.name,
          reason: 'ASSIGNED_BUT_NO_EVIDENCE',
        })),
    ]);

    const projectsWithEvidenceAnomalies = this.groupProjectAttentionItems(
      comparison.anomalies
        .filter((item) => managedProjectIds.has(item.project.id))
        .map((item) => ({
          detail: item.message,
          projectCode: item.project.projectCode,
          projectId: item.project.id,
          projectName: item.project.name,
          reason: item.type,
        })),
    );

    const recentlyChangedAssignments = (
      await Promise.all(
        assignments
          .filter((assignment) => managedProjectIds.has(assignment.projectId))
          .map(async (assignment) => {
            const history = await this.projectAssignmentRepository.findHistoryByAssignmentId(
              assignment.assignmentId,
            );

            return history.map((item) => ({
              assignmentId: assignment.assignmentId.value,
              changedAt: item.occurredAt.toISOString(),
              changeType: item.changeType,
              personDisplayName:
                allPeople.find((personRecord) => personRecord.id === assignment.personId)
                  ?.displayName ?? assignment.personId,
              personId: assignment.personId,
              projectId: assignment.projectId,
              projectName:
                managedProjects.find((project) => project.projectId.value === assignment.projectId)
                  ?.name ?? assignment.projectId,
            }));
          }),
      )
    )
      .flat()
      .sort((left, right) => right.changedAt.localeCompare(left.changedAt))
      .slice(0, 5);

    const attentionProjects = this.groupProjectAttentionItems([
      ...managedProjects
        .filter((project) => this.isNearingClosure(project.endsOn, asOf, nearingClosureDays))
        .map((project) => ({
          detail: `Planned end date ${project.endsOn?.toISOString()} is within ${nearingClosureDays} days.`,
          projectCode: project.projectCode,
          projectId: project.projectId.value,
          projectName: project.name,
          reason: 'NEARING_CLOSURE',
        })),
      ...managedProjects
        .filter((project) => this.hasInactiveEvidencePattern(project.projectId.value, activeAssignments, managedProjectEvidence, asOf))
        .map((project) => ({
          detail: 'Active staffing exists but no recent work evidence has been observed in the last 14 days.',
          projectCode: project.projectCode,
          projectId: project.projectId.value,
          projectName: project.name,
          reason: 'INACTIVE_EVIDENCE_PATTERN',
        })),
    ]);

    // Open staffing requests for PM's projects
    const allRequests = await this.staffingRequestService.list({ status: 'OPEN' });
    const openRequests = allRequests
      .filter((r) => managedProjectIds.has(r.projectId))
      .map((r) => ({
        headcountFulfilled: r.headcountFulfilled,
        headcountRequired: r.headcountRequired,
        id: r.id,
        priority: r.priority,
        projectId: r.projectId,
        role: r.role,
        startDate: r.startDate,
      }));

    return {
      asOf: asOf.toISOString(),
      attentionProjects,
      dataSources: ['person_directory', 'projects', 'assignments', 'planned_vs_actual', 'work_evidence', 'staffing_requests'],
      openRequestCount: openRequests.length,
      openRequests,
      managedProjects: managedProjects.map((project) => ({
        evidenceCount: managedProjectEvidence.filter((item) => item.projectId === project.projectId.value).length,
        id: project.projectId.value,
        name: project.name,
        plannedEndDate: project.endsOn?.toISOString() ?? null,
        plannedStartDate: project.startsOn?.toISOString() ?? null,
        projectCode: project.projectCode,
        staffingCount: activeAssignments.filter((assignment) => assignment.projectId === project.projectId.value).length,
        status: project.status,
      })),
      person: {
        displayName: person.displayName,
        id: person.id,
        primaryEmail: person.primaryEmail,
      },
      projectsWithEvidenceAnomalies,
      projectsWithStaffingGaps,
      recentlyChangedAssignments,
      staffingSummary: {
        activeAssignmentCount: activeAssignments.length,
        managedProjectCount: managedProjects.length,
        projectsWithEvidenceAnomaliesCount: projectsWithEvidenceAnomalies.length,
        projectsWithStaffingGapsCount: projectsWithStaffingGaps.length,
      },
    };
  }

  private groupProjectAttentionItems<
    T extends {
      detail: string;
      projectCode: string;
      projectId: string;
      projectName: string;
      reason: string;
    },
  >(items: T[]) {
    return Array.from(
      items.reduce((map, item) => {
        const key = `${item.projectId}:${item.reason}`;
        if (!map.has(key)) {
          map.set(key, item);
        }

        return map;
      }, new Map<string, T>()),
    ).map(([, value]) => value);
  }

  private hasInactiveEvidencePattern(
    projectId: string,
    activeAssignments: Awaited<ReturnType<InMemoryProjectAssignmentRepository['findAll']>>,
    evidence: Awaited<ReturnType<InMemoryWorkEvidenceRepository['list']>>,
    asOf: Date,
  ): boolean {
    const hasActiveStaffing = activeAssignments.some((assignment) => assignment.projectId === projectId);
    if (!hasActiveStaffing) {
      return false;
    }

    const recentEvidenceCutoff = new Date(asOf);
    recentEvidenceCutoff.setUTCDate(recentEvidenceCutoff.getUTCDate() - 14);

    return !evidence.some(
      (item) =>
        item.projectId === projectId &&
        (item.occurredOn ?? item.recordedAt) >= recentEvidenceCutoff,
    );
  }

  private isNearingClosure(endsOn: Date | undefined, asOf: Date, thresholdDays: number): boolean {
    if (!endsOn) {
      return false;
    }

    const threshold = new Date(asOf);
    threshold.setUTCDate(threshold.getUTCDate() + thresholdDays);

    return endsOn >= asOf && endsOn <= threshold;
  }
}
