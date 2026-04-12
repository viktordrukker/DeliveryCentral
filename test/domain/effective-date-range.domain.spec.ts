import { EffectiveDateRange } from '@src/modules/organization/domain/value-objects/effective-date-range';

describe('effective date range domain rules', () => {
  it('includes dates within the configured boundary', () => {
    const range = EffectiveDateRange.create(
      new Date('2025-01-01T00:00:00.000Z'),
      new Date('2025-01-31T23:59:59.999Z'),
    );

    expect(range.contains(new Date('2025-01-15T00:00:00.000Z'))).toBe(true);
    expect(range.contains(new Date('2025-02-01T00:00:00.000Z'))).toBe(false);
  });
});
