import { getWeekStart, getWeekStartISODate } from '@src/shared/temporal/week-of';

describe('getWeekStart (F-7.1 / D-161)', () => {
  describe('default UTC + Monday', () => {
    it('returns the same instant when given a UTC Monday at 00:00', () => {
      const monday = new Date('2026-05-11T00:00:00Z'); // Mon
      const ws = getWeekStart(monday);
      expect(ws.toISOString()).toBe('2026-05-11T00:00:00.000Z');
    });

    it('steps back to Monday for a Wednesday UTC', () => {
      const wed = new Date('2026-05-13T15:30:00Z');
      const ws = getWeekStart(wed);
      expect(ws.toISOString()).toBe('2026-05-11T00:00:00.000Z');
    });

    it('steps back six days for a Sunday UTC (Mon-start)', () => {
      const sun = new Date('2026-05-17T10:00:00Z');
      const ws = getWeekStart(sun);
      expect(ws.toISOString()).toBe('2026-05-11T00:00:00.000Z');
    });
  });

  describe('Sunday week start', () => {
    it('returns the prior Sunday for a Wednesday UTC', () => {
      const wed = new Date('2026-05-13T15:30:00Z');
      const ws = getWeekStart(wed, { weekStartDay: 0 });
      expect(ws.toISOString()).toBe('2026-05-10T00:00:00.000Z');
    });

    it('returns the same date for a Sunday UTC', () => {
      const sun = new Date('2026-05-17T00:00:00Z');
      const ws = getWeekStart(sun, { weekStartDay: 0 });
      expect(ws.toISOString()).toBe('2026-05-17T00:00:00.000Z');
    });
  });

  describe('timezone-aware', () => {
    it('Europe/London (BST = UTC+1) — late-Sunday UTC 23:30 is already Monday in London', () => {
      const lateSun = new Date('2026-05-10T23:30:00Z'); // Sun in UTC, Mon 00:30 in BST
      const ws = getWeekStart(lateSun, { timezone: 'Europe/London' });
      // The London Monday begins at 2026-05-11 00:00 BST = 2026-05-10 23:00 UTC
      expect(ws.toISOString()).toBe('2026-05-10T23:00:00.000Z');
    });

    it('America/Los_Angeles (PDT = UTC-7) — early-Monday UTC 02:00 is still Sunday in LA', () => {
      const earlyMon = new Date('2026-05-11T02:00:00Z'); // Mon UTC, Sun 19:00 in LA
      const ws = getWeekStart(earlyMon, { timezone: 'America/Los_Angeles' });
      // LA week is Mon 2026-05-04 → Sun 2026-05-10 (still Sunday for this caller)
      // Week-start in LA: 2026-05-04 00:00 PDT = 2026-05-04 07:00 UTC
      expect(ws.toISOString()).toBe('2026-05-04T07:00:00.000Z');
    });

    it('Asia/Tokyo (UTC+9) — UTC midnight Wednesday is 09:00 Wed in Tokyo (same calendar day)', () => {
      const wed = new Date('2026-05-13T00:00:00Z');
      const ws = getWeekStart(wed, { timezone: 'Asia/Tokyo' });
      // Tokyo Mon 2026-05-11 00:00 JST = 2026-05-10 15:00 UTC
      expect(ws.toISOString()).toBe('2026-05-10T15:00:00.000Z');
    });
  });

  describe('input validation', () => {
    it('falls back to Monday when weekStartDay is out of range', () => {
      const wed = new Date('2026-05-13T15:30:00Z');
      const ws = getWeekStart(wed, { weekStartDay: 99 });
      expect(ws.toISOString()).toBe('2026-05-11T00:00:00.000Z');
    });

    it('falls back to Monday when weekStartDay is negative', () => {
      const wed = new Date('2026-05-13T15:30:00Z');
      const ws = getWeekStart(wed, { weekStartDay: -3 });
      expect(ws.toISOString()).toBe('2026-05-11T00:00:00.000Z');
    });

    it('falls back to Monday when weekStartDay is non-finite', () => {
      const wed = new Date('2026-05-13T15:30:00Z');
      const ws = getWeekStart(wed, { weekStartDay: Number.NaN });
      expect(ws.toISOString()).toBe('2026-05-11T00:00:00.000Z');
    });
  });

  describe('getWeekStartISODate', () => {
    it('returns YYYY-MM-DD for the computed week start', () => {
      const wed = new Date('2026-05-13T15:30:00Z');
      expect(getWeekStartISODate(wed)).toBe('2026-05-11');
    });
  });
});
