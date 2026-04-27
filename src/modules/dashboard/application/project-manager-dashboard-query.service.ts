import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InMemoryProjectAssignmentRepository } from '@src/modules/assignments/infrastructure/repositories/in-memory/in-memory-project-assignment.repository';
import { PersonDirectoryQueryService } from '@src/modules/organization/application/person-directory-query.service';
import { PlatformSettingsService } from '@src/modules/platform-settings/application/platform-settings.service';
import { InMemoryProjectRepository } from '@src/modules/project-registry/infrastructure/repositories/in-memory/in-memory-project.repository';
import { PrismaService } from '@src/shared/persistence/prisma.service';

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
    private readonly plannedVsActualQueryService: PlannedVsActualQueryService,
    private readonly staffingRequestService: InMemoryStaffingRequestService,
    private readonly platformSettingsService: PlatformSettingsService,
    private readonly prisma: PrismaService,
  ) {}

  public async execute(query: ProjectManagerDashboardQuery): Promise<ProjectManagerDashboardResponseDto> {
    const asOf = query.asOf ? new Date(query.asOf) : new Date();

    if (Number.isNaN(asOf.getTime())) {
      throw new BadRequestException('Project manager dashboard asOf is invalid.');
    }

    const settings = await this.platformSettingsService.getAll();
    const nearingClosureDays = settings.dashboard.nearingClosureDaysThreshold;

    const person = await this.personDirectoryQueryService.getPersonById(query.personId, asOf);
    if (!person) {
      throw new NotFoundException('Project manager dashboard person was not found.');
    }

    const dbPeople = await this.prisma.person.findMany({ select: { id: true, displayName: true } });
    const peopleById = new Map(dbPeople.map((dbPerson) => [dbPerson.id, dbPerson]));

    const allProjects = await this.projectRepository.findAll();
    const managedProjects = allProjects
      .filter((project) => project.projectManagerId?.value === query.personId)
      .sort((left, right) => left.projectCode.localeCompare(right.projectCode));
    const managedProjectIds = new Set(managedProjects.map((project) => project.projectId.value));

    const assignments = await this.projectAssignmentRepository.findAll();
    const activeAssignments = assignments.filter(
      (assignment) => managedProjectIds.has(assignment.projectId) && assignment.isActiveAt(asOf),
    );
    const comparison = await this.plannedVsActualQueryService.execute({ asOf: asOf.toISOString() });
    const approvedHoursByProject = await this.readApprovedHoursByProject(managedProjectIds, asOf);

    const assignmentsByProject = new Map<string, typeof activeAssignments>();
    for (const assignment of activeAssignments) {
      const projectAssignments = assignmentsByProject.get(assignment.projectId);
      if (projectAssignments) {
        projectAssignments.push(assignment);
      } else {
        assignmentsByProject.set(assignment.projectId, [assignment]);
      }
    }

    const managedProjectMap = new Map(managedProjects.map((project) => [project.projectId.value, project]));

    const projectsWithStaffingGaps = this.groupProjectAttentionItems([
      ...managedProjects
        .filter((project) => !(assignmentsByProject.get(project.projectId.value)?.length))
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
          detail: 'Approved assignments exist, but no approved time has been submitted in the current reporting week.',
          projectCode: item.project.projectCode,
          projectId: item.project.id,
          projectName: item.project.name,
          reason: 'PLANNED_WITHOUT_APPROVED_TIME',
        })),
    ]);

    const projectsWithTimeVariance = this.groupProjectAttentionItems(
      comparison.anomalies
        .filter((item) => managedProjectIds.has(item.project.id))
        .map((item) => ({
          detail: item.message,
          projectCode: item.project.projectCode,
          projectId: item.project.id,
          projectName: item.project.name,
          reason:
            item.type === 'EVIDENCE_AFTER_ASSIGNMENT_END'
              ? 'APPROVED_TIME_AFTER_ASSIGNMENT_END'
              : 'APPROVED_TIME_WITHOUT_ASSIGNMENT',
        })),
    );

    const managedAssignments = assignments.filter((assignment) => managedProjectIds.has(assignment.projectId));
    const recentlyChangedAssignments = (
      await Promise.all(
        managedAssignments.map(async (assignment) => {
          const history = await this.projectAssignmentRepository.findHistoryByAssignmentId(
            assignment.assignmentId,
          );

          return history.map((item) => ({
            assignmentId: assignment.assignmentId.value,
            changedAt: item.occurredAt.toISOString(),
            changeType: item.changeType,
            personDisplayName:
              peopleById.get(assignment.personId)?.displayName ?? assignment.personId,
            personId: assignment.personId,
            projectId: assignment.projectId,
            projectName:
              managedProjectMap.get(assignment.projectId)?.name ?? assignment.projectId,
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
    ]);

    const allRequests = await this.staffingRequestService.list({ status: 'OPEN' });
    const openRequests = allRequests
      .filter((request) => managedProjectIds.has(request.projectId))
      .map((request) => ({
        headcountFulfilled: request.headcountFulfilled,
        headcountRequired: request.headcountRequired,
        id: request.id,
        priority: request.priority,
        projectId: request.projectId,
        role: request.role,
        startDate: request.startDate,
      }));

    return {
      asOf: asOf.toISOString(),
      attentionProjects,
      dataSources: ['person_directory', 'projects', 'assignments', 'planned_vs_actual', 'timesheets', 'staffing_requests'],
      managedProjects: managedProjects.map((project) => {
        const projectId = project.projectId.value;
        return {
          approvedHours: Number((approvedHoursByProject.get(projectId) ?? 0).toFixed(2)),
          id: projectId,
          name: project.name,
          plannedEndDate: project.endsOn?.toISOString() ?? null,
          plannedStartDate: project.startsOn?.toISOString() ?? null,
          projectCode: project.projectCode,
          staffingCount: (assignmentsByProject.get(projectId) ?? []).length,
          status: project.status,
        };
      }),
      openRequestCount: openRequests.length,
      openRequests,
      person: {
        displayName: person.displayName,
        id: person.id,
        primaryEmail: person.primaryEmail,
      },
      projectsWithStaffingGaps,
      projectsWithTimeVariance,
      recentlyChangedAssignments,
      staffingSummary: {
        activeAssignmentCount: activeAssignments.length,
        managedProjectCount: managedProjects.length,
        projectsWithStaffingGapsCount: projectsWithStaffingGaps.length,
        projectsWithTimeVarianceCount: projectsWithTimeVariance.length,
      },
    };
  }

  private async readApprovedHoursByProject(
    projectIds: Set<string>,
    asOf: Date,
  ): Promise<Map<string, number>> {
    if (projectIds.size === 0) {
      return new Map();
    }

    const windowStart = this.startOfIsoWeek(asOf);
    const windowEnd = this.endOfIsoWeek(asOf);
    const entries = await this.prisma.timesheetEntry.findMany({
      where: {
        date: { gte: windowStart, lte: windowEnd },
        projectId: { in: [...projectIds] },
        timesheetWeek: { status: 'APPROVED' },
      },
      select: {
        hours: true,
        projectId: true,
      },
    });

    const totals = new Map<string, number>();
    for (const entry of entries) {
      totals.set(entry.projectId, (totals.get(entry.projectId) ?? 0) + Number(entry.hours ?? 0));
    }

    return totals;
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

  private isNearingClosure(endsOn: Date | undefined, asOf: Date, thresholdDays: number): boolean {
    if (!endsOn) {
      return false;
    }

    const threshold = new Date(asOf);
    threshold.setUTCDate(threshold.getUTCDate() + thresholdDays);

    return endsOn >= asOf && endsOn <= threshold;
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
