import { describe, expect, it } from 'vitest';
import { getAgingDays, getAgingTone, getAgingTooltip } from './aging';

const NOW = new Date('2026-04-17T12:00:00Z');
const daysAgo = (n: number): string => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

describe('getAgingTone', () => {
  it('returns neutral for requests < 3 days old', () => {
    expect(getAgingTone(daysAgo(0), NOW)).toBe('neutral');
    expect(getAgingTone(daysAgo(2), NOW)).toBe('neutral');
  });

  it('returns warning for requests 3-7 days old', () => {
    expect(getAgingTone(daysAgo(3), NOW)).toBe('warning');
    expect(getAgingTone(daysAgo(7), NOW)).toBe('warning');
  });

  it('returns danger for requests > 7 days old', () => {
    expect(getAgingTone(daysAgo(8), NOW)).toBe('danger');
    expect(getAgingTone(daysAgo(30), NOW)).toBe('danger');
  });
});

describe('getAgingDays', () => {
  it('computes integer days since createdAt', () => {
    expect(getAgingDays(daysAgo(5), NOW)).toBe(5);
    expect(getAgingDays(daysAgo(0), NOW)).toBe(0);
  });
});

describe('getAgingTooltip', () => {
  it('returns a different message per tone', () => {
    expect(getAgingTooltip('neutral')).toMatch(/less than 3/i);
    expect(getAgingTooltip('warning')).toMatch(/3.{0,3}7/);
    expect(getAgingTooltip('danger')).toMatch(/7/);
  });
});
