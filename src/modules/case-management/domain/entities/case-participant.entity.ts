import { randomUUID } from 'node:crypto';

import { AggregateRoot } from '@src/shared/domain/aggregate-root';

export type CaseParticipantRole =
  | 'APPROVER'
  | 'OBSERVER'
  | 'OPERATOR'
  | 'REVIEWER'
  | 'REQUESTER'
  | 'SUBJECT';

interface CaseParticipantProps {
  personId: string;
  role: CaseParticipantRole;
}

export class CaseParticipant extends AggregateRoot<CaseParticipantProps> {
  public static create(props: CaseParticipantProps, id?: string): CaseParticipant {
    return new CaseParticipant(props, id ?? randomUUID());
  }

  public get personId(): string {
    return this.props.personId;
  }

  public get role(): CaseParticipantRole {
    return this.props.role;
  }
}
