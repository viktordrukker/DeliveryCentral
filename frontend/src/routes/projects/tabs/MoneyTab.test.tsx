/**
 * V2-A.4 — MoneyTab promotion.
 *
 * Source-string assertions verifying that MoneyPanel is the primary
 * surface and BudgetTab is subordinated into a collapsible admin
 * section. Runtime test stays light to avoid pulling in the whole
 * budget-dashboard fetch graph.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('V2-A.4 — MoneyTab surface', () => {
  const src = readFileSync('src/routes/projects/tabs/MoneyTab.tsx', 'utf-8');

  it('fetches the project budget dashboard on mount', () => {
    expect(src).toMatch(/fetchProjectBudgetDashboard\(projectId\)/);
  });

  it('renders MoneyPanel as the canvas-faithful primary surface', () => {
    expect(src).toMatch(/<MoneyPanel dashboard=\{dashboard\} projectId=\{projectId\} \/>/);
  });

  it('subordinates BudgetTab to a collapsible "Budget administration" SectionCard', () => {
    expect(src).toMatch(/title="Budget administration"/);
    expect(src).toMatch(/collapsible/);
    expect(src).toMatch(/defaultCollapsed/);
    expect(src).toMatch(/<BudgetTab projectId=\{projectId\} canvasMode \/>/);
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

describe('V2-A.4 — BudgetTab canvasMode prop', () => {
  const src = readFileSync('src/routes/projects/tabs/BudgetTab.tsx', 'utf-8');

  it('accepts a canvasMode prop with default false', () => {
    expect(src).toMatch(/canvasMode\?: boolean/);
    expect(src).toMatch(/canvasMode = false/);
  });

  it('suppresses its own MoneyPanel render when canvasMode is true', () => {
    expect(src).toMatch(/!canvasMode && dsRefreshEnabled && dashboard \? <MoneyPanel/);
  });
});
