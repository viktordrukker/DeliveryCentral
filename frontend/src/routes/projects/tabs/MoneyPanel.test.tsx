import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MoneyPanel } from './MoneyPanel';
import type { ProjectBudgetDashboard } from '@/lib/api/project-budget';

const baseDashboard: ProjectBudgetDashboard = {
  budget: { capex: 100_000, opex: 50_000, total: 150_000, fiscalYear: 2026 },
  burnDown: [],
  forecast: { projectedTotalCost: 120_000, remainingBudget: 30_000, onTrack: true },
  byRole: [],
  healthColor: 'green',
};

describe('MoneyPanel', () => {
  it('renders all four KPI tiles when budget is set', () => {
    render(<MoneyPanel dashboard={baseDashboard} />);
    expect(screen.getByTestId('money-panel')).toBeInTheDocument();
    expect(screen.getByText('Budget')).toBeInTheDocument();
    expect(screen.getByText('Projected total')).toBeInTheDocument();
    expect(screen.getByText('Variance')).toBeInTheDocument();
    expect(screen.getByText('Burn ratio')).toBeInTheDocument();
  });

  it('shows fiscal year + CAPEX/OPEX breakdown', () => {
    render(<MoneyPanel dashboard={baseDashboard} />);
    expect(screen.getByText(/FY2026/)).toBeInTheDocument();
  });

  it('shows variance with a signed percentage in green when projected < budget', () => {
    const dash = {
      ...baseDashboard,
      forecast: { projectedTotalCost: 100_000, remainingBudget: 50_000, onTrack: true },
    };
    render(<MoneyPanel dashboard={dash} />);
    // Variance = -50,000 → projected under budget. Signed pct format uses U+2013 (–) for negatives.
    expect(screen.getByText('–33.3%')).toBeInTheDocument();
  });

  it('shows variance over budget in danger color when projected > budget', () => {
    const dash = {
      ...baseDashboard,
      forecast: { projectedTotalCost: 200_000, remainingBudget: -50_000, onTrack: false },
    };
    render(<MoneyPanel dashboard={dash} />);
    expect(screen.getByText('+33.3%')).toBeInTheDocument();
    expect(screen.getByText('attention needed')).toBeInTheDocument();
  });

  it('renders "not set" when budget is null', () => {
    const dash = { ...baseDashboard, budget: null };
    render(<MoneyPanel dashboard={dash} />);
    expect(screen.getByText('not set')).toBeInTheDocument();
  });

  it('burn donut shows danger tone when projected exceeds 95% of budget', () => {
    const dash = {
      ...baseDashboard,
      forecast: { projectedTotalCost: 148_000, remainingBudget: 2_000, onTrack: false },
    };
    const { container } = render(<MoneyPanel dashboard={dash} />);
    const arc = container.querySelectorAll('circle')[1];
    expect(arc.getAttribute('stroke')).toContain('status-danger');
  });

  it('burn donut shows warning tone when burn is 75-95%', () => {
    const dash = {
      ...baseDashboard,
      forecast: { projectedTotalCost: 130_000, remainingBudget: 20_000, onTrack: true },
    };
    const { container } = render(<MoneyPanel dashboard={dash} />);
    const arc = container.querySelectorAll('circle')[1];
    expect(arc.getAttribute('stroke')).toContain('status-warning');
  });
});
