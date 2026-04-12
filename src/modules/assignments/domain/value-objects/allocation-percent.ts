import { ValueObject } from '@src/shared/domain/value-object';

export class AllocationPercent extends ValueObject<{ value: number }> {
  public static from(value: number): AllocationPercent {
    if (value < 0 || value > 100) {
      throw new Error('Allocation percent must be between 0 and 100.');
    }

    return new AllocationPercent({ value });
  }

  public get value(): number {
    return this.props.value;
  }
}
