import { randomUUID } from 'node:crypto';

import { AggregateRoot } from '@src/shared/domain/aggregate-root';

import { ApprovalState } from '../value-objects/approval-state';
import { AssignmentId } from '../value-objects/assignment-id';

interface AssignmentApprovalProps {
  assignmentId: AssignmentId;
  decisionAt?: Date;
  decisionReason?: string;
  decisionState: ApprovalState;
  decidedByPersonId?: string;
  sequenceNumber: number;
}

export class AssignmentApproval extends AggregateRoot<AssignmentApprovalProps> {
  public static create(props: AssignmentApprovalProps, id?: string): AssignmentApproval {
    return new AssignmentApproval(props, id ?? randomUUID());
  }

  public get assignmentId(): AssignmentId {
    return this.props.assignmentId;
  }

  public get decisionAt(): Date | undefined {
    return this.props.decisionAt;
  }

  public get decisionReason(): string | undefined {
    return this.props.decisionReason;
  }

  public get decisionState(): ApprovalState {
    return this.props.decisionState;
  }

  public get decidedByPersonId(): string | undefined {
    return this.props.decidedByPersonId;
  }

  public get sequenceNumber(): number {
    return this.props.sequenceNumber;
  }
}
