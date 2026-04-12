import { DomainEvent } from '@src/shared/domain/domain-event';

import { AssignmentId } from '../value-objects/assignment-id';

export class ProjectAssignmentCreatedEvent implements DomainEvent {
  public readonly eventName = 'assignment.project_assignment_created';
  public readonly occurredAt = new Date();

  public constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      actorId: string;
      assignmentId: string;
      personId: string;
      projectId: string;
      staffingRole: string;
    },
  ) {}

  public static from(params: {
    actorId: string;
    assignmentId: AssignmentId;
    personId: string;
    projectId: string;
    staffingRole: string;
  }): ProjectAssignmentCreatedEvent {
    return new ProjectAssignmentCreatedEvent(params.assignmentId.value, {
      actorId: params.actorId,
      assignmentId: params.assignmentId.value,
      personId: params.personId,
      projectId: params.projectId,
      staffingRole: params.staffingRole,
    });
  }
}
