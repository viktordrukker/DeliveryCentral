import { decimalToNumber } from '@src/shared/persistence/decimal';

describe('decimalToNumber', () => {
  it('returns a number unchanged', () => {
    expect(decimalToNumber(42.5)).toBe(42.5);
    expect(decimalToNumber(0)).toBe(0);
    expect(decimalToNumber(-1)).toBe(-1);
  });

  it('parses a numeric string', () => {
    expect(decimalToNumber('3.14')).toBeCloseTo(3.14);
    expect(decimalToNumber('100')).toBe(100);
  });

  it('returns NaN for a non-numeric string', () => {
    expect(Number.isNaN(decimalToNumber('not-a-number'))).toBe(true);
  });

  it('unwraps a Decimal-like object via toNumber()', () => {
    const decimalLike = { toNumber: () => 17.5 };
    expect(decimalToNumber(decimalLike)).toBe(17.5);
  });

  it('returns NaN for null / undefined', () => {
    expect(Number.isNaN(decimalToNumber(null))).toBe(true);
    expect(Number.isNaN(decimalToNumber(undefined))).toBe(true);
  });

  it('returns NaN for an object without toNumber', () => {
    expect(Number.isNaN(decimalToNumber({ value: 5 }))).toBe(true);
  });
});
