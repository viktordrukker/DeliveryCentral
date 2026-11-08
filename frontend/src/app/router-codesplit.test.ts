/**
 * W4-03 — Code-split assertion.
 *
 * Verifies that the heavy persona dashboards (EmployeeDashboardPage,
 * DashboardPage / Workload Overview) are only referenced via React.lazy
 * dynamic-import — never via a static `import { ... } from '...'`. A
 * regression here would re-couple the dsRefresh-ON bundle to the legacy
 * dashboards and inflate the first-load cost on the v2 cutover.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const FRONTEND_SRC = resolve(__dirname, '..');

function readFile(rel: string): string {
  return readFileSync(resolve(FRONTEND_SRC, rel), 'utf8');
}

const STATIC_IMPORT_PATTERNS: Record<string, RegExp[]> = {
  DashboardPage: [
    /import\s*\{[^}]*\bDashboardPage\b[^}]*\}\s*from\s*['"]@\/routes\/dashboard\/DashboardPage['"]/,
  ],
  EmployeeDashboardPage: [
    /import\s*\{[^}]*\bEmployeeDashboardPage\b[^}]*\}\s*from\s*['"]@\/routes\/dashboard\/EmployeeDashboardPage['"]/,
  ],
};

const LAZY_PATTERNS: Record<string, RegExp[]> = {
  DashboardPage: [
    /lazy\s*\(\s*\(\)\s*=>\s*import\s*\(\s*['"]@\/routes\/dashboard\/DashboardPage['"]/,
  ],
  EmployeeDashboardPage: [
    /lazy\s*\(\s*\(\)\s*=>\s*import\s*\(\s*['"]@\/routes\/dashboard\/EmployeeDashboardPage['"]/,
  ],
};

describe('W4-03 — dashboard chunks split out (no static imports)', () => {
  it('router.tsx does not statically import DashboardPage', () => {
    const src = readFile('app/router.tsx');
    for (const re of STATIC_IMPORT_PATTERNS.DashboardPage) {
      expect(src).not.toMatch(re);
    }
  });

  it('router.tsx does not statically import EmployeeDashboardPage', () => {
    const src = readFile('app/router.tsx');
    for (const re of STATIC_IMPORT_PATTERNS.EmployeeDashboardPage) {
      expect(src).not.toMatch(re);
    }
  });

  it('router.tsx loads EmployeeDashboardPage via React.lazy', () => {
    const src = readFile('app/router.tsx');
    const matched = LAZY_PATTERNS.EmployeeDashboardPage.some((re) => re.test(src));
    expect(matched).toBe(true);
  });

  it('HomeRedirect.tsx does not statically import DashboardPage', () => {
    const src = readFile('routes/HomeRedirect.tsx');
    for (const re of STATIC_IMPORT_PATTERNS.DashboardPage) {
      expect(src).not.toMatch(re);
    }
  });

  it('HomeRedirect.tsx loads DashboardPage via React.lazy', () => {
    const src = readFile('routes/HomeRedirect.tsx');
    const matched = LAZY_PATTERNS.DashboardPage.some((re) => re.test(src));
    expect(matched).toBe(true);
  });
});
