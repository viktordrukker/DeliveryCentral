import { Injectable, NotFoundException } from '@nestjs/common';

import {
  InMemoryProjectAssignmentRepository,
} from '@src/modules/assignments/infrastructure/repositories/in-memory/in-memory-project-assignment.repository';
import { InMemoryProjectRepository } from '@src/modules/project-registry/infrastructure/repositories/in-memory/in-memory-project.repository';
import { InMemoryWorkEvidenceRepository } from '@src/modules/work-evidence/infrastructure/repositories/in-memory/in-memory-work-evidence.repository';
import { AppConfig } from '@src/shared/config/app-config';
import { OrgUnitRepositoryPort } from '../domain/repositories/org-unit-repository.port';
import {
  TeamDashboardDto,
  TeamListResponseDto,
  TeamMemberDto,
  TeamMembersResponseDto,
  TeamSummaryDto,
} from './contracts/team.dto';
import { PersonDirectoryQueryService } from './person-directory-query.service';
import { InMemoryTeamStore, getDefaultInMemoryTeamStore } from './in-memory-team.store';
import { TeamStorePort } from './team-store.port';

@Injectable()
export class TeamQueryService {
  public constructor(
    private readonly personDirectoryQueryService: PersonDirectoryQueryService,
    private readonly teamStore: TeamStorePort = getDefaultInMemoryTeamStore(),
    private readonly orgUnitRepository?: OrgUnitRepositoryPort,
    private readonly projectAssignmentRepository?: InMemoryProjectAssignmentRepository,
    private readonly projectRepository?: InMemoryProjectRepository,
    private readonly workEvidenceRepository?: InMemoryWorkEvidenceRepository,
    private readonly appConfig?: AppConfig,
  ) {}

  public async listTeams(): Promise<TeamListResponseDto> {
    const teams = await this.teamStore.getTeams();

    return {
      items: await Promise.all(teams.map((pool) => this.getTeamSummary(pool.id))),
    };
  }

  public async getTeam(id: string): Promise<TeamSummaryDto | null> {
    const exists = (await this.teamStore.getTeams()).some((pool) => pool.id === id);
    if (!exists) {
      return null;
    }

    return this.getTeamSummary(id);
  }

  public async getTeamMembers(id: string): Promise<TeamMembersResponseDto | null> {
    return this.getTeamMembersAsOf(id, new Date());
  }

  public async getTeamMembersAsOf(
    id: string,
    asOf: Date,
  ): Promise<TeamMembersResponseDto | null> {
    const team = await this.getTeam(id);
    if (!team) {
      return null;
    }

    const directory = await this.personDirectoryQueryService.listPeople(
      {
        page: 1,
        pageSize: Number.MAX_SAFE_INTEGER,
        resourcePoolId: id,
      },
      asOf,
    );

    return {
      items: directory.items.map<TeamMemberDto>((item) => ({
        currentAssignmentCount: item.currentAssignmentCount,
        currentOrgUnitName: item.currentOrgUnit?.name ?? null,
        displayName: item.displayName,
        id: item.id,
        primaryEmail: item.primaryEmail,
      })),
    };
  }

  public async getTeamDashboard(id: string, asOf: Date = new Date()): Promise<TeamDashboardDto | null> {
    const team = await this.getTeam(id);
    const members = await this.getTeamMembersAsOf(id, asOf);

    if (!team || !members) {
      return null;
    }

    const memberIds = members.items.map((item) => item.id);
    const assignments = await this.projectAssignmentRepository?.findAll();
    const projects = await this.projectRepository?.findAll();
    const workEvidence = await this.workEvidenceRepository?.list({ dateTo: asOf });

    const allAssignmentsForMembers =
      assignments?.filter((assignment) => memberIds.includes(assignment.personId)) ?? [];
    const activeAssignments =
      assignments?.filter(
        (assignment) => memberIds.includes(assignment.personId) && assignment.isActiveAt(asOf),
      ) ?? [];

    const projectsById = new Map((projects ?? []).map((project) => [project.id, project]));
    const projectsInvolved = Array.from(new Set(activeAssignments.map((item) => item.projectId)))
      .map((projectId) => projectsById.get(projectId))
      .filter(Boolean)
      .map((project) => ({
        id: project!.id,
        name: project!.name,
      }));
    const activeProjectIdsByMember = new Map<string, Set<string>>();

    for (const assignment of activeAssignments) {
      const projectIdsForMember =
        activeProjectIdsByMember.get(assignment.personId) ?? new Set<string>();
      projectIdsForMember.add(assignment.projectId);
      activeProjectIdsByMember.set(assignment.personId, projectIdsForMember);
    }

    const membersById = new Map(members.items.map((member) => [member.id, member]));
    const membersOnMultipleProjects = Array.from(activeProjectIdsByMember.entries())
      .filter(([, activeProjectIds]) => activeProjectIds.size > 1)
      .map(([personId, activeProjectIds]) => ({
        activeProjectCount: activeProjectIds.size,
        displayName: membersById.get(personId)?.displayName ?? personId,
        id: personId,
      }))
      .sort((left, right) => right.activeProjectCount - left.activeProjectCount);
    const assignmentWithoutEvidence = activeAssignments.filter(
      (assignment) =>
        !(workEvidence ?? []).some(
          (item) => item.personId === assignment.personId && item.projectId === assignment.projectId,
        ),
    );
    const evidenceWithoutAssignment = (workEvidence ?? []).filter(
      (evidence) =>
        evidence.personId &&
        memberIds.includes(evidence.personId) &&
        evidence.projectId &&
        !activeAssignments.some(
          (assignment) =>
            assignment.personId === evidence.personId && assignment.projectId === evidence.projectId,
        ),
    );
    const evidenceAfterAssignmentEnd = (workEvidence ?? []).filter((evidence) => {
      if (!evidence.personId || !memberIds.includes(evidence.personId) || !evidence.projectId) {
        return false;
      }

      return allAssignmentsForMembers.some(
        (assignment) =>
          assignment.personId === evidence.personId &&
          assignment.projectId === evidence.projectId &&
          Boolean(assignment.validTo && evidence.recordedAt > assignment.validTo),
      );
    });
    const staleApprovalCount = allAssignmentsForMembers.filter(
      (assignment) =>
        assignment.status.value === 'PROPOSED' &&
        this.isOlderThanConfiguredThreshold(assignment.requestedAt, asOf),
    ).length;
    const projectClosureConflictCount = projectsInvolved.filter((project) => {
      const persistedProject = projectsById.get(project.id);
      return persistedProject?.status === 'CLOSED';
    }).length;
    const peopleWithEvidenceAlignmentGaps = Array.from(
      new Set(
        [...evidenceWithoutAssignment, ...evidenceAfterAssignmentEnd]
          .map((item) => item.personId)
          .filter((personId): personId is string => Boolean(personId)),
      ),
    )
      .map((personId) => membersById.get(personId))
      .filter((member): member is TeamMemberDto => Boolean(member));
    const openExceptionCount =
      assignmentWithoutEvidence.length +
      evidenceWithoutAssignment.length +
      evidenceAfterAssignmentEnd.length +
      staleApprovalCount +
      projectClosureConflictCount;

    return {
      activeAssignmentsCount: activeAssignments.length,
      anomalySummary: {
        assignmentWithoutEvidenceCount: assignmentWithoutEvidence.length,
        evidenceAfterAssignmentEndCount: evidenceAfterAssignmentEnd.length,
        evidenceWithoutAssignmentCount: evidenceWithoutAssignment.length,
        openExceptionCount,
        projectClosureConflictCount,
        staleApprovalCount,
      },
      crossProjectSpread: {
        maxProjectsPerMember:
          membersOnMultipleProjects.length > 0
            ? Math.max(...membersOnMultipleProjects.map((member) => member.activeProjectCount))
            : 0,
        membersOnMultipleProjects,
        membersOnMultipleProjectsCount: membersOnMultipleProjects.length,
      },
      peopleWithNoAssignments: members.items.filter((item) => item.currentAssignmentCount === 0),
      peopleWithEvidenceAlignmentGaps,
      projectCount: projectsInvolved.length,
      projectsInvolved,
      team,
      teamMemberCount: members.items.length,
    };
  }

  private isOlderThanConfiguredThreshold(requestedAt: Date, asOf: Date): boolean {
    const staleApprovalDays = this.appConfig?.exceptionsStaleApprovalDays ?? 14;
    const thresholdMs = staleApprovalDays * 24 * 60 * 60 * 1000;
    return asOf.getTime() - requestedAt.getTime() >= thresholdMs;
  }

  private async getTeamSummary(id: string): Promise<TeamSummaryDto> {
    const pool = (await this.teamStore.getTeams()).find((item) => item.id === id);
    if (!pool) {
      throw new NotFoundException('Team not found.');
    }

    const asOf = new Date();
    const activeMemberships = (await this.teamStore.getMemberships()).filter(
      (membership) =>
        membership.resourcePoolId === id &&
        membership.validFrom <= asOf &&
        (!('validTo' in membership) || !membership.validTo || membership.validTo >= asOf),
    );
    const persistedOrgUnit =
      pool.orgUnitId && this.orgUnitRepository
        ? await this.orgUnitRepository.findById(pool.orgUnitId)
        : null;

    return {
      code: pool.code,
      description: pool.description ?? null,
      id: pool.id,
      memberCount: activeMemberships.length,
      name: pool.name,
      orgUnit: persistedOrgUnit
        ? {
            code: persistedOrgUnit.code,
            id: persistedOrgUnit.orgUnitId.value,
            name: persistedOrgUnit.name,
          }
        : null,
    };
  }
}
