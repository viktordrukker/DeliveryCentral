import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useDrilldown } from '@/app/drilldown-context';
import { AssignmentEndActions } from '@/components/assignments/AssignmentEndActions';
import { AssignmentHistoryTimeline } from '@/components/assignments/AssignmentHistoryTimeline';
import { AuditTimeline } from '@/components/common/AuditTimeline';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { AssignmentWorkflowActions } from '@/components/assignments/AssignmentWorkflowActions';
import { formatDate, formatDateTime } from '@/lib/format-date';
import { useAssignmentDetails } from '@/features/assignments/useAssignmentDetails';
import { useAuth } from '@/app/auth-context';
import { fetchBusinessAudit, BusinessAuditRecord } from '@/lib/api/business-audit';

export function AssignmentDetailsPlaceholderPage(): JSX.Element {
  const { id } = useParams();
  const { principal } = useAuth();
  const state = useAssignmentDetails(id);
  const { setCurrentLabel } = useDrilldown();
  const actorId = principal?.personId ?? '';
  const [amendAllocation, setAmendAllocation] = useState('');
  const [amendRole, setAmendRole] = useState('');
  const [amendEndDate, setAmendEndDate] = useState('');
  const [amendNotes, setAmendNotes] = useState('');
  const [revokeReason, setRevokeReason] = useState('');
  const [confirmRevokeOpen, setConfirmRevokeOpen] = useState(false);

  const [auditEvents, setAuditEvents] = useState<BusinessAuditRecord[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setAuditLoading(true);
    void fetchBusinessAudit({ targetEntityType: 'Assignment', targetEntityId: id, pageSize: 100 })
      .then((data) => {
        if (!active) return;
        setAuditEvents(data.items);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setAuditError(err instanceof Error ? err.message : 'Failed to load audit history.');
      })
      .finally(() => {
        if (active) setAuditLoading(false);
      });
    return () => { active = false; };
  }, [id]);

  const amendableStatuses = ['CREATED', 'PROPOSED', 'BOOKED', 'ONBOARDING', 'ASSIGNED'];
  const canAmend = state.data ? amendableStatuses.includes(state.data.approvalState) : false;
  const canRevoke = state.data
    ? !['REJECTED', 'COMPLETED', 'CANCELLED'].includes(state.data.approvalState)
    : false;

  async function handleAmendSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await state.runAmendAssignment({
      ...(amendAllocation ? { allocationPercent: Number(amendAllocation) } : {}),
      ...(amendRole ? { staffingRole: amendRole } : {}),
      ...(amendEndDate ? { validTo: new Date(amendEndDate).toISOString() } : {}),
      ...(amendNotes ? { notes: amendNotes } : {}),
    });
  }

  function handleRevokeSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setConfirmRevokeOpen(true);
  }

  const breadcrumbLabel = state.data
    ? `${state.data.person.displayName} on ${state.data.project.displayName}`
    : 'Assignment Details';

  useEffect(() => {
    if (state.data) setCurrentLabel(breadcrumbLabel);
  }, [state.data, breadcrumbLabel, setCurrentLabel]);

  return (
    <PageContainer testId="assignment-details-page">
      <ConfirmDialog
        confirmLabel="Revoke"
        message="Revoke this assignment? This cannot be undone."
        onCancel={() => setConfirmRevokeOpen(false)}
        onConfirm={() => {
          setConfirmRevokeOpen(false);
          void state.runRevokeAssignment({ reason: revokeReason || undefined });
        }}
        open={confirmRevokeOpen}
        title="Revoke Assignment"
      />
      <PageHeader
        eyebrow="Assignments"
        subtitle="Review formal staffing state and execute explicit approval workflow actions."
        title={state.data ? `${state.data.person.displayName} on ${state.data.project.displayName}` : 'Assignment Details'}
      />

      {state.isLoading ? <LoadingState label="Loading assignment details..." variant="skeleton" skeletonType="detail" /> : null}
      {state.notFound ? (
        <SectionCard>
          <EmptyState
            description={`No assignment was found for ${id ?? 'the requested id'}.`}
            title="Assignment not found"
          />
        </SectionCard>
      ) : null}
      {state.error ? <ErrorState description={state.error} /> : null}

      {state.data ? (
        <>
          <div className="kpi-strip">
            <SummaryCard label="Person" value={state.data.person.displayName} />
            <SummaryCard label="Project" value={state.data.project.displayName} />
            <SummaryCard label="Approval State" value={state.data.approvalState} />
            <SummaryCard label="Allocation" value={`${state.data.allocationPercent}%`} />
          </div>

          {state.successMessage ? (
            <div className="success-banner" role="status">
              {state.successMessage}
            </div>
          ) : null}

          <div className="dashboard-main-grid">
            <SectionCard title="Assignment Summary">
              <dl className="details-list">
                <div>
                  <dt>Person</dt>
                  <dd>
                    <Link to={`/people/${state.data.person.id}`}>
                      {state.data.person.displayName}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt>Project</dt>
                  <dd>{state.data.project.displayName}</dd>
                </div>
                <div>
                  <dt>Staffing Role</dt>
                  <dd>{state.data.staffingRole}</dd>
                </div>
                <div>
                  <dt>Note</dt>
                  <dd>{state.data.note ?? 'No note provided'}</dd>
                </div>
                <div>
                  <dt>Date Range</dt>
                  <dd>
                    {formatDate(state.data.startDate)} -{' '}
                    {state.data.endDate ? formatDate(state.data.endDate) : 'Open-ended'}
                  </dd>
                </div>
                <div>
                  <dt>Requested At</dt>
                  <dd>{formatDateTime(state.data.requestedAt)}</dd>
                </div>
              </dl>
            </SectionCard>

            <SectionCard title="Workflow Actions">
              <div className="placeholder-block">
                <div className="placeholder-block__value">{state.data.approvalState}</div>
                <p className="placeholder-block__copy">
                  Visibility is separate from approval authority. This panel surfaces explicit workflow transitions only; it is not a generalized BPM interface.
                </p>
              </div>

              <AssignmentWorkflowActions
                currentStatus={state.data.approvalState}
                isSubmitting={state.isSubmitting}
                onTransition={async (target, options) => {
                  await state.runTransition(target, options);
                }}
                userRoles={principal?.roles ?? []}
              />

              <AssignmentEndActions
                canEnd={state.data.canEnd}
                isSubmitting={state.isSubmitting}
                onEnd={async ({ endDate, reason }) => {
                  await state.runEndAssignment({
                    ...(actorId ? { actorId } : {}),
                    endDate: `${endDate}T00:00:00.000Z`,
                    reason: reason || undefined,
                  });
                }}
              />
            </SectionCard>

            {canAmend ? (
              <SectionCard title="Amend Assignment">
                <form onSubmit={(e) => { void handleAmendSubmit(e); }}>
                  <div className="form-grid">
                    <label className="field">
                      <span className="field__label">Allocation % (leave blank to keep)</span>
                      <input
                        className="field__control"
                        min={1}
                        max={100}
                        onChange={(e) => setAmendAllocation(e.target.value)}
                        placeholder={String(state.data?.allocationPercent ?? '')}
                        type="number"
                        value={amendAllocation}
                      />
                    </label>
                    <label className="field">
                      <span className="field__label">Staffing Role</span>
                      <input
                        className="field__control"
                        onChange={(e) => setAmendRole(e.target.value)}
                        placeholder={state.data?.staffingRole}
                        type="text"
                        value={amendRole}
                      />
                    </label>
                    <label className="field">
                      <span className="field__label">New End Date</span>
                      <input
                        className="field__control"
                        onChange={(e) => setAmendEndDate(e.target.value)}
                        type="date"
                        value={amendEndDate}
                      />
                    </label>
                    <label className="field">
                      <span className="field__label">Notes</span>
                      <input
                        className="field__control"
                        onChange={(e) => setAmendNotes(e.target.value)}
                        type="text"
                        value={amendNotes}
                      />
                    </label>
                  </div>
                  <button
                    className="button button--primary"
                    disabled={state.isSubmitting}
                    type="submit"
                  >
                    Save amendment
                  </button>
                </form>
              </SectionCard>
            ) : null}

            {canRevoke ? (
              <SectionCard title="Revoke Assignment">
                <form onSubmit={(e) => { void handleRevokeSubmit(e); }}>
                  <label className="field">
                    <span className="field__label">Reason (optional)</span>
                    <input
                      className="field__control"
                      onChange={(e) => setRevokeReason(e.target.value)}
                      placeholder="Reason for revocation"
                      type="text"
                      value={revokeReason}
                    />
                  </label>
                  <button
                    className="button button--danger"
                    disabled={state.isSubmitting}
                    type="submit"
                  >
                    Revoke assignment
                  </button>
                </form>
              </SectionCard>
            ) : null}

            <SectionCard title="Approvals">
              {state.data.approvals.length === 0 ? (
                <EmptyState
                  description="No approval decisions have been recorded for this assignment."
                  title="No approvals"
                />
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="dash-compact-table">
                    <thead>
                      <tr>
                        <th>Decision</th>
                        <th>Decided By</th>
                        <th>Date</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.data.approvals.map((approval) => (
                        <tr key={approval.id}>
                          <td style={{ fontWeight: 500 }}>{approval.decision}</td>
                          <td style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{approval.decidedByPersonId ?? '—'}</td>
                          <td style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                            {approval.decisionAt ? formatDateTime(approval.decisionAt) : 'No date recorded'}
                          </td>
                          <td style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{approval.decisionReason ?? ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>

            <SectionCard title="Lifecycle History">
              <AssignmentHistoryTimeline items={state.data.history} />
            </SectionCard>

            <SectionCard title="Audit History">
              {auditLoading ? <LoadingState label="Loading audit history..." variant="skeleton" skeletonType="detail" /> : null}
              {auditError ? <ErrorState description={auditError} /> : null}
              {!auditLoading && !auditError ? (
                <AuditTimeline events={auditEvents} />
              ) : null}
            </SectionCard>
          </div>
        </>
      ) : null}
    </PageContainer>
  );
}

interface SummaryCardProps {
  label: string;
  value: string;
}

function SummaryCard({ label, value }: SummaryCardProps): JSX.Element {
  return (
    <SectionCard>
      <div className="metric-card">
        <div className="metric-card__value metric-card__value--compact">{value}</div>
        <div className="metric-card__label">{label}</div>
      </div>
    </SectionCard>
  );
}
