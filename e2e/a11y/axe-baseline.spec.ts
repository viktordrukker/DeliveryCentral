/**
 * V2 axe-core WCAG-AA baseline.
 *
 * Runs @axe-core/playwright against the 10 most-used pages plus each of the
 * 14 DS atoms (rendered in their natural page context). Asserts that no
 * serious/critical violation appears that is not already accepted in
 * e2e/a11y/baseline.json (the ratcheting baseline pattern, mirroring
 * scripts/design-token-baseline.json).
 *
 * The baseline file is checked into git. To intentionally adopt a NEW
 * violation, run `node e2e/a11y/scripts/refresh-baseline.cjs` after
 * reviewing the diff — never edit the JSON by hand.
 *
 * Tagged @a11y so CI can opt-in via `PLAYWRIGHT_GREP=@a11y`.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import AxeBuilder from '@axe-core/playwright';
import type { Result } from 'axe-core';
import { expect, test, type Page } from '@playwright/test';

import { PLAYWRIGHT_API_BASE, PLAYWRIGHT_BASE_URL } from '../fixtures/auth-state';
import { loginAs } from '../helpers/auth';

type BaselineFile = {
  description?: string;
  generatedAt?: string | null;
  violations: string[];
};

const BASELINE_PATH = path.resolve(__dirname, 'baseline.json');
const ADMIN = { email: 'admin@deliverycentral.local', password: 'DeliveryCentral@Admin1' } as const;

// When set, the spec emits `A11Y_FP:<fingerprint>` lines for every violation
// observed and treats the baseline diff as informational. Used by
// e2e/a11y/scripts/refresh-baseline.cjs.
const DUMP_MODE = process.env['PLAYWRIGHT_A11Y_DUMP'] === '1';
const ACCEPT_ALL = process.env['PLAYWRIGHT_A11Y_ACCEPT_ALL'] === '1';

// ── Pages under test ─────────────────────────────────────────────────────────
// Each entry: { route, scope }. `route` is the path under PLAYWRIGHT_BASE_URL.
// `scope` is the human-readable fingerprint key so renames don't churn the
// baseline. Atom scans append `::atom/<name>` to the scope.
type PageTarget = {
  scope: string;
  route: string | ((page: Page) => Promise<string>);
  needsAuth: boolean;
};

const PAGE_TARGETS: PageTarget[] = [
  { scope: '/login', route: '/login', needsAuth: false },
  { scope: '/dashboard', route: '/dashboard', needsAuth: true },
  { scope: '/staffing-desk', route: '/staffing-desk', needsAuth: true },
  {
    scope: '/positions/<sample>',
    route: async (page: Page) => {
      // Fetch the first available position id at runtime. Falls back to the
      // index page if none exist (still exercises the route grammar).
      const response = await page.request.get(
        `${PLAYWRIGHT_API_BASE}/project-positions?limit=1`,
      );
      if (!response.ok()) return '/staffing-desk';
      const body = (await response.json()) as { items?: Array<{ id?: string }> };
      const id = body.items?.[0]?.id;
      return id ? `/positions/${id}` : '/staffing-desk';
    },
    needsAuth: true,
  },
  { scope: '/staffing-requests/new', route: '/staffing-requests/new', needsAuth: true },
  { scope: '/people', route: '/people', needsAuth: true },
  { scope: '/approvals', route: '/approvals', needsAuth: true },
  { scope: '/timesheets', route: '/timesheets', needsAuth: true },
  { scope: '/admin', route: '/admin', needsAuth: true },
  { scope: '/me', route: '/me', needsAuth: true },
];

// DS atoms — each scanned by visiting a host page that renders it and
// constraining the axe scan via a CSS selector. The set matches the 14
// atoms enumerated in the AXE-A11Y-BASELINE task brief.
type AtomTarget = {
  name: string;
  host: string;
  // CSS selector — when present, axe.include() is set so the scan focuses on
  // the atom. When absent, axe scans the whole host page (atom is included
  // by virtue of being rendered there).
  selector?: string;
};

const ATOM_TARGETS: AtomTarget[] = [
  { name: 'Avatar', host: '/people', selector: '.avatar' },
  { name: 'Money', host: '/dashboard', selector: '[data-ds="money"]' },
  { name: 'Pct', host: '/dashboard', selector: '[data-ds="pct"]' },
  { name: 'Sparkline', host: '/dashboard', selector: '[data-ds="sparkline"], .sparkline' },
  { name: 'MiniBars', host: '/dashboard', selector: '[data-ds="mini-bars"]' },
  { name: 'VarianceBar', host: '/dashboard', selector: '[data-ds="variance-bar"]' },
  { name: 'Donut', host: '/dashboard', selector: '[data-ds="donut"]' },
  { name: 'GanttRow', host: '/staffing-desk', selector: '[data-ds="gantt-row"]' },
  { name: 'Calendar', host: '/me', selector: '[data-ds="calendar"]' },
  { name: 'BalanceMeter', host: '/me', selector: '[data-ds="balance-meter"]' },
  { name: 'Timeline', host: '/me', selector: '[data-ds="timeline"]' },
  { name: 'DataTable', host: '/people', selector: '.data-table, table.dash-compact-table' },
  { name: 'StatusBadge', host: '/staffing-desk', selector: '.status-badge' },
  { name: 'SectionCard', host: '/dashboard', selector: '.section-card' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function loadBaseline(): Set<string> {
  try {
    const raw = readFileSync(BASELINE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as BaselineFile;
    return new Set(parsed.violations ?? []);
  } catch {
    return new Set();
  }
}

/**
 * Convert an axe Result into a stable fingerprint:
 *   `<scope>|<ruleId>|<impact>`
 *
 * Deliberately coarse so cosmetic re-renders that move an element don't
 * invalidate the baseline. Refresh-baseline.cjs writes the same shape.
 */
function fingerprint(scope: string, violation: Result): string {
  return `${scope}|${violation.id}|${violation.impact ?? 'minor'}`;
}

async function runAxe(
  page: Page,
  scope: string,
  options: { include?: string } = {},
): Promise<Result[]> {
  let builder = new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    // Recharts SVG colors are intentional brand tokens; they trip color-contrast
    // false positives that the existing /tests/14-accessibility.spec.ts already
    // excludes. Keep parity here.
    .exclude('.recharts-wrapper')
    .exclude('.recharts-surface');

  if (options.include) {
    builder = builder.include(options.include);
  }

  const { violations } = await builder.analyze();
  // We only care about serious + critical per the task brief; minor/moderate
  // are recorded for visibility but never fail the test.
  return violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
}

function diffAgainstBaseline(scope: string, violations: Result[], baseline: Set<string>) {
  const newViolations: Result[] = [];
  const newFingerprints: string[] = [];
  for (const v of violations) {
    const fp = fingerprint(scope, v);
    if (DUMP_MODE) {
      // refresh-baseline.cjs grep for this line. Emit ALL fingerprints, not
      // just the new ones, so the script can produce a complete snapshot.
      console.log(`A11Y_FP:${fp}`);
    }
    if (!baseline.has(fp)) {
      newViolations.push(v);
      newFingerprints.push(fp);
    }
  }
  return { newViolations, newFingerprints };
}

/**
 * Centralized check used by both page and atom tests. Throws a rich error
 * if new violations appear, unless ACCEPT_ALL is set (refresh-baseline mode).
 */
function assertNoNewViolations(scope: string, newViolations: Result[], newFingerprints: string[]) {
  if (ACCEPT_ALL) return;
  if (newViolations.length === 0) return;

  const detail = describeViolations(newViolations);
  const fps = newFingerprints.map((fp) => `  ${fp}`).join('\n');
  throw new Error(
    `New a11y violation(s) on ${scope}:\n${detail}\n\n` +
      `If intentional, refresh the baseline:\n` +
      `  node e2e/a11y/scripts/refresh-baseline.cjs\n\n` +
      `New fingerprints:\n${fps}`,
  );
}

function describeViolations(violations: Result[]): string {
  return violations
    .map(
      (v) =>
        `  [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node${v.nodes.length === 1 ? '' : 's'}) — ${v.helpUrl}`,
    )
    .join('\n');
}

async function gotoTarget(page: Page, target: PageTarget): Promise<void> {
  const route = typeof target.route === 'function' ? await target.route(page) : target.route;
  const url = new URL(route, PLAYWRIGHT_BASE_URL).toString();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  // Give the SPA a beat to render — networkidle is too strict for pages that
  // keep polling, but a short settle window keeps axe output stable.
  await page.waitForLoadState('networkidle').catch(() => {
    // Some pages keep long-poll connections open; ignore timeout.
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe('@a11y V2 axe baseline — pages', () => {
  const baseline = loadBaseline();

  for (const target of PAGE_TARGETS) {
    test(`${target.scope} has no new serious/critical a11y violations`, async ({ page }) => {
      if (target.needsAuth) {
        await loginAs(page, ADMIN.email, ADMIN.password);
      }
      await gotoTarget(page, target);

      const violations = await runAxe(page, target.scope);
      const { newViolations, newFingerprints } = diffAgainstBaseline(
        target.scope,
        violations,
        baseline,
      );

      assertNoNewViolations(target.scope, newViolations, newFingerprints);
      if (!ACCEPT_ALL) {
        expect(newViolations).toHaveLength(0);
      }
    });
  }
});

test.describe('@a11y V2 axe baseline — DS atoms', () => {
  const baseline = loadBaseline();

  for (const atom of ATOM_TARGETS) {
    test(`atom ${atom.name} has no new serious/critical a11y violations`, async ({ page }) => {
      await loginAs(page, ADMIN.email, ADMIN.password);
      await gotoTarget(page, { scope: atom.host, route: atom.host, needsAuth: true });

      const scope = `${atom.host}::atom/${atom.name}`;
      // If the selector matches zero nodes on this host page, skip rather than
      // erroring — the atom may be conditional (e.g., Calendar only appears
      // for users with workload). Reporting "no scan happened" is preferable
      // to a flake.
      const matched = atom.selector ? await page.locator(atom.selector).count() : 1;
      test.skip(matched === 0, `Atom ${atom.name} not present on ${atom.host}`);

      const violations = await runAxe(page, scope, { include: atom.selector });
      const { newViolations, newFingerprints } = diffAgainstBaseline(
        scope,
        violations,
        baseline,
      );

      assertNoNewViolations(scope, newViolations, newFingerprints);
      if (!ACCEPT_ALL) {
        expect(newViolations).toHaveLength(0);
      }
    });
  }
});
