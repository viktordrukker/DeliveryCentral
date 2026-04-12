import { ValueObject } from '@src/shared/domain/value-object';

export class EffectiveDateRange extends ValueObject<{ startsAt: Date; endsAt?: Date }> {
  public static create(startsAt: Date, endsAt?: Date): EffectiveDateRange {
    if (endsAt && endsAt < startsAt) {
      throw new Error('Effective date range end must be on or after start.');
    }

    return new EffectiveDateRange({ endsAt, startsAt });
  }

  public contains(targetDate: Date): boolean {
    const startsSatisfied = targetDate >= this.props.startsAt;
    const endsSatisfied = !this.props.endsAt || targetDate <= this.props.endsAt;

    return startsSatisfied && endsSatisfied;
  }

  public get startsAt(): Date {
    return this.props.startsAt;
  }

  public get endsAt(): Date | undefined {
    return this.props.endsAt;
  }
}
