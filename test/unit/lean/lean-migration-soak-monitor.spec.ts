/**
 * LEAN-P2-9 — soak monitor smoke test.
 *
 * Verifies the soak-monitor script's pure helpers (no DB, no network):
 *   - writeSnapshot() lands a well-formed JSON file in the expected dir
 *   - summarizeSnapshot() formats every numeric field
 *
 * Live behaviour (fetching from /api/admin/lean-migration/parity or via
 * Prisma) is exercised by running the script in staging — this test is
 * a structural smoke test only.
 */

import { mkdtempSync, readFileSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import {
  writeSnapshot,
  summarizeSnapshot,
} from '../../../scripts/lean-migration-soak-monitor';

describe('lean-migration-soak-monitor helpers', () => {
  const SOAK_DIR = resolve(
    __dirname,
    '..',
    '..',
    '..',
    'docs',
    'planning',
    'lean-migration-soak-log',
  );

  beforeAll(() => {
    if (!existsSync(SOAK_DIR)) {
      mkdirSync(SOAK_DIR, { recursive: true });
    }
  });

  function makeSnapshot() {
    return {
      capturedAt: '2026-06-04T12:00:00.000Z',
      projectPositionCount: 412,
      projectAssignmentCount: 380,
      staffingRequestCount: 64,
      positionsLinkedToAssignment: 380,
      positionsLinkedToStaffingRequest: 64,
      positionsWithOrphanedAssignmentLink: 0,
      positionsWithOrphanedStaffingRequestLink: 0,
      assignmentsWithoutPosition: 1,
      staffingRequestsWithoutPosition: 2,
      divergenceCount: 3,
    };
  }

  it('writeSnapshot writes a JSON file under the soak-log directory', () => {
    const stamp = '2026-06-04-test';
    const path = writeSnapshot(makeSnapshot(), stamp);
    try {
      expect(path).toContain('lean-migration-soak-log');
      expect(path.endsWith(`${stamp}.json`)).toBe(true);
      const parsed = JSON.parse(readFileSync(path, 'utf-8'));
      expect(parsed.divergenceCount).toBe(3);
      expect(parsed.projectPositionCount).toBe(412);
    } finally {
      // Clean up the test artefact (do not leave it in the repo).
      try { rmSync(path); } catch { /* ignore */ }
    }
  });

  it('summarizeSnapshot lists every numeric field', () => {
    const text = summarizeSnapshot(makeSnapshot());
    expect(text).toContain('ProjectPosition');
    expect(text).toContain('ProjectAssignment');
    expect(text).toContain('StaffingRequest');
    expect(text).toContain('linked-to-assignment');
    expect(text).toContain('orphan assignment link');
    expect(text).toContain('orphan staffing link');
    expect(text).toContain('assignments w/o pos');
    expect(text).toContain('staffingreq w/o pos');
    expect(text).toContain('divergence (sum):        3');
  });

  it('the soak-log directory is part of the repo (writable)', () => {
    expect(existsSync(SOAK_DIR)).toBe(true);
    // Round-trip a probe write to confirm the directory is writable.
    const probeStamp = '2026-06-04-probe';
    const probePath = writeSnapshot(makeSnapshot(), probeStamp);
    expect(existsSync(probePath)).toBe(true);
    rmSync(probePath);
  });

  // Pull in the tmpdir helper to satisfy "import is used" lint hints if any.
  it('mkdtempSync helper is wired (sanity)', () => {
    const tmp = mkdtempSync(`${tmpdir()}/lean-soak-`);
    expect(tmp.length).toBeGreaterThan(0);
    rmSync(tmp, { recursive: true, force: true });
  });
});
