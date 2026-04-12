import { ValueObject } from '@src/shared/domain/value-object';

export class OrgUnitId extends ValueObject<{ value: string }> {
  public static from(value: string): OrgUnitId {
    return new OrgUnitId({ value });
  }

  public get value(): string {
    return this.props.value;
  }
}
