import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { CreateProjectAssignmentService } from '@src/modules/assignments/application/create-project-assignment.service';
import { ProjectAssignmentRepositoryPort } from '@src/modules/assignments/domain/repositories/project-assignment-repository.port';
import { OrgUnitRepositoryPort } from '@src/modules/organization/domain/repositories/org-unit-repository.port';
import { PersonOrgMembershipRepositoryPort } from '@src/modules/organization/domain/repositories/person-org-membership-repository.port';
import { PersonRepositoryPort } from '@src/modules/organization/domain/repositories/person-repository.port';
import { OrgUnitId } from '@src/modules/organization/domain/value-objects/org-unit-id';
import { PersonId } from '@src/modules/organization/domain/value-objects/person-id';

import { ProjectRepositoryPort } from '../domain/repositories/project-repository.port';
import { ProjectId } from '../domain/value-objects/project-id';
import { ProjectLifecycleConflictError } from './project-lifecycle-conflict.error';

interface AssignProjectTeamCommand {
  actorId: string;
  allocationPercent: number;
  endDate?: string;
  expectedProjectVersion?: number;
  note?: string;
  projectId: string;
  staffingRole: string;
  startDate: string;
  teamOrgUnitId: string;
}

interface TeamAssignmentCreatedItem {
  assignmentId: string;
  personId: string;
  personName: string;
}

interface TeamAssignmentSkippedItem {
  personId: string;
  personName: string;
  reason: string;
}

export interface AssignProjectTeamResult {
  allocationPercent: number;
  createdAssignments: TeamAssignmentCreatedItem[];
  endDate?: string;
  projectId: string;
  skippedDuplicates: TeamAssignmentSkippedItem[];
  staffingRole: string;
  startDate: string;
  teamName: string;
  teamOrgUnitId: string;
}

const DUPLICATE_ASSIGNMENT_REASON =
  'Overlapping assignment for the same person and project already exists.';

@Injectable()
export class AssignProjectTeamService {
  public constructor(
    private readonly projectRepository: ProjectRepositoryPort,
    private readonly orgUnitRepository: OrgUnitRepositoryPort,
    private readonly personRepository: PersonRepositoryPort,
    private readonly personOrgMembershipRepository: PersonOrgMembershipRepositoryPort,
    private readonly projectAssignmentRepository: ProjectAssignmentRepositoryPort,
    private readonly createProjectAssignmentService: CreateProjectAssignmentService,
    private readonly auditLogger?: AuditLoggerService,
  ) {}

  public async execute(command: AssignProjectTeamCommand): Promise<AssignProjectTeamResult> {
    const project = await this.projectRepository.findById(command.projectId);
    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    if (command.expectedProjectVersion !== undefined && project.version !== command.expectedProjectVersion) {
      throw new ProjectLifecycleConflictError();
    }

    if (project.status !== 'ACTIVE') {
      throw new ConflictException('Team assignments can only be created for ACTIVE projects.');
    }

    const teamOrgUnit = await this.orgUnitRepository.findByOrgUnitId(
      OrgUnitId.from(command.teamOrgUnitId),
    );
    if (!teamOrgUnit) {
      throw new NotFoundException('Team org unit does not exist.');
    }

    const startDate = new Date(command.startDate);
    const endDate = command.endDate ? new Date(command.endDate) : undefined;

    if (Number.isNaN(startDate.getTime())) {
      throw new BadRequestException('Assignment start date is invalid.');
    }

    if (endDate && Number.isNaN(endDate.getTime())) {
      throw new BadRequestException('Assignment end date is invalid.');
    }

    if (endDate && endDate < startDate) {
      throw new BadRequestException('Assignment end date must be on or after the start date.');
    }

    const activeMemberships = await this.personOrgMembershipRepository.findActiveByOrgUnit(
      teamOrgUnit.orgUnitId,
      startDate,
    );

    const teamMembers = await this.resolveEligibleTeamMembers(activeMemberships);
    if (teamMembers.length === 0) {
      throw new ConflictException('Team has no active primary members for the requested start date.');
    }

    const skippedDuplicates: TeamAssignmentSkippedItem[] = [];
    const membersToCreate: Array<{ personId: string; personName: string }> = [];

    for (const member of teamMembers) {
      const overlaps = await this.projectAssignmentRepository.findOverlappingByPersonAndProject(
        member.personId,
        command.projectId,
        startDate,
        endDate,
      );

      if (overlaps.length > 0) {
        skippedDuplicates.push({
          personId: member.personId,
          personName: member.personName,
          reason: DUPLICATE_ASSIGNMENT_REASON,
        });
        continue;
      }

      membersToCreate.push(member);
    }

    const createdAssignments: TeamAssignmentCreatedItem[] = [];

    for (const member of membersToCreate) {
      const currentProject = await this.projectRepository.assertCurrentVersion(
        ProjectId.from(command.projectId),
        project.version,
      );
      if (currentProject.status !== 'ACTIVE') {
        throw new ProjectLifecycleConflictError(
          'Project lifecycle changed during team assignment. Refresh and try again.',
        );
      }

      const assignment = await this.createProjectAssignmentService.execute({
        actorId: command.actorId,
        allocationPercent: command.allocationPercent,
        endDate: command.endDate,
        note: command.note,
        personId: member.personId,
        projectId: command.projectId,
        projectValidated: true,
        personValidated: true,
        staffingRole: command.staffingRole,
        startDate: command.startDate,
      });

      createdAssignments.push({
        assignmentId: assignment.assignmentId.value,
        personId: member.personId,
        personName: member.personName,
      });
    }

    this.auditLogger?.record({
      actionType: 'team.members_changed',
      actorId: command.actorId,
      category: 'team',
      changeSummary: `Team ${teamOrgUnit.name} expanded into assignments for project ${command.projectId}.`,
      details: {
        createdCount: createdAssignments.length,
        projectId: command.projectId,
        skippedCount: skippedDuplicates.length,
      },
      metadata: {
        createdAssignments,
        projectId: command.projectId,
        skippedDuplicates,
        teamOrgUnitId: command.teamOrgUnitId,
      },
      targetEntityId: command.teamOrgUnitId,
      targetEntityType: 'TEAM',
    });

    return {
      allocationPercent: command.allocationPercent,
      createdAssignments,
      endDate: command.endDate,
      projectId: command.projectId,
      skippedDuplicates,
      staffingRole: command.staffingRole,
      startDate: command.startDate,
      teamName: teamOrgUnit.name,
      teamOrgUnitId: command.teamOrgUnitId,
    };
  }

  private async resolveEligibleTeamMembers(
    activeMemberships: Awaited<ReturnType<PersonOrgMembershipRepositoryPort['findActiveByOrgUnit']>>,
  ): Promise<Array<{ personId: string; personName: string }>> {
    const uniquePrimaryMemberIds = [
      ...new Set(
        activeMemberships
          .filter((membership) => membership.isPrimary)
          .map((membership) => membership.personId.value),
      ),
    ].sort();

    const members: Array<{ personId: string; personName: string }> = [];

    for (const personId of uniquePrimaryMemberIds) {
      const person = await this.personRepository.findByPersonId(PersonId.from(personId));
      if (!person || person.status !== 'ACTIVE') {
        continue;
      }

      members.push({
        personId,
        personName: person.displayName,
      });
    }

    return members;
  }
}
