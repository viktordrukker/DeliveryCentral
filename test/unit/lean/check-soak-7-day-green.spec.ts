import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  type SoakSnapshot,
  evaluate,
  isGreen,
  stampForDate,
  trailingStamps,
} from '../../../scripts/check-soak-7-day-green';

function greenSnapshot(overrides: Partial<SoakSnapshot> = {}): SoakSnapshot {
  return {
    capturedAt: '2026-06-10T07:00:00.000Z',
    projectPositionCount: 100,
    projectAssignmentCount: 100,
    staffingRequestCount: 50,
    positionsLinkedToAssignment: 100,
    positionsLinkedToStaffingRequest: 50,
    positionsWithOrphanedAssignmentLink: 0,
    positionsWithOrphanedStaffingRequestLink: 0,
    assignmentsWithoutPosition: 0,
    staffingRequestsWithoutPosition: 0,
    divergenceCount: 0,
    ...overrides,
  };
}

function makeFixtureDir(): string {
  return mkdtempSync(join(tmpdir(), 'soak-7-day-fixture-'));
}

function writeSnapshot(dir: string, stamp: string, snap: SoakSnapshot): void {
  writeFileSync(join(dir, `${stamp}.json`), JSON.stringify(snap, null, 2), 'utf-8');
}

describe('check-soak-7-day-green (SoT PR 19)', () => {
  const asOf = new Date('2026-06-10T12:00:00.000Z');

  describe('trailingStamps()', () => {
    it('returns 7 stamps anchored at asOf and walking backwards', () => {
      const stamps = trailingStamps(asOf);
      expect(stamps).toHaveLength(7);
      expect(stamps[0]).toBe('2026-06-10');
      expect(stamps[6]).toBe('2026-06-04');
    });

    it('respects a custom window size', () => {
      const stamps = trailingStamps(asOf, 3);
      expect(stamps).toEqual(['2026-06-10', '2026-06-09', '2026-06-08']);
    });
  });

  describe('stampForDate()', () => {
    it('produces YYYY-MM-DD in UTC', () => {
      expect(stampForDate(new Date('2026-01-02T23:30:00.000Z'))).toBe('2026-01-02');
    });
  });

  describe('isGreen()', () => {
    it('returns green when all probes are 0', () => {
      const result = isGreen(greenSnapshot());
      expect(result.green).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('returns red when divergenceCount > 0', () => {
      const result = isGreen(greenSnapshot({ divergenceCount: 2 }));
      expect(result.green).toBe(false);
      expect(result.reason).toContain('divergenceCount');
    });

    it('returns red when assignmentsWithoutPosition > 0', () => {
      const result = isGreen(greenSnapshot({ assignmentsWithoutPosition: 1 }));
      expect(result.green).toBe(false);
      expect(result.reason).toContain('assignmentsWithoutPosition');
    });
  });

  describe('evaluate()', () => {
    let dir: string;

    beforeEach(() => {
      dir = makeFixtureDir();
    });

    afterEach(() => {
      rmSync(dir, { recursive: true, force: true });
    });

    it('7-day green pass — all 7 trailing days exist and are green', () => {
      for (const stamp of trailingStamps(asOf)) {
        writeSnapshot(dir, stamp, greenSnapshot({ capturedAt: `${stamp}T07:00:00.000Z` }));
      }
      const report = evaluate(dir, asOf);
      expect(report.pass).toBe(true);
      expect(report.days).toHaveLength(7);
      for (const day of report.days) {
        expect(day.status).toBe('green');
      }
    });

    it('1-day red fail — a single red day collapses the gate', () => {
      const stamps = trailingStamps(asOf);
      for (const stamp of stamps) {
        writeSnapshot(dir, stamp, greenSnapshot({ capturedAt: `${stamp}T07:00:00.000Z` }));
      }
      // Overwrite the middle day with a divergent snapshot.
      const middle = stamps[3];
      expect(middle).toBeDefined();
      writeSnapshot(
        dir,
        middle as string,
        greenSnapshot({ capturedAt: `${middle}T07:00:00.000Z`, divergenceCount: 5 }),
      );
      const report = evaluate(dir, asOf);
      expect(report.pass).toBe(false);
      const redDay = report.days.find((d) => d.stamp === middle);
      expect(redDay?.status).toBe('red');
      expect(redDay?.reason).toContain('divergenceCount');
    });

    it('7-day partial pass fail — only 4 of 7 days are present', () => {
      const stamps = trailingStamps(asOf);
      for (const stamp of stamps.slice(0, 4)) {
        writeSnapshot(dir, stamp, greenSnapshot({ capturedAt: `${stamp}T07:00:00.000Z` }));
      }
      const report = evaluate(dir, asOf);
      expect(report.pass).toBe(false);
      const missingDays = report.days.filter((d) => d.status === 'missing');
      expect(missingDays).toHaveLength(3);
      const greenDays = report.days.filter((d) => d.status === 'green');
      expect(greenDays).toHaveLength(4);
    });

    it('missing-day fail — a hole in the trailing window fails the gate', () => {
      const stamps = trailingStamps(asOf);
      for (const stamp of stamps) {
        if (stamp === stamps[2]) continue; // skip day 3
        writeSnapshot(dir, stamp, greenSnapshot({ capturedAt: `${stamp}T07:00:00.000Z` }));
      }
      const report = evaluate(dir, asOf);
      expect(report.pass).toBe(false);
      const missing = report.days.find((d) => d.stamp === stamps[2]);
      expect(missing?.status).toBe('missing');
    });
  });
});
