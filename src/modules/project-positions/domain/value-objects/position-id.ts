import { randomUUID } from 'node:crypto';

import { ValueObject } from '@src/shared/domain/value-object';

export class PositionId extends ValueObject<{ value: string }> {
  public static create(): PositionId {
    return new PositionId({ value: randomUUID() });
  }

  public static from(value: string): PositionId {
    return new PositionId({ value });
  }

  public get value(): string {
    return this.props.value;
  }
}
