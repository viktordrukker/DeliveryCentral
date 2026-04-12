import { randomUUID } from 'node:crypto';

import { ValueObject } from '@src/shared/domain/value-object';

export class AssignmentId extends ValueObject<{ value: string }> {
  public static create(): AssignmentId {
    return new AssignmentId({ value: randomUUID() });
  }

  public static from(value: string): AssignmentId {
    return new AssignmentId({ value });
  }

  public get value(): string {
    return this.props.value;
  }
}
