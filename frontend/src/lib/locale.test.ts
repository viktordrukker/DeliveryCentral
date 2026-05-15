import { describe, it, expect } from 'vitest';

import { buildLocaleFormatters } from './locale';

describe('buildLocaleFormatters (F-7.3 / D-165)', () => {
  describe('formatCurrency', () => {
    it('formats numbers using the supplied currency code', () => {
      const f = buildLocaleFormatters('USD', 'UTC');
      expect(f.formatCurrency(1234)).toContain('1,234');
    });

    it('returns em-dash for null / undefined / NaN', () => {
      const f = buildLocaleFormatters('GBP', 'UTC');
      expect(f.formatCurrency(null)).toBe('—');
      expect(f.formatCurrency(undefined)).toBe('—');
      expect(f.formatCurrency(Number.NaN)).toBe('—');
    });

    it('honors maximumFractionDigits override', () => {
      const f = buildLocaleFormatters('USD', 'UTC');
      const out = f.formatCurrency(12.34, { maximumFractionDigits: 2 });
      expect(out).toContain('12.34');
    });
  });

  describe('formatDate', () => {
    it('formats a date in the supplied timezone (UTC baseline)', () => {
      const f = buildLocaleFormatters('USD', 'UTC');
      const out = f.formatDate('2026-05-15T12:00:00Z');
      // en-US format: "May 15, 2026"
      expect(out).toMatch(/May 15, 2026/);
    });

    it('formats according to timezone — late-UTC instant lands next day in Tokyo', () => {
      const f = buildLocaleFormatters('JPY', 'Asia/Tokyo');
      // 2026-05-14 18:00 UTC = 2026-05-15 03:00 JST → date should be May 15
      const out = f.formatDate('2026-05-14T18:00:00Z');
      expect(out).toMatch(/May 15, 2026/);
    });

    it('returns em-dash for invalid input', () => {
      const f = buildLocaleFormatters('USD', 'UTC');
      expect(f.formatDate(null)).toBe('—');
      expect(f.formatDate('not-a-date')).toBe('—');
    });
  });

  describe('formatDateTime', () => {
    it('includes hour + minute in the supplied timezone', () => {
      const f = buildLocaleFormatters('USD', 'UTC');
      const out = f.formatDateTime('2026-05-15T14:30:00Z');
      expect(out).toMatch(/May 15, 2026/);
      expect(out).toMatch(/14:30/);
    });
  });

  describe('formatNumber', () => {
    it('formats with thousands separators', () => {
      const f = buildLocaleFormatters('USD', 'UTC');
      expect(f.formatNumber(1234567)).toContain('1,234,567');
    });

    it('honors percent style', () => {
      const f = buildLocaleFormatters('USD', 'UTC');
      const out = f.formatNumber(0.42, { style: 'percent', maximumFractionDigits: 0 });
      expect(out).toBe('42%');
    });
  });

  describe('formatters expose currency + timezone for inspection', () => {
    it('returns the bound values', () => {
      const f = buildLocaleFormatters('GBP', 'Europe/London');
      expect(f.currency).toBe('GBP');
      expect(f.timezone).toBe('Europe/London');
    });
  });
});
