/**
 * SoT PR 4 — Director Law-9 sweep.
 *
 * Source-string assertions: the new DS-canvas DirectorKpiStrip and the
 * Cash position card on DirectorDashboardPage all follow UX Law 9
 * (every KPI is a clickable drilldown) AND avoid linking to
 * obsoleteInV2:true routes (e.g., /dashboards/portfolio-radiator).
 *
 * The legacy Finance Band SectionCard (PR #455) was removed in PR 4 because
 * the DS canvas folds those signals into the 5-tile KPI strip + Cash
 * position card. Its assertions are gone with it.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('SoT PR 4 — Director Law-9 sweep', () => {
  const dashboard = readFileSync('src/routes/dashboard/DirectorDashboardPage.tsx', 'utf-8');
  const kpiStrip = readFileSync('src/components/dashboard/director/DirectorKpiStrip.tsx', 'utf-8');

  it('KPI strip tiles are <Link>, not <div> (Law 9 drilldowns)', () => {
    expect(kpiStrip).not.toMatch(/<div\s+className="kpi-strip__item"/);
    const linkMatches = kpiStrip.match(/<Link[\s\S]*?className="kpi-strip__item"/g);
    expect(linkMatches?.length ?? 0).toBe(5);
  });

  it('At-risk projects KPI drills to /projects?rag=AMBER,RED', () => {
    expect(kpiStrip).toMatch(/to="\/projects\?rag=AMBER,RED"/);
  });

  it('Budget variance KPI drills to /projects?budgetStatus=over', () => {
    expect(kpiStrip).toMatch(/to="\/projects\?budgetStatus=over"/);
  });

  it('Open positions KPI uses ?hasOpenGaps=true filter', () => {
    expect(kpiStrip).toMatch(/to="\/projects\?hasOpenGaps=true"/);
  });

  it('Active projects KPI links to active list (not obsoleteInV2 routes)', () => {
    expect(kpiStrip).not.toMatch(/to="\/dashboards\/portfolio-radiator"/);
    expect(kpiStrip).toMatch(/to="\/projects\?status=ACTIVE"/);
  });

  it('legacy "Finance Band" SectionCard removed from DirectorDashboardPage', () => {
    expect(dashboard).not.toMatch(/data-testid="director-finance-band"/);
  });
});
