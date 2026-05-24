import { Donut } from '@/components/ds/Donut';
import { Money } from '@/components/ds/Money';
import { Pct } from '@/components/ds/Pct';
import { VarianceBar } from '@/components/ds/VarianceBar';
import { SectionCard } from '@/components/common/SectionCard';
import type { ProjectBudgetDashboard } from '@/lib/api/project-budget';

interface MoneyPanelProps {
  dashboard: ProjectBudgetDashboard;
}

/**
 * Phase B1.4 — DS-redesign Money panel.
 *
 * Renders a tight, atom-driven summary of project budget and burn at the
 * top of the Budget tab when `dsRefresh` is on. Reuses the existing
 * `ProjectBudgetDashboard` payload — no BE change required.
 *
 * Composed from Phase A0 atoms:
 *   Money       — tabular currency
 *   Pct         — sign-aware percentage
 *   VarianceBar — projected vs budget delta
 *   Donut       — burn ratio
 *
 * Reference: DS/page-pulse.jsx Money quadrant.
 */
export function MoneyPanel({ dashboard }: MoneyPanelProps): JSX.Element {
  const budget = dashboard.budget;
  const budgetTotal = budget?.total ?? 0;
  const projected = dashboard.forecast.projectedTotalCost;
  const remaining = dashboard.forecast.remainingBudget;
  const variance = budgetTotal > 0 ? projected - budgetTotal : 0;
  const variancePct = budgetTotal > 0 ? (variance / budgetTotal) * 100 : 0;
  const burnRatio = budgetTotal > 0 ? Math.min(1, projected / budgetTotal) : 0;
  const burnPctValue = burnRatio * 100;
  const donutTone: 'active' | 'warning' | 'danger' =
    burnPctValue < 75 ? 'active' : burnPctValue < 95 ? 'warning' : 'danger';

  return (
    <SectionCard title="Money — KPI">
      <div
        data-testid="money-panel"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          padding: '4px 0',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Budget</span>
          {budget ? (
            <span style={{ fontSize: 18, fontWeight: 600 }}>
              <Money value={budgetTotal} compact />
            </span>
          ) : (
            <span style={{ fontSize: 13, color: 'var(--color-text-subtle)' }}>not set</span>
          )}
          {budget ? (
            <span style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>
              FY{budget.fiscalYear} · CAPEX <Money value={budget.capex} compact /> · OPEX{' '}
              <Money value={budget.opex} compact />
            </span>
          ) : null}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Projected total</span>
          <span style={{ fontSize: 18, fontWeight: 600 }}>
            <Money value={projected} compact />
          </span>
          <span style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>
            Remaining <Money value={remaining} compact />
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Variance</span>
          <span style={{ fontSize: 18, fontWeight: 600 }}>
            <Money value={variance} compact />
            {budgetTotal > 0 ? (
              <>
                {' '}
                <span style={{ fontSize: 12, fontWeight: 400 }}>
                  (<Pct value={variancePct} sign fractionDigits={1} tone="auto" />)
                </span>
              </>
            ) : null}
          </span>
          {budgetTotal > 0 ? (
            <VarianceBar value={variance} max={Math.max(Math.abs(variance), budgetTotal * 0.2)} width={160} />
          ) : null}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Donut value={burnPctValue} max={100} tone={donutTone} size={56} thickness={6} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Burn ratio</span>
            <span style={{ fontSize: 16, fontWeight: 600 }}>
              <Pct value={burnPctValue} fractionDigits={0} />
            </span>
            <span style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>
              {dashboard.forecast.onTrack ? 'on track' : 'attention needed'}
            </span>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
