import { ValueObject } from '@src/shared/domain/value-object';

export class ExternalProjectKey extends ValueObject<{ value: string }> {
  public static from(value: string): ExternalProjectKey {
    const normalizedValue = value.trim();

    if (!normalizedValue) {
      throw new Error('External project key must not be empty.');
    }

    return new ExternalProjectKey({ value: normalizedValue });
  }

  public get value(): string {
    return this.props.value;
  }
}
