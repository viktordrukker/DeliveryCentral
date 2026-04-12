import { ValueObject } from '@src/shared/domain/value-object';

export class ExternalSystemType extends ValueObject<{ value: string }> {
  public static create(value: string): ExternalSystemType {
    return new ExternalSystemType({ value: value.trim().toUpperCase() });
  }

  public static jira(): ExternalSystemType {
    return new ExternalSystemType({ value: 'JIRA' });
  }

  public get value(): string {
    return this.props.value;
  }
}
