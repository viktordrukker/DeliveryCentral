/**
 * 20c-15 — KPI strip extraction from god dashboard pages.
 *
 * Verifies that the inline `<div className="kpi-strip">` blocks have been
 * lifted out of DirectorDashboardPage and DeliveryManagerDashboardPage
 * into their own per-page components. This is the first pass of the
 * 20c-15 god-page split; further per-tab extractions follow.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('20c-15 — dashboard KPI strip extraction (source-shape)', () => {
  const directorPageSrc = readFileSync(
    'src/routes/dashboard/DirectorDashboardPage.tsx',
    'utf-8',
  );
  const dmPageSrc = readFileSync(
    'src/routes/dashboard/DeliveryManagerDashboardPage.tsx',
    'utf-8',
  );
  const directorKpiSrc = readFileSync(
    'src/components/dashboard/director/DirectorKpiStrip.tsx',
    'utf-8',
  );
  const dmKpiSrc = readFileSync(
    'src/components/dashboard/delivery-manager/DeliveryManagerKpiStrip.tsx',
    'utf-8',
  );

  it('DirectorDashboardPage imports + renders DirectorKpiStrip', () => {
    expect(directorPageSrc).toMatch(
      /import\s*\{\s*DirectorKpiStrip\s*\}\s*from\s*'@\/components\/dashboard\/director\/DirectorKpiStrip'/,
    );
    expect(directorPageSrc).toMatch(/<DirectorKpiStrip\b/);
  });

  it('DirectorKpiStrip exposes the 5 portfolio KPI tiles with data-jtbd', () => {
    // SoT PR 4 — DS canvas (page-director.jsx) collapses the strip to 5 tiles:
    // Active projects · At-risk projects · Budget variance · Utilisation · Open positions.
    const jtbdMatches = directorKpiSrc.match(/data-jtbd="/g);
    expect(jtbdMatches?.length).toBe(5);
  });

  it('DeliveryManagerDashboardPage imports + renders DeliveryManagerKpiStrip', () => {
    expect(dmPageSrc).toMatch(
      /import\s*\{\s*DeliveryManagerKpiStrip\s*\}\s*from\s*'@\/components\/dashboard\/delivery-manager\/DeliveryManagerKpiStrip'/,
    );
    expect(dmPageSrc).toMatch(/<DeliveryManagerKpiStrip\b/);
  });

  it('DeliveryManagerKpiStrip wires the tab-switch callback for the Unstaffed tile', () => {
    expect(dmKpiSrc).toMatch(/onShowPortfolioTab/);
    // Caller (DeliveryManagerDashboardPage) wires `handleTabChange('portfolio')`.
    expect(dmPageSrc).toMatch(/onShowPortfolioTab=\{\(\) =>\s*handleTabChange\('portfolio'\)\}/);
  });

  it('inline <div className="kpi-strip"> blocks no longer live in either page', () => {
    expect(directorPageSrc).not.toMatch(/<div className="kpi-strip"/);
    expect(dmPageSrc).not.toMatch(/<div className="kpi-strip"/);
  });
});
