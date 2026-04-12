import { randomUUID } from 'node:crypto';

import { ValueObject } from '@src/shared/domain/value-object';

export class WorkEvidenceId extends ValueObject<{ value: string }> {
  public static create(): WorkEvidenceId {
    return new WorkEvidenceId({ value: randomUUID() });
  }

  public static from(value: string): WorkEvidenceId {
    return new WorkEvidenceId({ value });
  }

  public get value(): string {
    return this.props.value;
  }
}
