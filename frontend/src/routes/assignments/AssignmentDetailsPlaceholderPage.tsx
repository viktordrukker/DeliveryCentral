import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useDrilldown } from '@/app/drilldown-context';
import { useTitleBarActions } from '@/app/title-bar-context';
import { AssignmentEndActions } from '@/components/assignments/AssignmentEndActions';
import { AssignmentHistoryTimeline } from '@/components/assignments/AssignmentHistoryTimeline';
import { AssignmentInconsistencyBanner } from '@/components/assignments/AssignmentInconsistencyBanner';
import { AuditTimeline } from '@/components/common/AuditTimeline';
import { WorkloadTimeline } from '@/components/staffing-desk/WorkloadTimeline';
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
import { Button, DatePicker, Table, WorkflowStages, type Column } from '@/components/ds';
import { OnboardingScheduleModal } from '@/components/assignments/OnboardingScheduleModal';
import {
  directorApproveAssignment,
  type AssignmentStatusValue,
} from '@/lib/api/assignments';
import {
  buildNextStep,
  buildWorkflowStages,
  type NextStep,
} from '@/features/assignments/workflow-progression';

export function AssignmentDetailsPlaceholderPage(): JSX.Element {
  const { id } = useParams();
  const { principal } = useAuth();
  const state = useAssignmentDetails(id);
  const { setCurrentLabel } = useDrilldown();
  const { setActions } = useTitleBarActions();
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

  const [onboardingOpen, setOnboardingOpen] = useState<boolean>(false);
  const [escalateNotice, setEscalateNotice] = useState<boolean>(false);
  const [directorApproveError, setDirectorApproveError] = useState<string | undefined>(undefined);
  const [directorApproveBusy, setDirectorApproveBusy] = useState<boolean>(false);

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
    return () => {
      active = false;
    };
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

  // Compute the active next step + the matching CTA element ONCE so it can render
  // both inline and in the title-bar (so the user never has to scroll to act).
  const userRoles = principal?.roles ?? [];
  const isPmDm = userRoles.some((r) =>
    ['project_manager', 'delivery_manager', 'director', 'admin'].includes(r),
  );
  const isDirector = userRoles.some((r) => ['director', 'admin'].includes(r));

  const nextStep: NextStep | null = state.data
    ? buildNextStep({
        status: state.data.approvalState as AssignmentStatusValue,
        requiresDirectorApproval: state.data.requiresDirectorApproval ?? false,
      })
    : null;

  function buildCtaElement(size: 'sm' | 'md' = 'md'): JSX.Element | null {
    if (!nextStep || !nextStep.ctaKey || !nextStep.ctaLabel || !id) return null;
    switch (nextStep.ctaKey) {
      case 'directorApprove':
        if (!isDirector) return null;
        return (
          <Button
            variant="primary"
            size={size}
            disabled={directorApproveBusy}
            onClick={async () => {
              setDirectorApproveBusy(true);
              setDirectorApproveError(undefined);
              try {
                await directorApproveAssignment(id);
                await state.refresh();
              } catch (err) {
                setDirectorApproveError(
                  err instanceof Error ? err.message : 'Could not record Director approval.',
                );
              } finally {
                setDirectorApproveBusy(false);
              }
            }}
          >
            {directorApproveBusy ? 'Recording…' : nextStep.ctaLabel}
          </Button>
        );
      case 'scheduleOnboarding':
        if (!isPmDm) return null;
        return (
          <Button variant="primary" size={size} onClick={() => setOnboardingOpen(true)}>
            {nextStep.ctaLabel}
          </Button>
        );
      case 'finalize':
        return (
          <Button
            variant="primary"
            size={size}
            disabled={state.isSubmitting}
            onClick={async () => {
              await state.runTransition('ASSIGNED');
            }}
          >
            {nextStep.ctaLabel}
          </Button>
        );
      case 'escalate':
        return (
          <Button variant="secondary" size={size} onClick={() => setEscalateNotice(true)}>
            {nextStep.ctaLabel}
          </Button>
        );
      case 'resolveOnHold':
        return (
          <Button
            variant="primary"
            size={size}
            disabled={state.isSubmitting}
            onClick={async () => {
              await state.runTransition('ASSIGNED');
            }}
          >
            {nextStep.ctaLabel}
          </Button>
        );
      default:
        return null;
    }
  }

  // Hoist the active CTA into the title bar so it stays reachable regardless of
  // scroll position. The body shows the same action inline above the fold for
  // discoverability; both buttons trigger the same handler.
  const titleBarCta = useMemo(
    () => buildCtaElement('sm'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      nextStep?.ctaKey,
      nextStep?.ctaLabel,
      directorApproveBusy,
      state.isSubmitting,
      isPmDm,
      isDirector,
      id,
    ],
  );

  useEffect(() => {
    setActions(titleBarCta);
    return () => setActions(null);
  }, [titleBarCta, setActions]);

  const inlineCta = buildCtaElement('md');

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
      {id && state.data?.startDate ? (
        <OnboardingScheduleModal
          open={onboardingOpen}
          assignmentId={id}
          assignmentStartDate={state.data.startDate}
          onCancel={() => setOnboardingOpen(false)}
          onScheduled={() => {
            setOnboardingOpen(false);
            void state.refresh();
          }}
        />
      ) : null}
      <ConfirmDialog
        open={escalateNotice}
        title="Escalate to a case"
        message="The case-creation flow from an assignment is a follow-up. For now, open the Cases page and create a case there with this assignment as the related entity."
        confirmLabel="Got it"
        onCancel={() => setEscalateNotice(false)}
        onConfirm={() => setEscalateNotice(false)}
      />
      <PageHeader
        eyebrow="Assignments"
        subtitle="Staffing progress, next step, and the action that needs to happen now."
        title={state.data ? `${state.data.person.displayName} on ${state.data.project.displayName}` : 'Assignment Details'}
      />

      {state.data ? (
        <AssignmentInconsistencyBanner status={state.data.approvalState} />
      ) : null}

      {state.isLoading ? (
        <LoadingState label="Loading assignment details..." variant="skeleton" skeletonType="detail" />
      ) : null}
      {state.notFound ? (
        <SectionCard>
          <EmptyState
            description={`No assignment was found for ${id ?? 'the requested id'}.`}
            title="Assignment not found"
          />
        </SectionCard>
      ) : null}
      {state.error ? <ErrorState description={state.error} /> : null}

      {state.data && nextStep ? (
        <>
          {state.successMessage ? (
            <div className="success-banner" role="status">
              {state.successMessage}
            </div>
          ) : null}

          {/* WO-4.13 — combined Staffing progress + Next step. The CTA stays
              above the fold AND is hoisted into the title bar, so the user
              never has to scroll to act. */}
          <SectionCard title="Staffing progress">
            <WorkflowStages
              stages={buildWorkflowStages(state.data.approvalState as AssignmentStatusValue)}
              ariaLabel="Assignment workflow stages"
            />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                marginTop: 'var(--space-2)',
                paddingTop: 'var(--space-2)',
                borderTop: '1px solid var(--color-border)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{nextStep.title}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  Responsible:{' '}
                  <span style={{ fontWeight: 500, color: 'var(--color-text)' }}>{nextStep.who}</span>
                </div>
              </div>
              {inlineCta}
            </div>
            {nextStep.body ? (
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 'var(--space-1) 0 0' }}>
                {nextStep.body}
              </p>
            ) : null}
            {directorApproveError ? (
              <div role="alert" style={{ fontSize: 12, color: 'var(--color-status-danger)', marginTop: 8 }}>
                {directorApproveError}
              </div>
            ) : null}
          </SectionCard>

          <SectionCard title="Staffing details">
            <dl className="details-list">
              <div>
                <dt>Person</dt>
                <dd>
                  <Link to={`/people/${state.data.person.id}`}>{state.data.person.displayName}</Link>
                </dd>
              </div>
              <div>
                <dt>Project</dt>
                <dd>{state.data.project.displayName}</dd>
              </div>
              <div>
                <dt>Staffing role</dt>
                <dd>{state.data.staffingRole}</dd>
              </div>
              <div>
                <dt>Allocation</dt>
                <dd>{state.data.allocationPercent}%</dd>
              </div>
              <div>
                <dt>Date range</dt>
                <dd>
                  {formatDate(state.data.startDate)} —{' '}
                  {state.data.endDate ? formatDate(state.data.endDate) : 'Open-ended'}
                </dd>
              </div>
              <div>
                <dt>Requested at</dt>
                <dd>{formatDateTime(state.data.requestedAt)}</dd>
              </div>
              <div>
                <dt>Note</dt>
                <dd>{state.data.note ?? 'No note provided'}</dd>
              </div>
              {state.data.requiresDirectorApproval ? (
                <div>
                  <dt>Director approval</dt>
                  <dd style={{ color: 'var(--color-status-warning)' }}>Required (threshold tripped)</dd>
                </div>
              ) : null}
              {state.data.slaStage ? (
                <div>
                  <dt>SLA stage</dt>
                  <dd>
                    {state.data.slaStage}
                    {state.data.slaDueAt ? ` · due ${formatDateTime(state.data.slaDueAt)}` : ''}
                    {state.data.slaBreachedAt ? ' · BREACHED' : ''}
                  </dd>
                </div>
              ) : null}
            </dl>
          </SectionCard>

          <SectionCard title="Workload timeline">
            <div
              style={{
                fontSize: 11,
                color: 'var(--color-text-muted)',
                marginBottom: 'var(--space-1)',
              }}
            >
              {state.data.person.displayName}'s existing assignments with this assignment overlaid as the
              {' '}<span style={{ color: 'var(--color-status-danger)', fontWeight: 600 }}>(new)</span>{' '}segment.
            </div>
            <WorkloadTimeline
              personId={state.data.person.id}
              planned={{
                allocationPercent: state.data.allocationPercent,
                startDate: state.data.startDate,
                endDate: state.data.endDate ?? state.data.startDate,
                projectName: state.data.project.displayName,
              }}
            />
          </SectionCard>

          <SectionCard title="Cases">
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
              No linked cases yet. Use the Escalate action when there is an issue
              (performance, time mismatch, scope change, custom).
            </div>
          </SectionCard>

          <SectionCard title="All workflow actions" collapsible defaultCollapsed>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
              Low-level transitions for cases the guided flow doesn't cover (cancel, hold, etc.).
            </p>
            <AssignmentWorkflowActions
              currentStatus={state.data.approvalState}
              isSubmitting={state.isSubmitting}
              onTransition={async (target, options) => {
                await state.runTransition(target, options);
              }}
              userRoles={userRoles}
              requiresDirectorApproval={state.data.requiresDirectorApproval ?? false}
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
            <SectionCard title="Amend Assignment" collapsible defaultCollapsed>
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
                    <DatePicker onValueChange={(value) => setAmendEndDate(value)} value={amendEndDate} />
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
                <Button variant="primary" disabled={state.isSubmitting} type="submit">
                  Save amendment
                </Button>
              </form>
            </SectionCard>
          ) : null}

          {canRevoke ? (
            <SectionCard title="Revoke Assignment" collapsible defaultCollapsed>
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
                <Button variant="danger" disabled={state.isSubmitting} type="submit">
                  Revoke assignment
                </Button>
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
              <Table
                variant="compact"
                columns={[
                  { key: 'decision', title: 'Decision', getValue: (a) => a.decision, render: (a) => <span style={{ fontWeight: 500 }}>{a.decision}</span> },
                  { key: 'by', title: 'Decided By', getValue: (a) => a.decidedByPersonId ?? '', render: (a) => <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{a.decidedByPersonId ?? '—'}</span> },
                  { key: 'date', title: 'Date', getValue: (a) => a.decisionAt ?? '', render: (a) => <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{a.decisionAt ? formatDateTime(a.decisionAt) : 'No date recorded'}</span> },
                  { key: 'reason', title: 'Reason', getValue: (a) => a.decisionReason ?? '', render: (a) => <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{a.decisionReason ?? ''}</span> },
                ] as Column<typeof state.data.approvals[number]>[]}
                rows={state.data.approvals}
                getRowKey={(a) => a.id}
              />
            )}
          </SectionCard>

          <SectionCard title="Lifecycle History" collapsible defaultCollapsed>
            <AssignmentHistoryTimeline items={state.data.history} />
          </SectionCard>

          <SectionCard title="Audit History" collapsible defaultCollapsed>
            {auditLoading ? (
              <LoadingState label="Loading audit history..." variant="skeleton" skeletonType="detail" />
            ) : null}
            {auditError ? <ErrorState description={auditError} /> : null}
            {!auditLoading && !auditError ? <AuditTimeline events={auditEvents} /> : null}
          </SectionCard>
        </>
      ) : null}
    </PageContainer>
  );
}
