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
    // EPIC A added an onEditBudget prop, so MoneyPanel is no longer self-closing
    // right after projectId — assert it's the surface with dashboard + projectId.
    expect(src).toMatch(/<MoneyPanel dashboard=\{dashboard\} projectId=\{projectId\}/);
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

describe('SoT PR 17g — outer finance strip removed per DS canvas', () => {
  const src = readFileSync('src/routes/projects/tabs/MoneyTab.tsx', 'utf-8');

  it('does NOT render the outer finance-strip wrapper (MoneyPanel covers EVM signals)', () => {
    expect(src).not.toMatch(/data-testid="money-tab-finance-strip"/);
    expect(src).not.toMatch(/data-testid="money-tab-cpi"/);
    expect(src).not.toMatch(/data-testid="money-tab-budget-status"/);
    expect(src).not.toMatch(/data-testid="money-tab-open-positions"/);
  });

  it('does NOT define duplicate BUDGET_STATUS_TONE / BUDGET_STATUS_LABEL maps', () => {
    expect(src).not.toMatch(/BUDGET_STATUS_TONE/);
    expect(src).not.toMatch(/BUDGET_STATUS_LABEL/);
  });
});
