import { Injectable } from '@nestjs/common';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { NotificationEventTranslatorService } from '@src/modules/notifications/application/notification-event-translator.service';

import { AssignmentHistory } from '../domain/entities/assignment-history.entity';
import { ProjectAssignment } from '../domain/entities/project-assignment.entity';
import { ProjectAssignmentRepositoryPort } from '../domain/repositories/project-assignment-repository.port';
import { AssignmentId } from '../domain/value-objects/assignment-id';

interface EndProjectAssignmentCommand {
  actorId: string;
  assignmentId: string;
  endDate: string;
  reason?: string;
}

@Injectable()
export class EndProjectAssignmentService {
  public constructor(
    private readonly projectAssignmentRepository: ProjectAssignmentRepositoryPort,
    private readonly auditLogger?: AuditLoggerService,
    private readonly notificationEventTranslator?: NotificationEventTranslatorService,
  ) {}

  public async execute(command: EndProjectAssignmentCommand): Promise<ProjectAssignment> {
    const assignment = await this.projectAssignmentRepository.findByAssignmentId(
      AssignmentId.from(command.assignmentId),
    );

    if (!assignment) {
      throw new Error('Assignment not found.');
    }

    const endDate = new Date(command.endDate);
    const previousSnapshot = {
      status: assignment.status.value,
      validTo: assignment.validTo?.toISOString(),
    };

    assignment.end(endDate);

    const history = AssignmentHistory.create({
      assignmentId: assignment.assignmentId,
      changeReason: command.reason,
      changeType: 'ASSIGNMENT_ENDED',
      changedByPersonId: command.actorId,
      newSnapshot: {
        status: assignment.status.value,
        validTo: assignment.validTo?.toISOString(),
      },
      occurredAt: new Date(),
      previousSnapshot,
    });

    await this.projectAssignmentRepository.save(assignment);
    await this.projectAssignmentRepository.appendHistory(history);
    this.auditLogger?.record({
      actionType: 'assignment.ended',
      actorId: command.actorId,
      category: 'assignment',
      changeSummary: `Assignment ${assignment.assignmentId.value} ended.`,
      details: {
        endDate: assignment.validTo?.toISOString(),
        reason: command.reason,
        status: assignment.status.value,
      },
      metadata: {
        endDate: assignment.validTo?.toISOString(),
        reason: command.reason,
        status: assignment.status.value,
      },
      targetEntityId: assignment.assignmentId.value,
      targetEntityType: 'ASSIGNMENT',
    });

    void this.notificationEventTranslator?.assignmentEnded({
      assignmentId: assignment.assignmentId.value,
    });

    return assignment;
  }
}
