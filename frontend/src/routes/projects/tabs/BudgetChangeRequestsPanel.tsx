import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/app/auth-context';
import { DIRECTOR_ADMIN_ROLES, hasAnyRole } from '@/app/route-manifest';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { SectionCard } from '@/components/common/SectionCard';
import {
  type BudgetChangeRequest,
  approveBudgetChange,
  fetchPendingBudgetChangeRequests,
  rejectBudgetChange,
} from '@/lib/api/project-budget';
import { Button, Money, Table, type Column } from '@/components/ds';

interface BudgetChangeRequestsPanelProps {
  projectId: string;
  /** Fired after an approve/reject so the parent can refresh the budget dashboard. */
  onAfterDecision?: () => void;
}

/**
 * F-3.1 / D-92 — pending budget-change approval queue.
 *
 * Extracted from BudgetTab so the SAME panel renders on both the legacy
 * Budget tab (dsRefresh OFF) and the v2 Money tab (dsRefresh ON). Before
 * this, the queue lived only in BudgetTab, which v2 never renders — so the
 * SC-7 "Requested by" name fix (requestedByPersonName) was invisible on v2.
 */
export function BudgetChangeRequestsPanel({ projectId, onAfterDecision }: BudgetChangeRequestsPanelProps): JSX.Element {
  const { principal } = useAuth();
  const canDecideBudgetChange = hasAnyRole(principal?.roles, DIRECTOR_ADMIN_ROLES);

  const [approvals, setApprovals] = useState<BudgetChangeRequest[]>([]);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [decideError, setDecideError] = useState<string | null>(null);
  const [confirmApproveId, setConfirmApproveId] = useState<string | null>(null);
  const [rejectFormId, setRejectFormId] = useState<string | null>(null);
  const [confirmRejectId, setConfirmRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const refreshApprovals = useCallback(async (): Promise<void> => {
    try {
      const rows = await fetchPendingBudgetChangeRequests(projectId);
      setApprovals(rows);
    } catch {
      setApprovals([]);
    }
  }, [projectId]);

  useEffect(() => {
    void refreshApprovals();
  }, [refreshApprovals]);

  async function handleApproveBudgetChange(approvalId: string): Promise<void> {
    setDecidingId(approvalId);
    setDecideError(null);
    try {
      await approveBudgetChange(projectId, approvalId);
      await refreshApprovals();
      onAfterDecision?.();
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
      onAfterDecision?.();
    } catch (e: unknown) {
      setDecideError(e instanceof Error ? e.message : 'Failed to reject budget change.');
    } finally {
      setDecidingId(null);
    }
  }

  type Approval = BudgetChangeRequest;
  const NUM = { fontVariantNumeric: 'tabular-nums' as const };
  const approvalColumns: Column<Approval>[] = [
    { key: 'requested', title: 'Requested', getValue: (a) => a.requestedAt, render: (a) => new Date(a.requestedAt).toLocaleString() },
    { key: 'requestedBy', title: 'Requested by', getValue: (a) => a.requestedByPersonName ?? a.requestedByPersonId, render: (a) => a.requestedByPersonName ?? a.requestedByPersonId },
    {
      key: 'capex',
      title: 'New CAPEX',
      align: 'right',
      getValue: (a) => a.requestedChange?.capexBudget ?? 0,
      render: (a) => <span style={NUM}>{a.requestedChange ? <Money value={a.requestedChange.capexBudget} /> : '—'}</span>,
    },
    {
      key: 'opex',
      title: 'New OPEX',
      align: 'right',
      getValue: (a) => a.requestedChange?.opexBudget ?? 0,
      render: (a) => <span style={NUM}>{a.requestedChange ? <Money value={a.requestedChange.opexBudget} /> : '—'}</span>,
    },
    { key: 'reason', title: 'Reason', getValue: (a) => a.decisionReason ?? '', render: (a) => a.decisionReason ?? '—' },
    ...(canDecideBudgetChange
      ? [
          {
            key: 'action',
            title: 'Action',
            align: 'right' as const,
            getValue: () => '',
            render: (a: Approval) => {
              const isSubmitter = principal?.personId === a.requestedByPersonId;
              if (isSubmitter) {
                return <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>Self-approval blocked</span>;
              }
              return (
                <div style={{ display: 'inline-flex', gap: 8 }}>
                  <Button disabled={decidingId === a.id} onClick={() => setConfirmApproveId(a.id)} size="sm" type="button" variant="primary">
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
              );
            },
          },
        ]
      : []),
  ];

  return (
    <>
      <SectionCard title="Pending Budget Change Requests" data-jtbd="What budget changes need decision?">
        {approvals.length === 0 ? (
          <EmptyState description="No pending budget change requests for this project." title="All caught up" />
        ) : (
          <>
            {decideError ? <ErrorState description={decideError} variant="inline" /> : null}
            <Table variant="compact" columns={approvalColumns} rows={approvals} getRowKey={(a) => a.id} />
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
    </>
  );
}
