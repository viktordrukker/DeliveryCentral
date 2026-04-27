import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { NotificationEventTranslatorService } from '@src/modules/notifications/application/notification-event-translator.service';

import { AssignmentApproval } from '../domain/entities/assignment-approval.entity';
import { AssignmentHistory } from '../domain/entities/assignment-history.entity';
import { ProjectAssignment } from '../domain/entities/project-assignment.entity';
import { ProjectAssignmentRepositoryPort } from '../domain/repositories/project-assignment-repository.port';
import { ApprovalState } from '../domain/value-objects/approval-state';
import { AssignmentId } from '../domain/value-objects/assignment-id';
import { AssignmentReferenceRepositoryPort } from './ports/assignment-reference.repository.port';

interface ApproveProjectAssignmentCommand {
  actorId: string;
  assignmentId: string;
  comment?: string;
}

@Injectable()
export class ApproveProjectAssignmentService {
  public constructor(
    private readonly projectAssignmentRepository: ProjectAssignmentRepositoryPort,
    private readonly auditLogger?: AuditLoggerService,
    private readonly notificationEventTranslator?: NotificationEventTranslatorService,
    private readonly assignmentReferenceRepository?: AssignmentReferenceRepositoryPort,
  ) {}

  public async execute(
    command: ApproveProjectAssignmentCommand,
  ): Promise<ProjectAssignment> {
    const assignment = await this.projectAssignmentRepository.findByAssignmentId(
      AssignmentId.from(command.assignmentId),
    );

    if (!assignment) {
      throw new NotFoundException('Assignment not found.');
    }

    if (assignment.personId === command.actorId) {
      throw new ForbiddenException('Cannot approve your own assignment.');
    }

    if (this.assignmentReferenceRepository) {
      const isActive = await this.assignmentReferenceRepository.personIsActive(assignment.personId);
      if (!isActive) {
        throw new ConflictException('Cannot approve assignment for an inactive or terminated employee.');
      }
    }

    assignment.approve(new Date());

    const existingApprovals = await this.projectAssignmentRepository.findApprovalsByAssignmentId(
      assignment.assignmentId,
    );
    const approval = AssignmentApproval.create({
      assignmentId: assignment.assignmentId,
      decisionAt: assignment.approvedAt,
      decisionReason: command.comment,
      decisionState: ApprovalState.approved(),
      decidedByPersonId: command.actorId,
      sequenceNumber: existingApprovals.length + 1,
    });
    const history = AssignmentHistory.create({
      assignmentId: assignment.assignmentId,
      changeReason: command.comment,
      changeType: 'ASSIGNMENT_APPROVED',
      changedByPersonId: command.actorId,
      newSnapshot: {
        approvedAt: assignment.approvedAt?.toISOString(),
        status: assignment.status.value,
      },
      occurredAt: new Date(),
    });

    await this.projectAssignmentRepository.save(assignment);
    await this.projectAssignmentRepository.appendApproval(approval);
    await this.projectAssignmentRepository.appendHistory(history);
    this.auditLogger?.record({
      actionType: 'assignment.approved',
      actorId: command.actorId,
      category: 'approval',
      changeSummary: `Assignment ${assignment.assignmentId.value} approved.`,
      details: {
        comment: command.comment,
        status: assignment.status.value,
      },
      metadata: {
        comment: command.comment,
        status: assignment.status.value,
      },
      targetEntityId: assignment.assignmentId.value,
      targetEntityType: 'ASSIGNMENT',
    });
    await this.notificationEventTranslator?.assignmentApproved({
      assignmentId: assignment.assignmentId.value,
      recipientPersonId: assignment.personId,
    });

    return assignment;
  }
}
