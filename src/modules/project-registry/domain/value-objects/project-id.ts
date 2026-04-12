import { randomUUID } from 'node:crypto';

import { ValueObject } from '@src/shared/domain/value-object';

export class ProjectId extends ValueObject<{ value: string }> {
  public static create(): ProjectId {
    return new ProjectId({ value: randomUUID() });
  }

  public static from(value: string): ProjectId {
    return new ProjectId({ value });
  }

  public get value(): string {
    return this.props.value;
  }
}
