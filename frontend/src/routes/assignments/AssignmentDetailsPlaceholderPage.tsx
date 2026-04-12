import { FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { Breadcrumb } from '@/components/common/Breadcrumb';
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
import { useAssignmentDetails } from '@/features/assignments/useAssignmentDetails';
import { useAuth } from '@/app/auth-context';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchBusinessAudit, BusinessAuditRecord } from '@/lib/api/business-audit';

export function AssignmentDetailsPlaceholderPage(): JSX.Element {
  const { id } = useParams();
  const { principal } = useAuth();
  const state = useAssignmentDetails(id);
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

  const amendableStatuses = ['APPROVED', 'ACTIVE', 'REQUESTED'];
  const canAmend = state.data ? amendableStatuses.includes(state.data.approvalState) : false;
  const canRevoke = state.data ? amendableStatuses.includes(state.data.approvalState) : false;

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
      <Breadcrumb
        items={[
          { href: '/', label: 'Home' },
          { href: '/assignments', label: 'Assignments' },
          { label: breadcrumbLabel },
        ]}
      />
      <PageHeader
        eyebrow="Assignments"
        subtitle="Review formal staffing state and execute explicit approval workflow actions."
        title={state.data ? `${state.data.person.displayName} on ${state.data.project.displayName}` : 'Assignment Details'}
      />

      {state.isLoading ? <LoadingState label="Loading assignment details..." /> : null}
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
          <div className="details-summary-grid">
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

          <div className="details-grid">
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
                    {new Date(state.data.startDate).toLocaleDateString('en-US')} -{' '}
                    {state.data.endDate ? new Date(state.data.endDate).toLocaleDateString('en-US') : 'Open-ended'}
                  </dd>
                </div>
                <div>
                  <dt>Requested At</dt>
                  <dd>{new Date(state.data.requestedAt).toLocaleString('en-US')}</dd>
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
                canApprove={state.data.canApprove}
                canReject={state.data.canReject}
                isSubmitting={state.isSubmitting}
                onApprove={async (comment) => {
                  await state.runDecision('approve', {
                    ...(actorId ? { actorId } : {}),
                    comment: comment || undefined,
                  });
                }}
                onReject={async (reason) => {
                  await state.runDecision('reject', {
                    ...(actorId ? { actorId } : {}),
                    reason: reason || undefined,
                  });
                }}
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
                <div className="monitoring-list">
                  {state.data.approvals.map((approval) => (
                    <div className="monitoring-list__item" key={approval.id}>
                      <div className="monitoring-list__title">
                        {approval.decision}
                        {approval.decidedByPersonId ? ` — by ${approval.decidedByPersonId}` : ''}
                      </div>
                      <p className="monitoring-list__summary">
                        {approval.decisionAt
                          ? new Date(approval.decisionAt).toLocaleString('en-US')
                          : 'No date recorded'}
                        {approval.decisionReason ? ` · ${approval.decisionReason}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Lifecycle History">
              <AssignmentHistoryTimeline items={state.data.history} />
            </SectionCard>

            <SectionCard title="Audit History">
              {auditLoading ? <LoadingState label="Loading audit history..." /> : null}
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
