import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PersonDirectoryQueryService } from '@src/modules/organization/application/person-directory-query.service';
import { TeamQueryService } from '@src/modules/organization/application/team-query.service';
import { loadAllPositionAssignmentViews } from '@src/shared/persistence/position-assignment-view';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { ResourceManagerDashboardResponseDto } from './contracts/resource-manager-dashboard.dto';

interface ResourceManagerDashboardQuery {
  asOf?: string;
  personId: string;
}

// SoT PR 14b — RM dashboard sources active fills + open demand from the
// canonical `ProjectPosition` aggregate.
@Injectable()
export class ResourceManagerDashboardQueryService {
  public constructor(
    private readonly personDirectoryQueryService: PersonDirectoryQueryService,
    private readonly teamQueryService: TeamQueryService,
    private readonly prisma: PrismaService,
  ) {}

  public async execute(query: ResourceManagerDashboardQuery): Promise<ResourceManagerDashboardResponseDto> {
    const asOf = query.asOf ? new Date(query.asOf) : new Date();

    if (Number.isNaN(asOf.getTime())) {
      throw new BadRequestException('Resource manager dashboard asOf is invalid.');
    }

    const person = await this.personDirectoryQueryService.getPersonById(query.personId, asOf);
    if (!person) {
      throw new NotFoundException('Resource manager dashboard person was not found.');
    }

    const [dbPeople, dbProjects, dbOrgUnits, dbResourcePools] = await Promise.all([
      this.prisma.person.findMany({ select: { id: true, displayName: true } }),
      this.prisma.project.findMany({ select: { id: true, name: true } }),
      this.prisma.orgUnit.findMany({ select: { id: true, managerPersonId: true } }),
      this.prisma.resourcePool.findMany({ select: { id: true, name: true, orgUnitId: true } }),
    ]);
    const allPeople = dbPeople;
    const allProjects = dbProjects;

    const orgUnitMap = new Map(dbOrgUnits.map((u) => [u.id, u]));
    const managedTeams = dbResourcePools.filter((pool) => {
      const orgUnit = orgUnitMap.get(pool.orgUnitId ?? '');
      return orgUnit?.managerPersonId === query.personId;
    });

    const assignments = await loadAllPositionAssignmentViews(this.prisma);

    // Precompute Maps for O(1) lookups
    const peopleById = new Map(allPeople.map((p) => [p.id, p]));
    const projectsById = new Map(allProjects.map((p) => [p.id, p]));
    const assignmentsByPerson = new Map<string, typeof assignments>();
    for (const a of assignments) {
      const arr = assignmentsByPerson.get(a.personId);
      if (arr) arr.push(a);
      else assignmentsByPerson.set(a.personId, [a]);
    }

    const teamMembers = await Promise.all(
      managedTeams.map(async (team) => ({
        members: (await this.teamQueryService.getTeamMembersAsOf(team.id, asOf))?.items ?? [],
        team,
      })),
    );

    // F-3.6 / D-120 — exclude the RM themselves from the "people I manage"
    // count. When an RM sits in their own pool (e.g. Sophia in RMO Pool),
    // counting them as a managed/unassigned person made the dashboard
    // claim a 6-person bench against ground truth of 5 deliverable peers.
    const allocationIndicators = teamMembers.flatMap(({ members, team }) =>
      members
        .filter((member) => member.id !== query.personId)
        .map((member) => {
          const currentAssignments = (assignmentsByPerson.get(member.id) ?? []).filter(
            (assignment) => assignment.isActiveAt(asOf),
          );
          const totalAllocationPercent = currentAssignments.reduce(
            (sum, assignment) => sum + assignment.allocationPercent,
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

    const managedPersonIds = new Set(allocationIndicators.map((i) => i.personId));

    const futureAssignmentPipeline = assignments
      .filter((assignment) => assignment.validFrom > asOf && managedPersonIds.has(assignment.personId))
      .sort((left, right) => left.validFrom.getTime() - right.validFrom.getTime())
      .map((assignment) => ({
        approvalState: assignment.status,
        // SoT PR 14b — `assignmentId` field name kept for FE consumers; value
        // is now the canonical ProjectPosition id.
        assignmentId: assignment.id,
        personDisplayName: peopleById.get(assignment.personId)?.displayName ?? assignment.personId,
        personId: assignment.personId,
        projectId: assignment.projectId,
        projectName: projectsById.get(assignment.projectId)?.name ?? assignment.projectId,
        startDate: assignment.validFrom.toISOString(),
      }));

    const pendingAssignmentApprovals = assignments
      .filter(
        (assignment) =>
          assignment.status === 'PROPOSED' && managedPersonIds.has(assignment.personId),
      )
      .sort((left, right) => right.requestedAt.getTime() - left.requestedAt.getTime())
      .map((assignment) => ({
        assignmentId: assignment.id,
        personDisplayName: peopleById.get(assignment.personId)?.displayName ?? assignment.personId,
        personId: assignment.personId,
        projectId: assignment.projectId,
        projectName: projectsById.get(assignment.projectId)?.name ?? assignment.projectId,
        requestedAt: assignment.requestedAt.toISOString(),
      }));

    const teamCapacitySummary = teamMembers.map(({ members, team }) => {
      const deliverableMembers = members.filter((m) => m.id !== query.personId);
      const memberIds = new Set(deliverableMembers.map((member) => member.id));
      const activeAssignments = assignments.filter(
        (assignment) => memberIds.has(assignment.personId) && assignment.isActiveAt(asOf),
      );
      const activeProjectIds = [...new Set(activeAssignments.map((assignment) => assignment.projectId))];
      const teamIndicators = allocationIndicators.filter((indicator) => indicator.teamId === team.id);

      return {
        activeAssignmentCount: activeAssignments.length,
        activeProjectCount: activeProjectIds.length,
        memberCount: deliverableMembers.length,
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

    const teamMemberMap = new Map(teamMembers.map(({ team, members }) => [team.id, members]));

    const teamsInMultipleActiveProjects = teamCapacitySummary
      .filter((team) => team.activeProjectCount > 1)
      .map((team) => {
        const memberIds = new Set(
          (teamMemberMap.get(team.teamId) ?? []).map((member) => member.id),
        );
        const projectNames = [...new Set(
          assignments
            .filter((assignment) => memberIds.has(assignment.personId) && assignment.isActiveAt(asOf))
            .map((assignment) => projectsById.get(assignment.projectId)?.name ?? assignment.projectId),
        )].sort();

        return {
          activeProjectCount: team.activeProjectCount,
          projectNames,
          teamId: team.teamId,
          teamName: team.teamName,
        };
      });

    // SoT PR 14b — incoming open demand sourced from canonical ProjectPosition
    // rows (fillStatus OPEN), ordered by priority weight then startDate. Each
    // position is one headcount: required=1, fulfilled=1 when activePersonId
    // is set (a PROPOSED slate already has a candidate), otherwise 0.
    const PRIORITY_WEIGHT: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    const openPositionRows = await this.prisma.projectPosition.findMany({
      where: { fillStatus: 'OPEN' },
      select: {
        id: true,
        projectId: true,
        role: true,
        priority: true,
        startDate: true,
        summary: true,
        activePersonId: true,
      },
    });
    const incomingRequests = openPositionRows
      .sort((a, b) => {
        const pw = (PRIORITY_WEIGHT[a.priority] ?? 9) - (PRIORITY_WEIGHT[b.priority] ?? 9);
        if (pw !== 0) return pw;
        return a.startDate.getTime() - b.startDate.getTime();
      })
      .map((r) => ({
        headcountFulfilled: r.activePersonId !== null ? 1 : 0,
        headcountRequired: 1,
        id: r.id,
        priority: r.priority,
        projectId: r.projectId,
        role: r.role,
        startDate: r.startDate.toISOString().slice(0, 10),
        summary: r.summary ?? null,
      }));

    return {
      allocationIndicators,
      asOf: asOf.toISOString(),
      dataSources: ['person_directory', 'teams', 'project_positions'],
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
