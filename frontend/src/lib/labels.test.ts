import { describe, expect, it } from 'vitest';

import { formatChangeType, formatCaseType, humanizeEnum } from './labels';

describe('humanizeEnum', () => {
  it('converts snake_case to Title Case', () => {
    expect(humanizeEnum('ASSIGNMENT_APPROVED')).toBe('Assignment Approved');
  });

  it('uses custom map when provided', () => {
    const map = { FOO: 'Custom Label' };
    expect(humanizeEnum('FOO', map)).toBe('Custom Label');
  });

  it('falls back to humanized string when key not in map', () => {
    const map = { OTHER: 'Other' };
    expect(humanizeEnum('SOME_VALUE', map)).toBe('Some Value');
  });

  it('handles single word', () => {
    expect(humanizeEnum('ACTIVE')).toBe('Active');
  });

  it('handles already lowercase', () => {
    expect(humanizeEnum('pending')).toBe('Pending');
  });
});

describe('formatChangeType', () => {
  it('maps known change types', () => {
    const result = formatChangeType('ASSIGNMENT_CREATED');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('falls back gracefully for unknown types', () => {
    const result = formatChangeType('UNKNOWN_CHANGE_TYPE');
    expect(result).toBe('Unknown Change Type');
  });
});

describe('formatCaseType', () => {
  it('maps ONBOARDING', () => {
    const result = formatCaseType('ONBOARDING');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('falls back for unknown case type', () => {
    const result = formatCaseType('UNKNOWN_CASE');
    expect(result).toBe('Unknown Case');
  });
});
