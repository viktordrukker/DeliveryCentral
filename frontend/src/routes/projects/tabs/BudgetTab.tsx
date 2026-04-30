import { useEffect, useState } from 'react';

import { useAuth } from '@/app/auth-context';
import { PROJECT_CREATE_ROLES, hasAnyRole } from '@/app/route-manifest';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { SectionCard } from '@/components/common/SectionCard';
import { BudgetBurnDownChart } from '@/components/charts/BudgetBurnDownChart';
import { CostBreakdownDonut } from '@/components/charts/CostBreakdownDonut';
import { ForecastChart } from '@/components/charts/ForecastChart';
import { BudgetCapexOpexSummary } from '@/components/projects/BudgetCapexOpexSummary';
import { DataSourceBadge } from '@/components/common/DataSourceBadge';
import {
  type ProjectBudgetDashboard,
  fetchProjectBudgetDashboard,
  upsertProjectBudget,
} from '@/lib/api/project-budget';
import { type SpcBurndownDto, fetchSpcBurndown } from '@/lib/api/project-spc';
import { Button } from '@/components/ds';

interface BudgetTabProps {
  projectId: string;
}

export function BudgetTab({ projectId }: BudgetTabProps): JSX.Element {
  const { principal } = useAuth();
  const canManageBudget = hasAnyRole(principal?.roles, PROJECT_CREATE_ROLES);

  const [dashboard, setDashboard] = useState<ProjectBudgetDashboard | null>(null);
  const [spc, setSpc] = useState<SpcBurndownDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Budget form state
  const [fiscalYear, setFiscalYear] = useState<number>(new Date().getFullYear());
  const [capex, setCapex] = useState('');
  const [opex, setOpex] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);

    void Promise.all([
      fetchProjectBudgetDashboard(projectId),
      fetchSpcBurndown(projectId, 12).catch(() => null),
    ])
      .then(([data, spcData]) => {
        if (!active) return;
        setDashboard(data);
        setSpc(spcData);
        if (data.budget) {
          setFiscalYear(data.budget.fiscalYear);
          setCapex(String(data.budget.capex));
          setOpex(String(data.budget.opex));
        }
      })
      .catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : 'Failed to load budget.'); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [projectId]);

  async function handleSaveBudget(): Promise<void> {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      await upsertProjectBudget(projectId, { fiscalYear, capexBudget: parseFloat(capex) || 0, opexBudget: parseFloat(opex) || 0 });
      setSaveSuccess('Budget saved successfully.');
      const data = await fetchProjectBudgetDashboard(projectId);
      setDashboard(data);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save budget.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Loading budget..." variant="skeleton" skeletonType="detail" />;
  if (error) return <ErrorState description={error} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Hero: CAPEX/OPEX Visual Summary */}
      {dashboard ? (
        <div className="dashboard-hero">
          <div className="dashboard-hero__header">
            <div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>CAPEX / OPEX Overview</h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>FY{dashboard.budget?.fiscalYear}</p>
            </div>
          </div>
          <div className="dashboard-hero__chart">
            <BudgetCapexOpexSummary dashboard={dashboard} />
          </div>
        </div>
      ) : null}

      {/* Budget Edit Form (defaultCollapsed) */}
      {canManageBudget ? (
        <SectionCard title="Set Budget" collapsible defaultCollapsed>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'flex-end' }}>
            <label className="field">
              <span className="field__label">Fiscal Year</span>
              <input className="field__control" type="number" min={2020} max={new Date().getFullYear() + 5} value={fiscalYear} onChange={(e) => setFiscalYear(Number(e.target.value))} style={{ width: 100 }} />
            </label>
            <label className="field">
              <span className="field__label">CAPEX Budget (Capitalization)</span>
              <input className="field__control" type="number" min={0} step={1000} value={capex} onChange={(e) => setCapex(e.target.value)} style={{ width: 150 }} />
            </label>
            <label className="field">
              <span className="field__label">OPEX Budget (Operational)</span>
              <input className="field__control" type="number" min={0} step={1000} value={opex} onChange={(e) => setOpex(e.target.value)} style={{ width: 150 }} />
            </label>
            <Button variant="primary" disabled={saving} onClick={() => void handleSaveBudget()} type="button">
              {saving ? 'Saving...' : 'Save Budget'}
            </Button>
          </div>
          {saveError ? <div style={{ color: 'var(--color-status-danger)', fontSize: 12, marginTop: 'var(--space-2)' }}>{saveError}</div> : null}
          {saveSuccess ? <div style={{ color: 'var(--color-status-active)', fontSize: 12, marginTop: 'var(--space-2)' }}>{saveSuccess}</div> : null}
        </SectionCard>
      ) : null}

      {/* Charts (two-column) */}
      {dashboard?.budget ? (
        <div className="dashboard-main-grid">
          <SectionCard title="Budget Burn-Down" collapsible>
            <div style={{ minHeight: 280 }}>
              <BudgetBurnDownChart data={dashboard.burnDown} />
            </div>
          </SectionCard>
          <SectionCard title="Forecast to Completion" collapsible>
            <div style={{ minHeight: 280 }}>
              <ForecastChart forecast={dashboard.forecast} totalBudget={dashboard.budget.total} />
            </div>
          </SectionCard>
        </div>
      ) : null}

      {/* Cost Breakdown */}
      {dashboard ? (
        <SectionCard title="Cost by Staffing Role" collapsible>
          <CostBreakdownDonut data={dashboard.byRole} />
        </SectionCard>
      ) : null}

      {/* V2-B: SPC burndown + vendor accrual */}
      {spc ? (
        <SectionCard
          compact
          collapsible
          title={
            <span style={{ alignItems: 'center', display: 'inline-flex', gap: 8 }}>
              SPC Burndown (12 weeks)
              <DataSourceBadge source={spc.dataSource} />
            </span>
          }
        >
          <div style={{ display: 'grid', gap: 'var(--space-3)', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Hours delivered
              </div>
              <div style={{ fontSize: 24, fontWeight: 600, marginTop: 4 }}>
                {spc.totalHours.toFixed(1)}
              </div>
              <div style={{ color: 'var(--color-text-subtle)', fontSize: 11 }}>last {spc.points.length} weeks</div>
            </div>
            <div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                SPC cost
              </div>
              <div style={{ fontSize: 24, fontWeight: 600, marginTop: 4 }}>
                ${Math.round(spc.totalSpcCost).toLocaleString()}
              </div>
              <div style={{ color: 'var(--color-text-subtle)', fontSize: 11 }}>
                {spc.appliedHourlyRate !== null
                  ? `@ $${spc.appliedHourlyRate.toFixed(2)}/hr · ${spc.rateSource}`
                  : 'No rate configured'}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Vendor accrual
              </div>
              <div style={{ fontSize: 24, fontWeight: 600, marginTop: 4 }}>
                ${Math.round(spc.vendorAccrualToDate).toLocaleString()}
              </div>
              <div style={{ color: 'var(--color-text-subtle)', fontSize: 11 }}>engagement to date</div>
            </div>
            <div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Budget at Completion
              </div>
              <div style={{ fontSize: 24, fontWeight: 600, marginTop: 4 }}>
                {spc.bac !== null ? `$${Math.round(spc.bac).toLocaleString()}` : '—'}
              </div>
              <div style={{ color: 'var(--color-text-subtle)', fontSize: 11 }}>
                {spc.bac !== null
                  ? `${Math.round(((spc.totalSpcCost + spc.vendorAccrualToDate) / spc.bac) * 100)}% consumed`
                  : 'set a budget above'}
              </div>
            </div>
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
