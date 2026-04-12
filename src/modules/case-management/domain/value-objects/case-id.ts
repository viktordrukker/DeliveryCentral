import { randomUUID } from 'node:crypto';

import { ValueObject } from '@src/shared/domain/value-object';

export class CaseId extends ValueObject<{ value: string }> {
  public static create(): CaseId {
    return new CaseId({ value: randomUUID() });
  }

  public static from(value: string): CaseId {
    return new CaseId({ value });
  }

  public get value(): string {
    return this.props.value;
  }
}
