/**
 * V2 Scope §4 item 8 — Director Law-9 sweep.
 *
 * Source-string assertions: the Director dashboard's Finance Band tiles
 * (BE-track / PR #455) and the DirectorKpiStrip drilldown destinations
 * follow Law 9 (every KPI is a clickable drilldown) AND avoid linking to
 * obsoleteInV2:true routes (e.g., /dashboards/portfolio-radiator).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('V2 Scope §4 item 8 — Director Law-9 sweep', () => {
  const dashboard = readFileSync('src/routes/dashboard/DirectorDashboardPage.tsx', 'utf-8');
  const kpiStrip = readFileSync('src/components/dashboard/director/DirectorKpiStrip.tsx', 'utf-8');

  it('Finance Band tiles are <Link>, not <div> (Law 9 drilldowns)', () => {
    // Region marker — the band is data-testid="director-finance-band".
    const start = dashboard.indexOf('data-testid="director-finance-band"');
    expect(start).toBeGreaterThan(-1);
    // Scope to the band block.
    const band = dashboard.slice(start, start + 3500);
    // No <div className="kpi-strip__item" should survive in the Finance Band.
    expect(band).not.toMatch(/<div\s+className="kpi-strip__item"/);
    // All 5 tiles must be <Link> with kpi-strip__item.
    const linkMatches = band.match(/<Link\s+className="kpi-strip__item"/g);
    expect(linkMatches?.length ?? 0).toBe(5);
  });

  it('Finance Band CPI tile drills to /projects?cpiBelow=0.9', () => {
    expect(dashboard).toMatch(/to="\/projects\?cpiBelow=0\.9"/);
  });

  it('Finance Band Over-Budget tile drills to /projects?budgetStatus=over', () => {
    expect(dashboard).toMatch(/to="\/projects\?budgetStatus=over"/);
  });

  it('Finance Band Total/Actual/EV tiles drill to /projects?view=finance', () => {
    const matches = dashboard.match(/to="\/projects\?view=finance"/g);
    expect(matches?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it('Open Gaps KPI uses ?hasOpenGaps=true filter (no longer bare /projects)', () => {
    expect(kpiStrip).toMatch(/to="\/projects\?hasOpenGaps=true"/);
  });

  it('G/A/R KPI no longer links to /dashboards/portfolio-radiator (obsoleteInV2:true)', () => {
    expect(kpiStrip).not.toMatch(/to="\/dashboards\/portfolio-radiator"/);
    // Should now link to active projects list.
    expect(kpiStrip).toMatch(/to="\/projects\?status=ACTIVE"/);
  });
});
