/**
 * V2-A.10 / V2-A.11 — Time Management page chrome.
 *
 * Source-string assertions verifying the dsRefresh-gated PageHeader chrome
 * and the inline anomaly column on the approval queue. Full-render coverage
 * is intentionally avoided here (the page wires 5+ data sources); the
 * anomaly heuristic itself is unit-tested in TimesheetInspectorDrawer.test.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('V2-A.10/A.11 — TimeManagementPage chrome', () => {
  const src = readFileSync('src/routes/time-management/TimeManagementPage.tsx', 'utf-8');

  it('gates all new chrome behind dsRefresh', () => {
    expect(src).toMatch(/const dsRefreshEnabled = isFeatureEnabled\('dsRefresh'\)/);
  });

  it('A10: renders a dsRefresh-gated PageHeader with breadcrumb + awaiting + SLA badges', () => {
    expect(src).toMatch(/dsRefreshEnabled \? \(\s*<PageHeader/);
    expect(src).toMatch(/breadcrumbs=\{\[\{ href: '\/', label: 'Home' \}, \{ label: 'Time Management' \}\]\}/);
    expect(src).toMatch(/label=\{`\$\{pendingCount\} awaiting you`\}/);
    expect(src).toMatch(/label="SLA · 24h"/);
  });

  it('A11: inserts a dsRefresh-gated anomaly column reusing deriveAnomalies', () => {
    expect(src).toMatch(/\.\.\.\(dsRefreshEnabled/);
    expect(src).toMatch(/deriveAnomalies\(\{ totalHours: item\.totalHours, overtimeHours: item\.overtimeHours \}\)/);
    expect(src).toMatch(/label="Clean"/);
  });
});
