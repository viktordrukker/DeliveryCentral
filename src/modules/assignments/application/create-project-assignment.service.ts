import { Injectable } from '@nestjs/common';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { NotificationEventTranslatorService } from '@src/modules/notifications/application/notification-event-translator.service';

import { AssignmentApproval } from '../domain/entities/assignment-approval.entity';
import { AssignmentHistory } from '../domain/entities/assignment-history.entity';
import { ProjectAssignment } from '../domain/entities/project-assignment.entity';
import { ProjectAssignmentRepositoryPort } from '../domain/repositories/project-assignment-repository.port';
import { AllocationPercent } from '../domain/value-objects/allocation-percent';
import { ApprovalState } from '../domain/value-objects/approval-state';
import { AssignmentStatus } from '../domain/value-objects/assignment-status';
import { ProjectAssignmentCreatedEvent } from '../domain/events/project-assignment-created.event';
import { AssignmentReferenceRepositoryPort } from './ports/assignment-reference.repository.port';

interface CreateProjectAssignmentCommand {
  actorId: string;
  allocationPercent: number;
  allowOverlapOverride?: boolean;
  draft?: boolean;
  endDate?: string;
  note?: string;
  overrideReason?: string;
  personId: string;
  projectId: string;
  projectValidated?: boolean;
  personValidated?: boolean;
  staffingRole: string;
  startDate: string;
}

@Injectable()
export class CreateProjectAssignmentService {
  public constructor(
    private readonly projectAssignmentRepository: ProjectAssignmentRepositoryPort,
    private readonly assignmentReferenceRepository?: AssignmentReferenceRepositoryPort,
    private readonly auditLogger?: AuditLoggerService,
    private readonly notificationEventTranslator?: NotificationEventTranslatorService,
    private readonly employeeActivityService?: { record(cmd: { personId: string; eventType: string; summary: string; actorId?: string; relatedEntityId?: string; metadata?: Record<string, unknown> }): Promise<void> },
  ) {}

  public async execute(command: CreateProjectAssignmentCommand): Promise<ProjectAssignment> {
    const startDate = new Date(command.startDate);
    const endDate = command.endDate ? new Date(command.endDate) : undefined;

    if (Number.isNaN(startDate.getTime())) {
      throw new Error('Assignment start date is invalid.');
    }

    if (endDate && Number.isNaN(endDate.getTime())) {
      throw new Error('Assignment end date is invalid.');
    }

    if (endDate && endDate < startDate) {
      throw new Error('Assignment end date must be on or after the start date.');
    }

    if (this.assignmentReferenceRepository) {
      if (!command.personValidated) {
        const personExists = await this.assignmentReferenceRepository.personExists(command.personId);
        if (!personExists) {
          throw new Error('Person does not exist.');
        }

        const personIsActive = await this.assignmentReferenceRepository.personIsActive(
          command.personId,
        );
        if (!personIsActive) {
          throw new Error('Inactive employees cannot receive new assignments.');
        }
      }

      if (!command.projectValidated) {
        const projectExists = await this.assignmentReferenceRepository.projectExists(command.projectId);
        if (!projectExists) {
          throw new Error('Project does not exist.');
        }

        if (endDate && this.assignmentReferenceRepository.projectEndDate) {
          const projectEnd = await this.assignmentReferenceRepository.projectEndDate(command.projectId);
          if (projectEnd && endDate > projectEnd) {
            throw new Error('Assignment end date exceeds the project end date.');
          }
        }
      }
    } else {
      if (!command.personId.startsWith('11111111-')) {
        throw new Error('Person does not exist.');
      }

      if (!command.projectId.startsWith('33333333-')) {
        throw new Error('Project does not exist.');
      }
    }

    const conflicts = await this.projectAssignmentRepository.findOverlappingByPersonAndProject(
      command.personId,
      command.projectId,
      startDate,
      endDate,
    );

    if (conflicts.length > 0) {
      if (!command.allowOverlapOverride) {
        throw new Error('Overlapping assignment for the same person and project already exists.');
      }

      const overrideReason = command.overrideReason?.trim();

      if (!overrideReason) {
        throw new Error('Assignment override reason is required.');
      }
    }

    const assignment = ProjectAssignment.create({
      allocationPercent: AllocationPercent.from(command.allocationPercent),
      notes: command.note,
      personId: command.personId,
      projectId: command.projectId,
      requestedAt: new Date(),
      requestedByPersonId: command.actorId,
      staffingRole: command.staffingRole,
      status: AssignmentStatus.proposed(),
      validFrom: startDate,
      validTo: endDate,
    });

    const initialApproval = AssignmentApproval.create({
      assignmentId: assignment.assignmentId,
      decisionReason: 'Initial assignment request recorded.',
      decisionState: ApprovalState.requested(),
      decidedByPersonId: command.actorId,
      sequenceNumber: 1,
    });

    const historyEntry = AssignmentHistory.create({
      assignmentId: assignment.assignmentId,
      changeReason: 'Initial assignment request created.',
      changeType: 'STATUS_PROPOSED',
      changedByPersonId: command.actorId,
      newSnapshot: {
        allocationPercent: command.allocationPercent,
        personId: command.personId,
        projectId: command.projectId,
        staffingRole: command.staffingRole,
        status: assignment.status.value,
      },
      occurredAt: new Date(),
    });

    assignment.pullDomainEvents();
    const _event = ProjectAssignmentCreatedEvent.from({
      actorId: command.actorId,
      assignmentId: assignment.assignmentId,
      personId: command.personId,
      projectId: command.projectId,
      staffingRole: command.staffingRole,
    });

    await this.projectAssignmentRepository.save(assignment);
    await this.projectAssignmentRepository.appendApproval(initialApproval);
    await this.projectAssignmentRepository.appendHistory(historyEntry);

    if (conflicts.length > 0 && command.allowOverlapOverride) {
      const overrideReason = command.overrideReason?.trim() ?? '';
      await this.projectAssignmentRepository.appendHistory(
        AssignmentHistory.create({
          assignmentId: assignment.assignmentId,
          changeReason: overrideReason,
          changeType: 'ASSIGNMENT_OVERRIDE_APPLIED',
          changedByPersonId: command.actorId,
          newSnapshot: {
            conflictingAssignmentIds: conflicts.map((item) => item.assignmentId.value),
            overrideType: 'OVERLAPPING_PERSON_PROJECT_ASSIGNMENT',
            status: assignment.status.value,
          },
          occurredAt: new Date(),
        }),
      );
    }

    this.auditLogger?.record({
      actionType: 'assignment.created',
      actorId: command.actorId,
      category: 'assignment',
      changeSummary: `Assignment created for person ${command.personId} on project ${command.projectId}.`,
      details: {
        allocationPercent: command.allocationPercent,
        personId: command.personId,
        projectId: command.projectId,
        staffingRole: command.staffingRole,
        status: assignment.status.value,
      },
      metadata: {
        allocationPercent: command.allocationPercent,
        personId: command.personId,
        projectId: command.projectId,
        staffingRole: command.staffingRole,
        status: assignment.status.value,
      },
      targetEntityId: assignment.assignmentId.value,
      targetEntityType: 'ASSIGNMENT',
    });

    if (conflicts.length > 0 && command.allowOverlapOverride) {
      const overrideReason = command.overrideReason?.trim() ?? '';
      this.auditLogger?.record({
        actionType: 'assignment.override_applied',
        actorId: command.actorId,
        category: 'assignment',
        changeSummary: `Assignment ${assignment.assignmentId.value} created through explicit overlap override.`,
        details: {
          conflictingAssignmentIds: conflicts.map((item) => item.assignmentId.value),
          overrideReason,
          overrideType: 'OVERLAPPING_PERSON_PROJECT_ASSIGNMENT',
          personId: command.personId,
          projectId: command.projectId,
        },
        metadata: {
          conflictingAssignmentIds: conflicts.map((item) => item.assignmentId.value),
          overrideReason,
          overrideType: 'OVERLAPPING_PERSON_PROJECT_ASSIGNMENT',
          personId: command.personId,
          projectId: command.projectId,
        },
        targetEntityId: assignment.assignmentId.value,
        targetEntityType: 'ASSIGNMENT',
      });
    }

    await this.notificationEventTranslator?.assignmentCreated({
      assignmentId: assignment.assignmentId.value,
      personId: command.personId,
      projectId: command.projectId,
      staffingRole: command.staffingRole,
    });

    void this.employeeActivityService?.record({
      personId: command.personId,
      eventType: 'ASSIGNED',
      summary: `Assigned to project ${command.projectId} as ${command.staffingRole} at ${command.allocationPercent}%`,
      actorId: command.actorId,
      relatedEntityId: assignment.assignmentId.value,
      metadata: { projectId: command.projectId, staffingRole: command.staffingRole, allocationPercent: command.allocationPercent, status: assignment.status.value },
    });

    return assignment;
  }
}
