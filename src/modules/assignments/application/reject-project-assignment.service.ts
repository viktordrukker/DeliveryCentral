import { Injectable } from '@nestjs/common';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { NotificationEventTranslatorService } from '@src/modules/notifications/application/notification-event-translator.service';

import { AssignmentApproval } from '../domain/entities/assignment-approval.entity';
import { AssignmentHistory } from '../domain/entities/assignment-history.entity';
import { ProjectAssignment } from '../domain/entities/project-assignment.entity';
import { ProjectAssignmentRepositoryPort } from '../domain/repositories/project-assignment-repository.port';
import { ApprovalState } from '../domain/value-objects/approval-state';
import { AssignmentId } from '../domain/value-objects/assignment-id';

interface RejectProjectAssignmentCommand {
  actorId: string;
  assignmentId: string;
  reason?: string;
}

@Injectable()
export class RejectProjectAssignmentService {
  public constructor(
    private readonly projectAssignmentRepository: ProjectAssignmentRepositoryPort,
    private readonly auditLogger?: AuditLoggerService,
    private readonly notificationEventTranslator?: NotificationEventTranslatorService,
  ) {}

  public async execute(
    command: RejectProjectAssignmentCommand,
  ): Promise<ProjectAssignment> {
    const assignment = await this.projectAssignmentRepository.findByAssignmentId(
      AssignmentId.from(command.assignmentId),
    );

    if (!assignment) {
      throw new Error('Assignment not found.');
    }

    assignment.reject();

    const existingApprovals = await this.projectAssignmentRepository.findApprovalsByAssignmentId(
      assignment.assignmentId,
    );
    const approval = AssignmentApproval.create({
      assignmentId: assignment.assignmentId,
      decisionAt: new Date(),
      decisionReason: command.reason,
      decisionState: ApprovalState.rejected(),
      decidedByPersonId: command.actorId,
      sequenceNumber: existingApprovals.length + 1,
    });
    const history = AssignmentHistory.create({
      assignmentId: assignment.assignmentId,
      changeReason: command.reason,
      changeType: 'ASSIGNMENT_REJECTED',
      changedByPersonId: command.actorId,
      newSnapshot: {
        status: assignment.status.value,
      },
      occurredAt: new Date(),
    });

    await this.projectAssignmentRepository.save(assignment);
    await this.projectAssignmentRepository.appendApproval(approval);
    await this.projectAssignmentRepository.appendHistory(history);
    this.auditLogger?.record({
      actionType: 'assignment.rejected',
      actorId: command.actorId,
      category: 'approval',
      changeSummary: `Assignment ${assignment.assignmentId.value} rejected.`,
      details: {
        reason: command.reason,
        status: assignment.status.value,
      },
      metadata: {
        reason: command.reason,
        status: assignment.status.value,
      },
      targetEntityId: assignment.assignmentId.value,
      targetEntityType: 'ASSIGNMENT',
    });
    await this.notificationEventTranslator?.assignmentRejected({
      assignmentId: assignment.assignmentId.value,
      reason: command.reason,
      recipientPersonId: assignment.personId,
    });

    return assignment;
  }
}
