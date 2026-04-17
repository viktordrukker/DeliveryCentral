import { useEffect, useState } from 'react';

import { useAuth } from '@/app/auth-context';
import { PROJECT_CREATE_ROLES, hasAnyRole } from '@/app/route-manifest';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { SectionCard } from '@/components/common/SectionCard';
import { BudgetBurnDownChart } from '@/components/charts/BudgetBurnDownChart';
import { CostBreakdownDonut } from '@/components/charts/CostBreakdownDonut';
import { ForecastChart } from '@/components/charts/ForecastChart';
import { BudgetCapexOpexSummary } from '@/components/projects/BudgetCapexOpexSummary';
import {
  type ProjectBudgetDashboard,
  fetchProjectBudgetDashboard,
  upsertProjectBudget,
} from '@/lib/api/project-budget';

interface BudgetTabProps {
  projectId: string;
}

export function BudgetTab({ projectId }: BudgetTabProps): JSX.Element {
  const { principal } = useAuth();
  const canManageBudget = hasAnyRole(principal?.roles, PROJECT_CREATE_ROLES);

  const [dashboard, setDashboard] = useState<ProjectBudgetDashboard | null>(null);
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

    void fetchProjectBudgetDashboard(projectId)
      .then((data) => {
        if (!active) return;
        setDashboard(data);
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
    <>
      {/* ── CAPEX/OPEX Visual Summary (Hero) ── */}
      {dashboard ? (
        <SectionCard title="CAPEX / OPEX Overview">
          <BudgetCapexOpexSummary dashboard={dashboard} />
        </SectionCard>
      ) : null}

      {/* ── Budget Edit Form ── */}
      {canManageBudget ? (
        <SectionCard title="Set Budget" collapsible>
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
            <button className="button button--primary" disabled={saving} onClick={() => void handleSaveBudget()} type="button">
              {saving ? 'Saving...' : 'Save Budget'}
            </button>
          </div>
          {saveError ? <div style={{ color: 'var(--color-status-danger)', fontSize: 12, marginTop: 'var(--space-2)' }}>{saveError}</div> : null}
          {saveSuccess ? <div style={{ color: 'var(--color-status-active)', fontSize: 12, marginTop: 'var(--space-2)' }}>{saveSuccess}</div> : null}
        </SectionCard>
      ) : null}

      {/* ── Budget Summary ── */}
      {dashboard?.budget ? (
        <SectionCard title="Budget Summary" collapsible>
          <dl className="details-list">
            <div><dt>Fiscal Year</dt><dd>{dashboard.budget.fiscalYear}</dd></div>
            <div><dt>CAPEX (Capitalization)</dt><dd>${dashboard.budget.capex.toLocaleString('en-US')}</dd></div>
            <div><dt>OPEX (Operational)</dt><dd>${dashboard.budget.opex.toLocaleString('en-US')}</dd></div>
            <div><dt>Total Budget</dt><dd>${dashboard.budget.total.toLocaleString('en-US')}</dd></div>
          </dl>
        </SectionCard>
      ) : (
        <SectionCard title="Budget Summary">
          <EmptyState description="No budget set for this fiscal year." title="No budget" />
        </SectionCard>
      )}

      {/* ── Charts (two-column) ── */}
      {dashboard?.budget ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--space-4)' }}>
          <SectionCard title="Budget Burn-Down" collapsible>
            <BudgetBurnDownChart data={dashboard.burnDown} />
          </SectionCard>
          <SectionCard title="Forecast to Completion" collapsible>
            <ForecastChart forecast={dashboard.forecast} totalBudget={dashboard.budget.total} />
          </SectionCard>
        </div>
      ) : null}

      {/* ── Cost Breakdown ── */}
      {dashboard ? (
        <SectionCard title="Cost by Staffing Role" collapsible>
          <CostBreakdownDonut data={dashboard.byRole} />
        </SectionCard>
      ) : null}
    </>
  );
}
