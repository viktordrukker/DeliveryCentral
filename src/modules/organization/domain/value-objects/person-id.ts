import { ValueObject } from '@src/shared/domain/value-object';

export class PersonId extends ValueObject<{ value: string }> {
  public static from(value: string): PersonId {
    return new PersonId({ value });
  }

  public get value(): string {
    return this.props.value;
  }
}
