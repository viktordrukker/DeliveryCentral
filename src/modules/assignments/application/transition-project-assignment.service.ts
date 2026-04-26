import { Injectable } from '@nestjs/common';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { PlatformRole } from '@src/modules/identity-access/domain/platform-role';
import { NotificationEventTranslatorService } from '@src/modules/notifications/application/notification-event-translator.service';

import { AssignmentHistory } from '../domain/entities/assignment-history.entity';
import { ProjectAssignment } from '../domain/entities/project-assignment.entity';
import { ProjectAssignmentRepositoryPort } from '../domain/repositories/project-assignment-repository.port';
import { AssignmentId } from '../domain/value-objects/assignment-id';
import {
  AssignmentStatusValue,
  findTransition,
} from '../domain/value-objects/assignment-status';

export interface TransitionAssignmentCommand {
  actorId: string;
  actorRoles: readonly PlatformRole[];
  assignmentId: string;
  caseId?: string;
  reason?: string;
  target: AssignmentStatusValue;
  timestamp?: Date;
}

const STATUS_CHANGE_TYPE: Record<AssignmentStatusValue, string> = {
  CREATED: 'STATUS_CREATED',
  PROPOSED: 'STATUS_PROPOSED',
  REJECTED: 'STATUS_REJECTED',
  BOOKED: 'STATUS_BOOKED',
  ONBOARDING: 'STATUS_ONBOARDING',
  ASSIGNED: 'STATUS_ASSIGNED',
  ON_HOLD: 'STATUS_ON_HOLD',
  COMPLETED: 'STATUS_COMPLETED',
  CANCELLED: 'STATUS_CANCELLED',
};

const AUDIT_ACTION_TYPE: Record<AssignmentStatusValue, string> = {
  CREATED: 'assignment.created',
  PROPOSED: 'assignment.proposed',
  REJECTED: 'assignment.rejected',
  BOOKED: 'assignment.booked',
  ONBOARDING: 'assignment.onboarding',
  ASSIGNED: 'assignment.assigned',
  ON_HOLD: 'assignment.on_hold',
  COMPLETED: 'assignment.completed',
  CANCELLED: 'assignment.cancelled',
};

@Injectable()
export class TransitionProjectAssignmentService {
  public constructor(
    private readonly projectAssignmentRepository: ProjectAssignmentRepositoryPort,
    private readonly auditLogger?: AuditLoggerService,
    private readonly notificationEventTranslator?: NotificationEventTranslatorService,
  ) {}

  public async execute(command: TransitionAssignmentCommand): Promise<ProjectAssignment> {
    const assignment = await this.projectAssignmentRepository.findByAssignmentId(
      AssignmentId.from(command.assignmentId),
    );

    if (!assignment) {
      throw new Error('Assignment not found.');
    }

    const previousStatus = assignment.status.value;
    const transition = findTransition(previousStatus, command.target);

    if (!transition) {
      throw new Error(
        `Assignment cannot transition from ${previousStatus} to ${command.target}.`,
      );
    }

    assignment.transitionTo(command.target, {
      actorRoles: command.actorRoles,
      caseId: command.caseId,
      reason: command.reason,
      timestamp: command.timestamp,
    });

    const history = AssignmentHistory.create({
      assignmentId: assignment.assignmentId,
      changeReason: command.reason,
      changeType: STATUS_CHANGE_TYPE[command.target],
      changedByPersonId: command.actorId,
      newSnapshot: {
        previousStatus,
        status: assignment.status.value,
      },
      occurredAt: command.timestamp ?? new Date(),
      previousSnapshot: { status: previousStatus },
    });

    await this.projectAssignmentRepository.save(assignment);
    await this.projectAssignmentRepository.appendHistory(history);

    this.auditLogger?.record({
      actionType: AUDIT_ACTION_TYPE[command.target],
      actorId: command.actorId,
      category: 'assignment',
      changeSummary: `Assignment ${assignment.assignmentId.value} transitioned ${previousStatus} → ${assignment.status.value}.`,
      details: {
        previousStatus,
        reason: command.reason,
        status: assignment.status.value,
      },
      metadata: {
        previousStatus,
        reason: command.reason,
        status: assignment.status.value,
      },
      targetEntityId: assignment.assignmentId.value,
      targetEntityType: 'ASSIGNMENT',
    });

    await this.notificationEventTranslator?.assignmentStatusChanged?.({
      assignmentId: assignment.assignmentId.value,
      previousStatus,
      reason: command.reason,
      recipientPersonId: assignment.personId,
      status: assignment.status.value,
    });

    return assignment;
  }
}
