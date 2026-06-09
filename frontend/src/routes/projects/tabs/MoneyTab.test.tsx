/**
 * SoT PR 5 — MoneyTab DS canvas conformance.
 *
 * The legacy "Budget administration" collapsible was removed per DS canvas
 * (DS/page-pulse.jsx has no collapsible). MoneyPanel is the only primary
 * surface; CpiWhatIfCard renders below it.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('SoT PR 5 — MoneyTab surface', () => {
  const src = readFileSync('src/routes/projects/tabs/MoneyTab.tsx', 'utf-8');

  it('fetches the project budget dashboard on mount', () => {
    expect(src).toMatch(/fetchProjectBudgetDashboard\(projectId\)/);
  });

  it('renders MoneyPanel as the canvas-faithful primary surface', () => {
    expect(src).toMatch(/<MoneyPanel dashboard=\{dashboard\} projectId=\{projectId\} \/>/);
  });

  it('does NOT render the legacy "Budget administration" collapsible', () => {
    expect(src).not.toMatch(/title="Budget administration"/);
    expect(src).not.toMatch(/<BudgetTab/);
  });

  it('exposes a money-tab testId', () => {
    expect(src).toMatch(/data-testid="money-tab"/);
  });

  it('renders loading + error states', () => {
    expect(src).toMatch(/<LoadingState/);
    expect(src).toMatch(/<ErrorState/);
  });
});

describe('W2-07 — MoneyTab BE finance strip', () => {
  const src = readFileSync('src/routes/projects/tabs/MoneyTab.tsx', 'utf-8');

  it('accepts an optional project prop carrying ProjectDetails', () => {
    expect(src).toMatch(/project\?:\s*ProjectDetails\s*\|\s*null/);
  });

  it('reads cpi / budgetStatus / openPositionsCount from project', () => {
    expect(src).toMatch(/project\?\.cpi/);
    expect(src).toMatch(/project\?\.budgetStatus/);
    expect(src).toMatch(/project\?\.openPositionsCount/);
  });

  it('renders the finance strip with three testIds the QA walk can hit', () => {
    expect(src).toMatch(/data-testid="money-tab-finance-strip"/);
    expect(src).toMatch(/data-testid="money-tab-cpi"/);
    expect(src).toMatch(/data-testid="money-tab-budget-status"/);
    expect(src).toMatch(/data-testid="money-tab-open-positions"/);
  });

  it('maps budgetStatus enum to StatusBadge tones (no raw hex)', () => {
    expect(src).toMatch(/GREEN: 'active'/);
    expect(src).toMatch(/YELLOW: 'warning'/);
    expect(src).toMatch(/RED: 'danger'/);
    expect(src).toMatch(/UNSET: 'neutral'/);
  });
});
