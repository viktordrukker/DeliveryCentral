import { randomUUID } from 'node:crypto';

import { AggregateRoot } from '@src/shared/domain/aggregate-root';

import { AssignmentId } from '../value-objects/assignment-id';

interface AssignmentHistoryProps {
  assignmentId: AssignmentId;
  changeReason?: string;
  changeType: string;
  changedByPersonId?: string;
  newSnapshot?: Record<string, unknown>;
  occurredAt: Date;
  previousSnapshot?: Record<string, unknown>;
}

export class AssignmentHistory extends AggregateRoot<AssignmentHistoryProps> {
  public static create(props: AssignmentHistoryProps, id?: string): AssignmentHistory {
    return new AssignmentHistory(props, id ?? randomUUID());
  }

  public get assignmentId(): AssignmentId {
    return this.props.assignmentId;
  }

  public get changeType(): string {
    return this.props.changeType;
  }

  public get changeReason(): string | undefined {
    return this.props.changeReason;
  }

  public get changedByPersonId(): string | undefined {
    return this.props.changedByPersonId;
  }

  public get newSnapshot(): Record<string, unknown> | undefined {
    return this.props.newSnapshot;
  }

  public get occurredAt(): Date {
    return this.props.occurredAt;
  }

  public get previousSnapshot(): Record<string, unknown> | undefined {
    return this.props.previousSnapshot;
  }
}
