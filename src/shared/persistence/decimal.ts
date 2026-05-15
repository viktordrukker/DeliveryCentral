/**
 * F-9.3 / 20c-11 — Prisma Decimal → number helper.
 *
 * Prisma maps `Decimal` columns to a `Decimal.js` instance at runtime, but
 * the generated TS type is `Prisma.Decimal | number | string` depending on
 * the field. Most read-path consumers want a plain `number`; the previous
 * pattern was to cast through `unknown` (`as unknown as { toNumber(): number }`)
 * which suppresses the type system entirely. This helper preserves the
 * runtime guarantee (a Decimal-like value has `.toNumber()`) without an
 * `unknown` cast.
 *
 * Returns `NaN` for `null` / `undefined` so a caller's `Math` / arithmetic
 * trail still type-checks; callers that need a sentinel can `?? 0` the
 * input first.
 */
interface DecimalLike {
  toNumber(): number;
}

function isDecimalLike(value: unknown): value is DecimalLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { toNumber?: unknown }).toNumber === 'function'
  );
}

export function decimalToNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : NaN;
  }
  if (isDecimalLike(value)) return value.toNumber();
  return NaN;
}
