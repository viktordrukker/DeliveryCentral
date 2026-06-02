/**
 * V2 Scope §4 item 4 — /projects List-Detail Law-9 drilldown wiring.
 *
 * Source-string assertions verifying that the ProjectsPage:
 *  1. Imports the dsRefresh feature-flag gate.
 *  2. Parses the 5 Law-9 drilldown params (status / cpiBelow / budgetStatus /
 *     hasOpenGaps / closingInDays) plus the view-mode switch (view) via
 *     useFilterParams defaults.
 *  3. References each new param inside the filter pipeline.
 *  4. Gates the new filter branch behind the dsRefresh flag so the legacy
 *     OFF-path keeps current semantics.
 *  5. Documents the BE-data-shape caveat so reviewers know the no-op fields.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('V2 §4.4 — ProjectsPage Law-9 drilldown params', () => {
  const src = readFileSync('src/routes/projects/ProjectsPage.tsx', 'utf-8');

  it('imports the dsRefresh feature-flag gate', () => {
    expect(src).toMatch(/import\s+\{\s*isFeatureEnabled\s*\}\s+from\s+'@\/lib\/feature-flags'/);
    expect(src).toMatch(/isFeatureEnabled\('dsRefresh'\)/);
  });

  it('FILTER_DEFAULTS includes all 6 Law-9 / view-mode params', () => {
    expect(src).toMatch(/status:\s*''/);
    expect(src).toMatch(/cpiBelow:\s*''/);
    expect(src).toMatch(/budgetStatus:\s*''/);
    expect(src).toMatch(/hasOpenGaps:\s*''/);
    expect(src).toMatch(/closingInDays:\s*''/);
    expect(src).toMatch(/view:\s*''/);
  });

  it('filter pipeline references each Law-9 param', () => {
    expect(src).toMatch(/filters\.status/);
    expect(src).toMatch(/filters\.cpiBelow/);
    expect(src).toMatch(/filters\.budgetStatus/);
    expect(src).toMatch(/filters\.hasOpenGaps/);
    expect(src).toMatch(/filters\.closingInDays/);
  });

  it('gates the new filter branch behind dsRefreshEnabled', () => {
    expect(src).toMatch(/const\s+dsRefreshEnabled\s*=\s*isFeatureEnabled\('dsRefresh'\)/);
    expect(src).toMatch(/if\s*\(dsRefreshEnabled\)/);
  });

  it('documents the BE-data-shape no-op caveat for reviewers', () => {
    // Mention either the BE sweep PR or the no-op caveat for filtering.
    expect(src).toMatch(/no-op/i);
    expect(src).toMatch(/plannedEndDate|cpi/);
  });
});
