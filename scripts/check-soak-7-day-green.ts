#!/usr/bin/env ts-node
/**
 * SoT PR 19 — 7-day soak acceptance gate.
 *
 * Reads the last 7 daily soak snapshots written by
 * `scripts/lean-migration-soak-monitor.ts` from
 * `docs/planning/lean-migration-soak-log/YYYY-MM-DD.json` and verifies
 * that every snapshot meets the green threshold defined by the C0 exit
 * checklist (`docs/planning/lean-migration-c0-exit-checklist.md`).
 *
 * Green threshold per snapshot (all must be 0):
 *   - divergenceCount
 *   - positionsWithOrphanedAssignmentLink
 *   - positionsWithOrphanedStaffingRequestLink
 *   - assignmentsWithoutPosition
 *   - staffingRequestsWithoutPosition
 *
 * Any missing day in the trailing 7-day window fails the gate. Any day
 * with a non-zero probe fails the gate.
 *
 * Usage:
 *   npx ts-node --transpile-only --project tsconfig.json \
 *     scripts/check-soak-7-day-green.ts
 *
 *   # Override the "today" anchor (used by tests + ad-hoc back-checks).
 *   npx ts-node --transpile-only --project tsconfig.json \
 *     scripts/check-soak-7-day-green.ts --asOf=2026-06-09
 *
 *   # Read snapshots from a different directory (used by tests).
 *   npx ts-node --transpile-only --project tsconfig.json \
 *     scripts/check-soak-7-day-green.ts --dir=/tmp/soak-fixture
 *
 * Exit code:
 *   0 — all 7 trailing days exist and meet the green threshold
 *   1 — at least one day is missing or fails the threshold
 *   2 — unhandled runtime error
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

export interface SoakSnapshot {
  capturedAt: string;
  projectPositionCount: number;
  projectAssignmentCount: number;
  staffingRequestCount: number;
  positionsLinkedToAssignment: number;
  positionsLinkedToStaffingRequest: number;
  positionsWithOrphanedAssignmentLink: number;
  positionsWithOrphanedStaffingRequestLink: number;
  assignmentsWithoutPosition: number;
  staffingRequestsWithoutPosition: number;
  divergenceCount: number;
}

export interface DayResult {
  stamp: string;
  status: 'green' | 'red' | 'missing';
  reason?: string;
  snapshot?: SoakSnapshot;
}

export interface SoakAcceptanceReport {
  asOf: string;
  windowDays: number;
  days: DayResult[];
  pass: boolean;
}

const DEFAULT_SOAK_LOG_DIR = resolve(
  __dirname,
  '..',
  'docs',
  'planning',
  'lean-migration-soak-log',
);

const WINDOW_DAYS = 7;

export function stampForDate(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function trailingStamps(asOf: Date, windowDays: number = WINDOW_DAYS): string[] {
  const out: string[] = [];
  for (let i = 0; i < windowDays; i += 1) {
    const d = new Date(asOf.getTime());
    d.setUTCDate(d.getUTCDate() - i);
    out.push(stampForDate(d));
  }
  return out;
}

export function isGreen(s: SoakSnapshot): { green: boolean; reason?: string } {
  const checks: Array<[keyof SoakSnapshot, number]> = [
    ['divergenceCount', s.divergenceCount],
    ['positionsWithOrphanedAssignmentLink', s.positionsWithOrphanedAssignmentLink],
    ['positionsWithOrphanedStaffingRequestLink', s.positionsWithOrphanedStaffingRequestLink],
    ['assignmentsWithoutPosition', s.assignmentsWithoutPosition],
    ['staffingRequestsWithoutPosition', s.staffingRequestsWithoutPosition],
  ];
  for (const [name, value] of checks) {
    if (typeof value !== 'number' || Number.isNaN(value) || value > 0) {
      return { green: false, reason: `${String(name)}=${value}` };
    }
  }
  return { green: true };
}

export function loadSnapshot(dir: string, stamp: string): SoakSnapshot | null {
  const path = resolve(dir, `${stamp}.json`);
  if (!existsSync(path)) {
    return null;
  }
  const raw = readFileSync(path, 'utf-8');
  return JSON.parse(raw) as SoakSnapshot;
}

export function evaluate(
  dir: string,
  asOf: Date,
  windowDays: number = WINDOW_DAYS,
): SoakAcceptanceReport {
  const stamps = trailingStamps(asOf, windowDays);
  const days: DayResult[] = stamps.map((stamp) => {
    const snapshot = loadSnapshot(dir, stamp);
    if (!snapshot) {
      return { stamp, status: 'missing', reason: 'snapshot file not found' };
    }
    const { green, reason } = isGreen(snapshot);
    if (!green) {
      return { stamp, status: 'red', reason, snapshot };
    }
    return { stamp, status: 'green', snapshot };
  });
  const pass = days.every((d) => d.status === 'green');
  return { asOf: stampForDate(asOf), windowDays, days, pass };
}

export function summarise(report: SoakAcceptanceReport): string {
  const lines: string[] = [
    `7-day soak acceptance check @ ${report.asOf}`,
    `Window: ${report.windowDays} trailing days`,
    '',
  ];
  for (const d of report.days) {
    const marker = d.status === 'green' ? 'ok    ' : 'FAIL  ';
    const detail = d.status === 'green' ? '' : ` (${d.status}${d.reason ? `: ${d.reason}` : ''})`;
    lines.push(`${marker}${d.stamp}${detail}`);
  }
  lines.push('');
  lines.push(report.pass ? 'PASS — 7-day soak gate is GREEN' : 'FAIL — 7-day soak gate is RED');
  return lines.join('\n');
}

function parseAsOf(argv: string[]): Date {
  const arg = argv.find((a) => a.startsWith('--asOf='));
  if (!arg) return new Date();
  const value = arg.slice('--asOf='.length);
  // Anchor to UTC noon so trailingStamps walks distinct UTC days even when
  // the runner's local clock is east of UTC.
  const d = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid --asOf=${value} (expected YYYY-MM-DD)`);
  }
  return d;
}

function parseDir(argv: string[]): string {
  const arg = argv.find((a) => a.startsWith('--dir='));
  if (!arg) return DEFAULT_SOAK_LOG_DIR;
  return resolve(arg.slice('--dir='.length));
}

function main(): void {
  const asOf = parseAsOf(process.argv.slice(2));
  const dir = parseDir(process.argv.slice(2));
  if (!existsSync(dir)) {
    console.error(`Soak log dir not found: ${dir}`);
    process.exit(1);
  }
  // Bonus: list what's actually on disk so a failed gate explains itself.
  const present = readdirSync(dir).filter((f) => f.endsWith('.json'));
  const report = evaluate(dir, asOf);
  console.log(summarise(report));
  console.log('');
  console.log(`Snapshots on disk: ${present.length}`);
  process.exit(report.pass ? 0 : 1);
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error(e instanceof Error ? e.stack : e);
    process.exit(2);
  }
}
