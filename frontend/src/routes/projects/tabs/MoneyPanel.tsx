import { Link } from 'react-router-dom';

import { Money } from '@/components/ds/Money';
import { Pct } from '@/components/ds/Pct';
import { SectionCard } from '@/components/common/SectionCard';
import type { ProjectBudgetDashboard } from '@/lib/api/project-budget';

interface MoneyPanelProps {
  dashboard: ProjectBudgetDashboard;
  projectId: string;
}

type Tone = 'active' | 'warning' | 'danger' | 'critical' | 'info';

function burnTone(burnPct: number): Tone {
  if (burnPct >= 95) return 'danger';
  if (burnPct >= 75) return 'warning';
  return 'active';
}

function varianceTone(variancePct: number): Tone {
  const abs = Math.abs(variancePct);
  if (abs <= 5) return 'active';
  if (abs <= 15) return 'warning';
  return 'danger';
}

/**
 * Phase D2 — DS-canvas full-fidelity Money panel.
 *
 * Renders the project Money summary as the DS canvas defines it
 * (DS/page-plan-money.jsx — ProjectMoney section):
 *   1. Danger banner when variance exceeds budget
 *   2. 6-tile EVM-style KPI strip (Baseline / Actual / Projected /
 *      Variance / Burn / Remaining)
 *   3. Variance drivers card using .varbar
 *   4. Top cost lines table (byRole)
 *
 * Uses the .ds-refresh class set (.kpi / .card / .badge / .varbar /
 * .table-compact / .tone-dot) landed in D0.
 *
 * Reference: DS/page-plan-money.jsx:333-540.
 */
export function MoneyPanel({ dashboard, projectId }: MoneyPanelProps): JSX.Element {
  const budget = dashboard.budget;
  const budgetTotal = budget?.total ?? 0;
  const projected = dashboard.forecast.projectedTotalCost;
  const remaining = dashboard.forecast.remainingBudget;
  const variance = budgetTotal > 0 ? projected - budgetTotal : 0;
  const variancePct = budgetTotal > 0 ? (variance / budgetTotal) * 100 : 0;
  const burnPct = budgetTotal > 0 ? Math.min(100, (projected / budgetTotal) * 100) : 0;
  const earned = budgetTotal > 0 ? Math.min(projected, budgetTotal * (burnPct / 100)) : 0;

  const overBudget = variance > 0 && Math.abs(variancePct) > 5;
  const vTone = varianceTone(variancePct);
  const bTone = burnTone(burnPct);

  // Variance drivers — derived from byRole when available; fallback to 1 row.
  const driverMax = Math.max(
    Math.abs(variance),
    ...dashboard.byRole.map((r) => Math.abs(r.cost)),
    budgetTotal * 0.1,
  );

  return (
    <div data-testid="money-panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Banner — over-budget alert */}
      {overBudget ? (
        <div className="banner banner-danger" data-testid="money-banner">
          <span style={{ color: 'var(--color-status-danger)' }}>!</span>
          <div style={{ flex: 1 }}>
            <div className="banner-title">
              Forecast EAC exceeds baseline by{' '}
              <Money value={variance} compact /> ({' '}
              <Pct value={variancePct} sign fractionDigits={1} />
              )
            </div>
            <div className="banner-body">
              Projected total cost is over plan. Review the variance drivers below or open a
              change request.
            </div>
          </div>
          <Link
            to={`/projects/${projectId}?tab=change-requests`}
            className="btn btn-primary btn-sm"
            style={{ textDecoration: 'none' }}
          >
            Open CR →
          </Link>
        </div>
      ) : null}

      {/* 6-tile KPI strip */}
      <div className="kpi-strip" data-testid="money-kpi-strip">
        <div className="kpi">
          <span className="kpi-label">Baseline (BAC)</span>
          <span className="kpi-value">
            {budget ? <Money value={budgetTotal} compact /> : '—'}
          </span>
          {budget ? (
            <span className="kpi-foot">FY{budget.fiscalYear} · consolidated</span>
          ) : (
            <span className="kpi-foot">not set</span>
          )}
        </div>

        <div className={`kpi tone-${bTone}`}>
          <span className="kpi-label">Projected (EAC)</span>
          <span className="kpi-value">
            <Money value={projected} compact />
          </span>
          <span className="kpi-foot">
            <Pct value={burnPct} fractionDigits={0} /> of budget
          </span>
        </div>

        <div className="kpi tone-active">
          <span className="kpi-label">Earned (EV)</span>
          <span className="kpi-value">
            <Money value={earned} compact />
          </span>
          <span className="kpi-foot">EV proxy from burn ratio</span>
        </div>

        <div className={`kpi tone-${vTone}`}>
          <span className="kpi-label">Variance</span>
          <span className="kpi-value">
            <Money value={variance} compact />
          </span>
          <span className={`kpi-delta ${variance < 0 ? 'up' : 'down'}`}>
            <Pct value={variancePct} sign fractionDigits={1} tone="auto" /> vs BAC
          </span>
        </div>

        <div className="kpi">
          <span className="kpi-label">Remaining</span>
          <span className="kpi-value">
            <Money value={remaining} compact />
          </span>
          <span className="kpi-foot">
            {dashboard.forecast.onTrack ? 'on track' : 'attention needed'}
          </span>
        </div>

        <div className={`kpi tone-${bTone}`}>
          <span className="kpi-label">Burn rate</span>
          <span className="kpi-value">
            <Pct value={burnPct} fractionDigits={0} />
          </span>
          <span className="kpi-foot">{dashboard.burnDown.length} weeks tracked</span>
        </div>
      </div>

      {/* Variance drivers + Top cost lines */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Variance drivers card */}
        <div className="card" data-testid="money-variance-drivers">
          <div className="card-header">
            <h3>Variance drivers · YTD</h3>
            <span className="compact muted">
              Sum: <Money value={variance} compact />
            </span>
          </div>
          <div
            className="card-body"
            style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            {budget && (variance !== 0 || dashboard.byRole.length > 0) ? (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.4fr 1.4fr 80px',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <span className="body-sm">Budget variance</span>
                  <div className="varbar">
                    <i
                      className={variance < 0 ? '' : 'neg'}
                      style={{
                        left: variance < 0 ? '50%' : `${50 - (Math.abs(variance) / driverMax) * 50}%`,
                        width: `${(Math.abs(variance) / driverMax) * 50}%`,
                      }}
                    />
                  </div>
                  <span
                    className="mono"
                    style={{
                      textAlign: 'right',
                      color:
                        variance > 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {variance > 0 ? '+' : '−'}
                    {Math.abs(variance) >= 1000
                      ? `$${(Math.abs(variance) / 1000).toFixed(0)}k`
                      : `$${Math.abs(variance).toFixed(0)}`}
                  </span>
                </div>
                {dashboard.byRole.slice(0, 4).map((r) => {
                  const neg = r.cost > budgetTotal / dashboard.byRole.length * 1.3;
                  return (
                    <div
                      key={r.role}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1.4fr 1.4fr 80px',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <span className="body-sm">{r.role}</span>
                      <div className="varbar">
                        <i
                          className={neg ? 'neg' : ''}
                          style={{
                            left: neg
                              ? `${50 - (r.cost / driverMax) * 50}%`
                              : '50%',
                            width: `${(r.cost / driverMax) * 50}%`,
                          }}
                        />
                      </div>
                      <span
                        className="mono"
                        style={{
                          textAlign: 'right',
                          color: neg ? 'var(--color-status-danger)' : 'var(--color-text)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {r.cost >= 1000 ? `$${(r.cost / 1000).toFixed(0)}k` : `$${r.cost.toFixed(0)}`}
                      </span>
                    </div>
                  );
                })}
              </>
            ) : (
              <p className="compact muted" style={{ margin: 0 }}>
                No variance drivers to display.
              </p>
            )}
          </div>
        </div>

        {/* Top cost lines */}
        <div className="card" data-testid="money-cost-lines">
          <div className="card-header">
            <h3>Top cost lines</h3>
            <span className="compact muted">By role · YTD</span>
          </div>
          <div style={{ overflow: 'auto' }}>
            {dashboard.byRole.length === 0 ? (
              <p
                className="compact muted"
                style={{ padding: '12px 20px', margin: 0 }}
              >
                No cost data recorded yet.
              </p>
            ) : (
              <table className="table table-compact">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th style={{ textAlign: 'right' }}>Hours</th>
                    <th style={{ textAlign: 'right' }}>Cost</th>
                    <th style={{ textAlign: 'right' }}>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.byRole.slice(0, 6).map((r, i) => {
                    const totalCost =
                      dashboard.byRole.reduce((s, x) => s + x.cost, 0) || 1;
                    const share = Math.round((r.cost / totalCost) * 100);
                    return (
                      <tr key={r.role}>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <span
                              className={`tone-dot tone-${
                                ['info', 'active', 'warning', 'danger', 'critical'][i % 5]
                              }`}
                            />
                            {r.role}
                          </span>
                        </td>
                        <td
                          className="mono"
                          style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                        >
                          {r.hours}
                        </td>
                        <td
                          className="mono"
                          style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                        >
                          <Money value={r.cost} compact />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              justifyContent: 'flex-end',
                            }}
                          >
                            <div
                              style={{
                                width: 60,
                                height: 4,
                                background: 'var(--color-surface-alt)',
                                borderRadius: 2,
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${share}%`,
                                  height: '100%',
                                  background: 'var(--color-accent)',
                                }}
                              />
                            </div>
                            <span
                              className="mono compact"
                              style={{ fontVariantNumeric: 'tabular-nums' }}
                            >
                              {share}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
