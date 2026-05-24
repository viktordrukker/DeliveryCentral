import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { MoneyPanel } from './MoneyPanel';
import type { ProjectBudgetDashboard } from '@/lib/api/project-budget';

const baseDashboard: ProjectBudgetDashboard = {
  budget: { capex: 100_000, opex: 50_000, total: 150_000, fiscalYear: 2026 },
  burnDown: [],
  forecast: { projectedTotalCost: 120_000, remainingBudget: 30_000, onTrack: true },
  byRole: [
    { role: 'Lead Backend Engineer', hours: 320, cost: 48_000 },
    { role: 'Senior Frontend', hours: 240, cost: 30_000 },
    { role: 'QA Lead', hours: 180, cost: 20_000 },
  ],
  healthColor: 'green',
};

function renderWith(dashboard: ProjectBudgetDashboard): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <MoneyPanel dashboard={dashboard} projectId="p1" />
    </MemoryRouter>,
  );
}

describe('MoneyPanel — D2 fidelity', () => {
  it('renders 6 EVM-style KPI tiles', () => {
    renderWith(baseDashboard);
    expect(screen.getByTestId('money-kpi-strip')).toBeInTheDocument();
    expect(screen.getByText('Baseline (BAC)')).toBeInTheDocument();
    expect(screen.getByText('Projected (EAC)')).toBeInTheDocument();
    expect(screen.getByText('Earned (EV)')).toBeInTheDocument();
    expect(screen.getByText('Variance')).toBeInTheDocument();
    expect(screen.getByText('Remaining')).toBeInTheDocument();
    expect(screen.getByText('Burn rate')).toBeInTheDocument();
  });

  it('hides the danger banner when projected <= budget', () => {
    renderWith(baseDashboard);
    expect(screen.queryByTestId('money-banner')).not.toBeInTheDocument();
  });

  it('shows the danger banner when projected exceeds budget >5%', () => {
    const dash = {
      ...baseDashboard,
      forecast: { projectedTotalCost: 200_000, remainingBudget: -50_000, onTrack: false },
    };
    renderWith(dash);
    expect(screen.getByTestId('money-banner')).toBeInTheDocument();
    expect(screen.getByText(/Forecast EAC exceeds baseline/)).toBeInTheDocument();
  });

  it('"Open CR" deep-link goes to the change-requests tab', () => {
    const dash = {
      ...baseDashboard,
      forecast: { projectedTotalCost: 200_000, remainingBudget: -50_000, onTrack: false },
    };
    renderWith(dash);
    const link = screen.getByRole('link', { name: /Open CR/ });
    expect(link.getAttribute('href')).toBe('/projects/p1?tab=change-requests');
  });

  it('shows fiscal-year footnote on baseline tile', () => {
    renderWith(baseDashboard);
    expect(screen.getByText(/FY2026/)).toBeInTheDocument();
  });

  it('variance tile shows signed-pct with tone', () => {
    renderWith(baseDashboard);
    // Variance = 120k - 150k = -30k → -20.0% (under budget)
    expect(screen.getByText(/[–-]20\.0%/)).toBeInTheDocument();
  });

  it('renders variance-drivers card with the budget variance + role bars', () => {
    renderWith(baseDashboard);
    const drivers = screen.getByTestId('money-variance-drivers');
    expect(drivers).toBeInTheDocument();
    expect(drivers.textContent).toContain('Budget variance');
    expect(drivers.textContent).toContain('Lead Backend Engineer');
  });

  it('renders top-cost-lines table with role + share', () => {
    renderWith(baseDashboard);
    const lines = screen.getByTestId('money-cost-lines');
    expect(lines).toBeInTheDocument();
    expect(lines.textContent).toContain('Lead Backend Engineer');
    expect(lines.textContent).toContain('QA Lead');
  });

  it('renders "not set" baseline when budget is null', () => {
    const dash = { ...baseDashboard, budget: null };
    renderWith(dash);
    expect(screen.getByText('not set')).toBeInTheDocument();
  });

  it('empty cost-by-role shows fallback copy', () => {
    const dash = { ...baseDashboard, byRole: [] };
    renderWith(dash);
    expect(screen.getByText(/No cost data recorded yet/)).toBeInTheDocument();
  });
});
