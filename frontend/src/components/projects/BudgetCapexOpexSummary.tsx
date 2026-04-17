import type { ProjectBudgetDashboard } from '@/lib/api/project-budget';

interface BudgetCapexOpexSummaryProps {
  dashboard: ProjectBudgetDashboard;
}

const NUM: React.CSSProperties = { fontVariantNumeric: 'tabular-nums', textAlign: 'right' };

function thresholdColor(pct: number): string {
  if (pct >= 90) return 'var(--color-status-danger)';
  if (pct >= 70) return 'var(--color-status-warning)';
  return 'var(--color-status-active)';
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString('en-US')}`;
}

interface BarRowProps {
  label: string;
  sublabel: string;
  spent: number;
  budget: number;
}

function BarRow({ label, sublabel, spent, budget }: BarRowProps): JSX.Element {
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const color = thresholdColor(pct);

  return (
    <div style={{ marginBottom: 'var(--space-3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--space-1)' }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{label}</span>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 'var(--space-2)' }}>{sublabel}</span>
        </div>
        <div style={{ ...NUM, fontSize: 12, color: 'var(--color-text)' }}>
          {formatCurrency(spent)} / {formatCurrency(budget)} ({pct}%)
        </div>
      </div>
      <div style={{
        height: 10,
        background: 'var(--color-border)',
        borderRadius: 5,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: color,
          borderRadius: 5,
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  );
}

export function BudgetCapexOpexSummary({ dashboard }: BudgetCapexOpexSummaryProps): JSX.Element {
  const budget = dashboard.budget;

  if (!budget) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--color-text-muted)', fontSize: 13 }}>
        No budget configured. Set a budget to see CAPEX/OPEX tracking.
      </div>
    );
  }

  // Derive CAPEX/OPEX spend from the byRole cost data and forecast
  // The budget dashboard provides total projected cost; split proportionally based on budget ratio
  const totalSpent = dashboard.forecast.projectedTotalCost - dashboard.forecast.remainingBudget;
  const capexRatio = budget.total > 0 ? budget.capex / budget.total : 0.5;
  const capexSpent = Math.round(totalSpent * capexRatio);
  const opexSpent = Math.round(totalSpent * (1 - capexRatio));

  return (
    <div data-testid="budget-capex-opex-summary" style={{ padding: 'var(--space-2) 0' }}>
      <BarRow
        label="CAPEX"
        sublabel="Capitalization"
        spent={capexSpent}
        budget={budget.capex}
      />
      <BarRow
        label="OPEX"
        sublabel="Operational"
        spent={opexSpent}
        budget={budget.opex}
      />

      {/* Total summary line */}
      <div style={{
        borderTop: '1px solid var(--color-border)',
        paddingTop: 'var(--space-2)',
        marginTop: 'var(--space-2)',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 12,
      }}>
        <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>Total Budget</span>
        <span style={{ ...NUM, color: 'var(--color-text)' }}>
          {formatCurrency(totalSpent)} / {formatCurrency(budget.total)}
        </span>
      </div>

      {/* Health indicator */}
      <div style={{ marginTop: 'var(--space-2)', fontSize: 11 }}>
        <span style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: dashboard.healthColor === 'green' ? 'var(--color-status-active)'
            : dashboard.healthColor === 'yellow' ? 'var(--color-status-warning)'
            : 'var(--color-status-danger)',
          marginRight: 'var(--space-1)',
        }} />
        <span style={{ color: 'var(--color-text-muted)' }}>
          {dashboard.healthColor === 'green' ? 'On Track'
            : dashboard.healthColor === 'yellow' ? 'At Risk'
            : 'Over Budget'}
          {' — FY'}{budget.fiscalYear}
        </span>
      </div>
    </div>
  );
}
