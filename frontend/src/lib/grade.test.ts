import { describe, expect, it } from 'vitest';

import { GRADE_LEVELS, formatGrade, isGrade } from './grade';

describe('grade module — D-132 type-safe const + helpers', () => {
  it('exposes the 8 seeded grade levels in canonical order', () => {
    expect(GRADE_LEVELS).toEqual(['g7', 'g8', 'g9', 'g10', 'g11', 'g12', 'g13', 'g14']);
  });

  it('isGrade narrows known values', () => {
    expect(isGrade('g7')).toBe(true);
    expect(isGrade('g14')).toBe(true);
  });

  it('isGrade rejects unknown / wrong-type values', () => {
    expect(isGrade('G7')).toBe(false); // upper-case is the entryValue, not entryKey
    expect(isGrade('g15')).toBe(false);
    expect(isGrade(null)).toBe(false);
    expect(isGrade(undefined)).toBe(false);
    expect(isGrade(7)).toBe(false);
  });

  it('formatGrade returns the dictionary displayName for known values', () => {
    expect(formatGrade('g7')).toBe('G7 — Junior');
    expect(formatGrade('g14')).toBe('G14 — Partner');
  });

  it('formatGrade returns the value verbatim for unknown grades (tenant custom)', () => {
    expect(formatGrade('g99')).toBe('g99');
  });

  it('formatGrade returns the em-dash sentinel for nullish input', () => {
    expect(formatGrade(null)).toBe('—');
    expect(formatGrade(undefined)).toBe('—');
    expect(formatGrade('')).toBe('—');
  });
});
