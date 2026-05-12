import { useEffect, useState } from 'react';

import { useAuth } from '@/app/auth-context';
import { DIRECTOR_ADMIN_ROLES, PROJECT_CREATE_ROLES, hasAnyRole } from '@/app/route-manifest';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { SectionCard } from '@/components/common/SectionCard';
import { BudgetBurnDownChart } from '@/components/charts/BudgetBurnDownChart';
import { CostBreakdownDonut } from '@/components/charts/CostBreakdownDonut';
import { ForecastChart } from '@/components/charts/ForecastChart';
import { BudgetCapexOpexSummary } from '@/components/projects/BudgetCapexOpexSummary';
import { DataSourceBadge } from '@/components/common/DataSourceBadge';
import {
  type BudgetChangeRequest,
  type ProjectBudgetDashboard,
  approveBudgetChange,
  fetchPendingBudgetChangeRequests,
  fetchProjectBudgetDashboard,
  rejectBudgetChange,
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
  const canDecideBudgetChange = hasAnyRole(principal?.roles, DIRECTOR_ADMIN_ROLES);

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

  // F-3.1 / D-92 — pending budget-change approvals
  const [approvals, setApprovals] = useState<BudgetChangeRequest[]>([]);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [decideError, setDecideError] = useState<string | null>(null);
  const [confirmApproveId, setConfirmApproveId] = useState<string | null>(null);
  const [rejectFormId, setRejectFormId] = useState<string | null>(null);
  const [confirmRejectId, setConfirmRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  async function refreshApprovals(): Promise<void> {
    try {
      const rows = await fetchPendingBudgetChangeRequests(projectId);
      setApprovals(rows);
    } catch {
      setApprovals([]);
    }
  }

  useEffect(() => {
    let active = true;
    setLoading(true);

    void Promise.all([
      fetchProjectBudgetDashboard(projectId),
      fetchSpcBurndown(projectId, 12).catch(() => null),
      fetchPendingBudgetChangeRequests(projectId).catch(() => [] as BudgetChangeRequest[]),
    ])
      .then(([data, spcData, approvalRows]) => {
        if (!active) return;
        setDashboard(data);
        setSpc(spcData);
        setApprovals(approvalRows);
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

  async function handleApproveBudgetChange(approvalId: string): Promise<void> {
    setDecidingId(approvalId);
    setDecideError(null);
    try {
      await approveBudgetChange(projectId, approvalId);
      await refreshApprovals();
      const data = await fetchProjectBudgetDashboard(projectId);
      setDashboard(data);
    } catch (e: unknown) {
      setDecideError(e instanceof Error ? e.message : 'Failed to approve budget change.');
    } finally {
      setDecidingId(null);
    }
  }

  async function handleRejectBudgetChange(approvalId: string, reason: string): Promise<void> {
    setDecidingId(approvalId);
    setDecideError(null);
    try {
      await rejectBudgetChange(projectId, approvalId, reason);
      await refreshApprovals();
      setRejectFormId(null);
      setRejectReason('');
    } catch (e: unknown) {
      setDecideError(e instanceof Error ? e.message : 'Failed to reject budget change.');
    } finally {
      setDecidingId(null);
    }
  }

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

      {/* F-3.1 / D-92 — Pending Budget Change Requests */}
      <SectionCard title="Pending Budget Change Requests" data-jtbd="What budget changes need decision?">
        {approvals.length === 0 ? (
          <EmptyState description="No pending budget change requests for this project." title="All caught up" />
        ) : (
          <>
            {decideError ? <ErrorState description={decideError} variant="inline" /> : null}
            <table className="dash-compact-table" style={{ marginTop: 'var(--space-2)' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Requested</th>
                  <th style={{ textAlign: 'left' }}>Requested by</th>
                  <th style={{ textAlign: 'right' }}>New CAPEX</th>
                  <th style={{ textAlign: 'right' }}>New OPEX</th>
                  <th style={{ textAlign: 'left' }}>Reason</th>
                  {canDecideBudgetChange ? <th style={{ textAlign: 'right' }}>Action</th> : null}
                </tr>
              </thead>
              <tbody>
                {approvals.map((a) => {
                  const isSubmitter = principal?.personId === a.requestedByPersonId;
                  const change = a.requestedChange;
                  return (
                    <tr key={a.id}>
                      <td>{new Date(a.requestedAt).toLocaleString()}</td>
                      <td>{a.requestedByPersonId}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {change ? `$${Math.round(change.capexBudget).toLocaleString()}` : '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {change ? `$${Math.round(change.opexBudget).toLocaleString()}` : '—'}
                      </td>
                      <td>{a.decisionReason ?? '—'}</td>
                      {canDecideBudgetChange ? (
                        <td style={{ textAlign: 'right' }}>
                          {isSubmitter ? (
                            <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>Self-approval blocked</span>
                          ) : (
                            <div style={{ display: 'inline-flex', gap: 8 }}>
                              <Button
                                disabled={decidingId === a.id}
                                onClick={() => setConfirmApproveId(a.id)}
                                size="sm"
                                type="button"
                                variant="primary"
                              >
                                Approve
                              </Button>
                              <Button
                                disabled={decidingId === a.id}
                                onClick={() => { setRejectFormId(a.id); setRejectReason(''); }}
                                size="sm"
                                type="button"
                                variant="secondary"
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rejectFormId ? (
              <div style={{ marginTop: 'var(--space-3)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)' }}>
                <label className="field">
                  <span className="field__label">Rejection reason (required)</span>
                  <textarea className="field__control" onChange={(e) => setRejectReason(e.target.value)} rows={3} value={rejectReason} />
                </label>
                <div className="entity-form__actions" style={{ marginTop: 'var(--space-2)' }}>
                  <Button
                    disabled={decidingId === rejectFormId || !rejectReason.trim()}
                    onClick={() => setConfirmRejectId(rejectFormId)}
                    type="button"
                    variant="primary"
                  >
                    {decidingId === rejectFormId ? 'Rejecting…' : 'Confirm Rejection'}
                  </Button>
                  <Button onClick={() => { setRejectFormId(null); setRejectReason(''); }} type="button" variant="secondary">
                    Dismiss
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </SectionCard>

      <ConfirmDialog
        confirmLabel="Approve budget change"
        message="Approve this budget change request? The project budget will be updated atomically."
        onCancel={() => setConfirmApproveId(null)}
        onConfirm={() => {
          if (confirmApproveId) {
            const id = confirmApproveId;
            setConfirmApproveId(null);
            void handleApproveBudgetChange(id);
          }
        }}
        open={confirmApproveId !== null}
        title="Approve Budget Change"
      />

      <ConfirmDialog
        confirmLabel="Reject budget change"
        message={rejectReason.trim() ? `Reject with reason: "${rejectReason}"` : 'Please enter a rejection reason above before confirming.'}
        onCancel={() => setConfirmRejectId(null)}
        onConfirm={() => {
          if (confirmRejectId && rejectReason.trim()) {
            const id = confirmRejectId;
            const reason = rejectReason.trim();
            setConfirmRejectId(null);
            void handleRejectBudgetChange(id, reason);
          }
        }}
        open={confirmRejectId !== null}
        title="Reject Budget Change"
      />

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
