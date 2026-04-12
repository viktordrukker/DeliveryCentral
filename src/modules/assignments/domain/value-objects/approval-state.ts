import { ValueObject } from '@src/shared/domain/value-object';

type ApprovalStateValue =
  | 'ACTIVE'
  | 'APPROVED'
  | 'ARCHIVED'
  | 'ENDED'
  | 'REJECTED'
  | 'REQUESTED'
  | 'REVOKED';

export class ApprovalState extends ValueObject<{ value: ApprovalStateValue }> {
  public static active(): ApprovalState {
    return new ApprovalState({ value: 'ACTIVE' });
  }

  public static approved(): ApprovalState {
    return new ApprovalState({ value: 'APPROVED' });
  }

  public static archived(): ApprovalState {
    return new ApprovalState({ value: 'ARCHIVED' });
  }

  public static ended(): ApprovalState {
    return new ApprovalState({ value: 'ENDED' });
  }

  public static rejected(): ApprovalState {
    return new ApprovalState({ value: 'REJECTED' });
  }

  public static requested(): ApprovalState {
    return new ApprovalState({ value: 'REQUESTED' });
  }

  public static revoked(): ApprovalState {
    return new ApprovalState({ value: 'REVOKED' });
  }

  public static from(value: ApprovalStateValue): ApprovalState {
    return new ApprovalState({ value });
  }

  public get value(): ApprovalStateValue {
    return this.props.value;
  }
}
