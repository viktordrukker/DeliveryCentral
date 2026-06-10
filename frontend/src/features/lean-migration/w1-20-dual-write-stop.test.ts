/**
 * W1-20 — STOP dual-writing /staffing-requests + /assignments from the
 * staffing-desk + PM dashboard + Workload Overview + Director dashboard
 * surfaces.
 *
 * The lean migration audit (LEAN-P2-8 callsite-audit) catalogues every
 * remaining import of the legacy `@/lib/api/assignments` and
 * `@/lib/api/staffing-requests` clients. The Wave 1 BLOCKER scope of W1-20
 * is narrower than the global Phase 2 exit-gate: the four high-traffic
 * pages and the dashboard hooks layer must contain **zero** imports of the
 * legacy clients — not even type-only — so the canonical
 * `@/lib/api/project-positions` aggregate is the *only* code path that
 * these surfaces depend on.
 *
 * This guardrail is stricter than `phase2-exit-gate.test.ts`: that suite
 * only fails on a *runtime* import. W1-20 also bans `import type` from the
 * scoped files. The four pages already conform today — this test locks the
 * scope so any future regression (someone re-introduces a legacy type
 * alias in one of these files) is caught before merge.
 *
 * Scope (from the W1-20 brief):
 *  - frontend/src/lib/api/staffing-desk.ts
 *  - frontend/src/routes/staffing-desk/StaffingDeskPage.tsx
 *  - frontend/src/routes/dashboard/DashboardPage.tsx (Workload Overview)
 *  - frontend/src/routes/dashboard/ProjectManagerDashboardPage.tsx
 *  - frontend/src/routes/dashboard/DirectorDashboardPage.tsx
 *  - frontend/src/features/dashboard/*.ts (every dashboard hook)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const FRONTEND_SRC = resolve(__dirname, '..', '..');

const W1_20_SCOPE: readonly string[] = [
  'lib/api/staffing-desk.ts',
  'routes/staffing-desk/StaffingDeskPage.tsx',
  'routes/dashboard/DashboardPage.tsx',
  'routes/dashboard/ProjectManagerDashboardPage.tsx',
  'routes/dashboard/DirectorDashboardPage.tsx',
];

function listDashboardHooks(): string[] {
  const dir = join(FRONTEND_SRC, 'features', 'dashboard');
  return readdirSync(dir)
    .filter((entry) => {
      const full = join(dir, entry);
      if (!statSync(full).isFile()) return false;
      if (!entry.endsWith('.ts') && !entry.endsWith('.tsx')) return false;
      // Skip the colocated test files — those *should* be allowed to mock
      // the legacy modules even though the production hooks must not.
      if (entry.endsWith('.test.ts') || entry.endsWith('.test.tsx')) return false;
      return true;
    })
    .map((entry) => `features/dashboard/${entry}`);
}

function fileHasLegacyImport(absPath: string): {
  hasImport: boolean;
  matchedLines: string[];
} {
  const text = readFileSync(absPath, 'utf8');
  const lines = text.split('\n');
  const matched: string[] = [];
  for (const line of lines) {
    if (/from\s+'@\/lib\/api\/(assignments|staffing-requests)'/.test(line)) {
      matched.push(line);
    }
  }
  return { hasImport: matched.length > 0, matchedLines: matched };
}

describe('W1-20 — staffing-desk + dashboards do not import legacy assignments/staffing-requests', () => {
  it('the four named files have zero legacy client imports', () => {
    const offenders: Array<{ file: string; lines: string[] }> = [];
    for (const rel of W1_20_SCOPE) {
      const abs = join(FRONTEND_SRC, rel);
      const { hasImport, matchedLines } = fileHasLegacyImport(abs);
      if (hasImport) {
        offenders.push({ file: rel, lines: matchedLines });
      }
    }

    if (offenders.length > 0) {
      const message = offenders
        .map((o) => `  - ${o.file}\n${o.lines.map((l) => `      ${l}`).join('\n')}`)
        .join('\n');
      throw new Error(
        `W1-20 violation: legacy client imports re-introduced into the staffing-desk / dashboard scope.\n` +
          `Migrate the offending import to '@/lib/api/project-positions' — the legacy clients ` +
          `(@/lib/api/assignments and @/lib/api/staffing-requests) were deleted in SoT PR 17b:\n${message}`,
      );
    }

    expect(offenders).toEqual([]);
  });

  it('every dashboard hook has zero legacy client imports', () => {
    const hooks = listDashboardHooks();
    expect(hooks.length).toBeGreaterThan(0);
    const offenders: Array<{ file: string; lines: string[] }> = [];
    for (const rel of hooks) {
      const abs = join(FRONTEND_SRC, rel);
      const { hasImport, matchedLines } = fileHasLegacyImport(abs);
      if (hasImport) {
        offenders.push({ file: rel, lines: matchedLines });
      }
    }

    if (offenders.length > 0) {
      const message = offenders
        .map((o) => `  - ${o.file}\n${o.lines.map((l) => `      ${l}`).join('\n')}`)
        .join('\n');
      throw new Error(
        `W1-20 violation: a dashboard hook imports from the legacy assignments/staffing-requests client. ` +
          `The dashboards must read only via '@/lib/api/project-positions' or its bespoke server-aggregated ` +
          `dashboard endpoints. Files:\n${message}`,
      );
    }

    expect(offenders).toEqual([]);
  });
});
