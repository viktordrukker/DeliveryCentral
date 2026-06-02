/**
 * ds-trunk-185 — /cases Operational Queue v2 chrome.
 *
 * Source-string assertions verifying the dsRefresh-ON branch composes
 * a PageHeader + kpi-strip wrapper around the existing CasesPanel. The
 * legacy (dsRefresh-OFF) branch keeps the bare PageContainer + CasesPanel
 * surface unchanged.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('ds-trunk-185 — Cases page v2 chrome', () => {
  const src = readFileSync('src/routes/cases/CasesPage.tsx', 'utf-8');

  it('gates the v2 chrome behind dsRefresh', () => {
    expect(src).toMatch(/const dsRefreshEnabled = isFeatureEnabled\('dsRefresh'\)/);
    expect(src).toMatch(/if \(dsRefreshEnabled\)/);
  });

  it('renders a PageHeader with the Cases breadcrumb on the v2 branch', () => {
    expect(src).toMatch(/<PageHeader\b/);
    expect(src).toMatch(/breadcrumbs=\{\[\{ href: '\/', label: 'Home' \}, \{ label: 'Cases' \}\]\}/);
    expect(src).toMatch(/title="Cases"/);
  });

  it('renders a kpi-strip with at least three Link tiles on the v2 branch', () => {
    expect(src).toMatch(/className="kpi-strip"/);
    const linkTiles = src.match(/<Link\s+className="kpi-strip__item"/g) ?? [];
    expect(linkTiles.length).toBeGreaterThanOrEqual(3);
  });

  it('mounts CasesPanel inside the v2 chrome (no rebuild of the existing list/filters)', () => {
    expect(src).toMatch(/<CasesPanel \/>/);
  });

  it('preserves the legacy branch — bare PageContainer + CasesPanel when dsRefresh is off', () => {
    // The fallback return must still wrap CasesPanel directly in PageContainer
    // without the v2 PageHeader/kpi-strip chrome.
    expect(src).toMatch(/return \(\s*<PageContainer testId="cases-page" viewport>\s*<CasesPanel \/>\s*<\/PageContainer>\s*\);\s*\}\s*$/);
  });
});
