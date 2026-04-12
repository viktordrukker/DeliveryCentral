import { Injectable } from '@nestjs/common';
import { InMemoryProjectAssignmentRepository } from '@src/modules/assignments/infrastructure/repositories/in-memory/in-memory-project-assignment.repository';
import { PersonDirectoryQueryService } from '@src/modules/organization/application/person-directory-query.service';
import { TeamQueryService } from '@src/modules/organization/application/team-query.service';
import { demoOrgUnits, demoPeople, demoProjects, demoResourcePools } from '../../../../prisma/seeds/demo-dataset';
import { lifeDemoOrgUnits, lifeDemoPeople, lifeDemoProjects, lifeDemoResourcePools } from '../../../../prisma/seeds/life-demo-dataset';

const allOrgUnits = [...demoOrgUnits, ...lifeDemoOrgUnits];
const allPeople = [...demoPeople, ...lifeDemoPeople];
const allProjects = [...demoProjects, ...lifeDemoProjects];
const allResourcePools = [...demoResourcePools, ...lifeDemoResourcePools];

import { InMemoryStaffingRequestService } from '@src/modules/staffing-requests/infrastructure/services/in-memory-staffing-request.service';

import { ResourceManagerDashboardResponseDto } from './contracts/resource-manager-dashboard.dto';

interface ResourceManagerDashboardQuery {
  asOf?: string;
  personId: string;
}

@Injectable()
export class ResourceManagerDashboardQueryService {
  public constructor(
    private readonly personDirectoryQueryService: PersonDirectoryQueryService,
    private readonly teamQueryService: TeamQueryService,
    private readonly projectAssignmentRepository: InMemoryProjectAssignmentRepository,
    private readonly staffingRequestService: InMemoryStaffingRequestService,
  ) {}

  public async execute(query: ResourceManagerDashboardQuery): Promise<ResourceManagerDashboardResponseDto> {
    const asOf = query.asOf ? new Date(query.asOf) : new Date();

    if (Number.isNaN(asOf.getTime())) {
      throw new Error('Resource manager dashboard asOf is invalid.');
    }

    const person = await this.personDirectoryQueryService.getPersonById(query.personId, asOf);
    if (!person) {
      throw new Error('Resource manager dashboard person was not found.');
    }

    const managedTeams = allResourcePools.filter((pool) => {
      const orgUnit = allOrgUnits.find((item) => item.id === pool.orgUnitId);
      return orgUnit?.managerPersonId === query.personId;
    });

    const assignments = await this.projectAssignmentRepository.findAll();
    const teamMembers = await Promise.all(
      managedTeams.map(async (team) => ({
        members: (await this.teamQueryService.getTeamMembersAsOf(team.id, asOf))?.items ?? [],
        team,
      })),
    );

    const allocationIndicators = teamMembers.flatMap(({ members, team }) =>
      members.map((member) => {
        const currentAssignments = assignments.filter(
          (assignment) => assignment.personId === member.id && assignment.isActiveAt(asOf),
        );
        const totalAllocationPercent = currentAssignments.reduce(
          (sum, assignment) => sum + (assignment.allocationPercent?.value ?? 0),
          0,
        );

        return {
          displayName: member.displayName,
          indicator:
            totalAllocationPercent > 100
              ? 'OVERALLOCATED'
              : totalAllocationPercent === 0
                ? 'UNASSIGNED'
                : totalAllocationPercent < 100
                  ? 'UNDERALLOCATED'
                  : 'FULLY_ALLOCATED',
          personId: member.id,
          teamId: team.id,
          teamName: team.name,
          totalAllocationPercent,
        };
      }),
    );

    const peopleWithoutAssignments = allocationIndicators.filter(
      (item) => item.indicator === 'UNASSIGNED',
    );

    const futureAssignmentPipeline = assignments
      .filter((assignment) => {
        if (assignment.validFrom <= asOf) {
          return false;
        }

        return allocationIndicators.some((indicator) => indicator.personId === assignment.personId);
      })
      .sort((left, right) => left.validFrom.getTime() - right.validFrom.getTime())
      .map((assignment) => ({
        approvalState: assignment.status.value,
        assignmentId: assignment.assignmentId.value,
        personDisplayName:
          allPeople.find((personRecord) => personRecord.id === assignment.personId)?.displayName ??
          assignment.personId,
        personId: assignment.personId,
        projectId: assignment.projectId,
        projectName:
          allProjects.find((project) => project.id === assignment.projectId)?.name ??
          assignment.projectId,
        startDate: assignment.validFrom.toISOString(),
      }));

    const pendingAssignmentApprovals = assignments
      .filter(
        (assignment) =>
          assignment.status.value === 'REQUESTED' &&
          allocationIndicators.some((indicator) => indicator.personId === assignment.personId),
      )
      .sort((left, right) => right.requestedAt.getTime() - left.requestedAt.getTime())
      .map((assignment) => ({
        assignmentId: assignment.assignmentId.value,
        personDisplayName:
          allPeople.find((personRecord) => personRecord.id === assignment.personId)?.displayName ??
          assignment.personId,
        personId: assignment.personId,
        projectId: assignment.projectId,
        projectName:
          allProjects.find((project) => project.id === assignment.projectId)?.name ??
          assignment.projectId,
        requestedAt: assignment.requestedAt.toISOString(),
      }));

    const teamCapacitySummary = teamMembers.map(({ members, team }) => {
      const memberIds = new Set(members.map((member) => member.id));
      const activeAssignments = assignments.filter(
        (assignment) => memberIds.has(assignment.personId) && assignment.isActiveAt(asOf),
      );
      const activeProjectIds = [...new Set(activeAssignments.map((assignment) => assignment.projectId))];
      const teamIndicators = allocationIndicators.filter((indicator) => indicator.teamId === team.id);

      return {
        activeAssignmentCount: activeAssignments.length,
        activeProjectCount: activeProjectIds.length,
        memberCount: members.length,
        overallocatedPeopleCount: teamIndicators.filter(
          (indicator) => indicator.indicator === 'OVERALLOCATED',
        ).length,
        teamId: team.id,
        teamName: team.name,
        unassignedPeopleCount: teamIndicators.filter(
          (indicator) => indicator.indicator === 'UNASSIGNED',
        ).length,
        underallocatedPeopleCount: teamIndicators.filter(
          (indicator) => indicator.indicator === 'UNDERALLOCATED',
        ).length,
      };
    });

    const teamsInMultipleActiveProjects = teamCapacitySummary
      .filter((team) => team.activeProjectCount > 1)
      .map((team) => {
        const memberIds = new Set(
          teamMembers.find((item) => item.team.id === team.teamId)?.members.map((member) => member.id) ??
            [],
        );
        const projectNames = [...new Set(
          assignments
            .filter((assignment) => memberIds.has(assignment.personId) && assignment.isActiveAt(asOf))
            .map(
              (assignment) =>
                allProjects.find((project) => project.id === assignment.projectId)?.name ??
                assignment.projectId,
            ),
        )].sort();

        return {
          activeProjectCount: team.activeProjectCount,
          projectNames,
          teamId: team.teamId,
          teamName: team.teamName,
        };
      });

    // Incoming staffing requests (OPEN), ordered by priority weight then startDate
    const PRIORITY_WEIGHT: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    const allOpenRequests = await this.staffingRequestService.list({ status: 'OPEN' });
    const incomingRequests = allOpenRequests
      .sort((a, b) => {
        const pw = (PRIORITY_WEIGHT[a.priority] ?? 9) - (PRIORITY_WEIGHT[b.priority] ?? 9);
        if (pw !== 0) return pw;
        return a.startDate.localeCompare(b.startDate);
      })
      .map((r) => ({
        headcountFulfilled: r.headcountFulfilled,
        headcountRequired: r.headcountRequired,
        id: r.id,
        priority: r.priority,
        projectId: r.projectId,
        role: r.role,
        startDate: r.startDate,
        summary: r.summary ?? null,
      }));

    return {
      allocationIndicators,
      asOf: asOf.toISOString(),
      dataSources: ['person_directory', 'teams', 'assignments', 'staffing_requests'],
      incomingRequests,
      futureAssignmentPipeline,
      pendingAssignmentApprovals,
      peopleWithoutAssignments,
      person: {
        displayName: person.displayName,
        id: person.id,
        primaryEmail: person.primaryEmail,
      },
      summary: {
        futureAssignmentPipelineCount: futureAssignmentPipeline.length,
        managedTeamCount: managedTeams.length,
        pendingAssignmentApprovalCount: pendingAssignmentApprovals.length,
        peopleWithoutAssignmentsCount: peopleWithoutAssignments.length,
        totalManagedPeopleCount: allocationIndicators.length,
      },
      teamCapacitySummary,
      teamsInMultipleActiveProjects,
    };
  }
}
