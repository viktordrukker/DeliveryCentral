import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useDrilldown } from '@/app/drilldown-context';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { formatDate, formatDateTime } from '@/lib/format-date';
import {
  CaseComment,
  CaseRecord,
  CaseStep,
  addCaseComment,
  addCaseStep,
  archiveCaseRecord,
  cancelCaseRecord,
  closeCaseRecord,
  completeCaseStep,
  fetchCaseComments,
  fetchCaseSteps,
  removeCaseStep,
  CaseSlaStatus,
  fetchCaseSlaStatus,
} from '@/lib/api/cases';
import { useAuth } from '@/app/auth-context';
import { useCaseDetails } from '@/features/cases/useCaseDetails';

export function CaseDetailsPage(): JSX.Element {
  const { id } = useParams();
  const { principal } = useAuth();
  const state = useCaseDetails(id);
  const { setCurrentLabel } = useDrilldown();
  const [caseData, setCaseData] = useState<CaseRecord | null>(null);
  const [steps, setSteps] = useState<CaseStep[]>([]);
  const [stepsLoading, setStepsLoading] = useState(false);
  const [completingStep, setCompletingStep] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [newStepName, setNewStepName] = useState('');
  const [addingStep, setAddingStep] = useState(false);
  const [removingStep, setRemovingStep] = useState<string | null>(null);
  const [comments, setComments] = useState<CaseComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [slaStatus, setSlaStatus] = useState<CaseSlaStatus | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  const displayCase = caseData ?? state.data;

  useEffect(() => {
    if (displayCase?.caseNumber) setCurrentLabel(displayCase.caseNumber);
  }, [displayCase?.caseNumber, setCurrentLabel]);

  useEffect(() => {
    if (!id) {
      return;
    }

    setStepsLoading(true);
    void fetchCaseSteps(id)
      .then((data) => setSteps(data))
      .catch(() => setSteps([]))
      .finally(() => setStepsLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setCommentsLoading(true);
    void fetchCaseComments(id)
      .then((data) => setComments(data))
      .catch(() => setComments([]))
      .finally(() => setCommentsLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    void fetchCaseSlaStatus(id)
      .then((data) => setSlaStatus(data))
      .catch(() => { /* SLA not critical */ });
  }, [id]);

  async function handleCompleteStep(stepKey: string): Promise<void> {
    if (!id) {
      return;
    }

    setCompletingStep(stepKey);
    setStepError(null);

    try {
      const updated = await completeCaseStep(id, stepKey);
      setSteps((prev) => prev.map((s) => (s.stepKey === stepKey ? updated : s)));
    } catch (error) {
      setStepError(error instanceof Error ? error.message : 'Failed to complete step.');
    } finally {
      setCompletingStep(null);
    }
  }

  async function handleClose(): Promise<void> {
    if (!id) return;
    setIsClosing(true);
    setLifecycleError(null);
    try {
      const updated = await closeCaseRecord(id);
      setCaseData(updated);
    } catch (error) {
      setLifecycleError(error instanceof Error ? error.message : 'Failed to close case.');
    } finally {
      setIsClosing(false);
    }
  }

  async function handleCancel(): Promise<void> {
    if (!id || !cancelReason.trim()) return;
    setIsCancelling(true);
    setLifecycleError(null);
    try {
      const updated = await cancelCaseRecord(id, cancelReason.trim());
      setCaseData(updated);
      setShowCancelForm(false);
      setCancelReason('');
    } catch (error) {
      setLifecycleError(error instanceof Error ? error.message : 'Failed to cancel case.');
    } finally {
      setIsCancelling(false);
    }
  }

  async function handleArchive(): Promise<void> {
    if (!id) return;
    setIsArchiving(true);
    setLifecycleError(null);
    try {
      const updated = await archiveCaseRecord(id);
      setCaseData(updated);
    } catch (error) {
      setLifecycleError(error instanceof Error ? error.message : 'Failed to archive case.');
    } finally {
      setIsArchiving(false);
    }
  }

  async function handleAddStep(): Promise<void> {
    if (!id || !newStepName.trim()) return;
    setAddingStep(true);
    setStepError(null);
    try {
      const step = await addCaseStep(id, newStepName.trim());
      setSteps((prev) => [...prev, step]);
      setNewStepName('');
    } catch (error) {
      setStepError(error instanceof Error ? error.message : 'Failed to add step.');
    } finally {
      setAddingStep(false);
    }
  }

  async function handleRemoveStep(stepKey: string): Promise<void> {
    if (!id) return;
    setRemovingStep(stepKey);
    setStepError(null);
    try {
      await removeCaseStep(id, stepKey);
      setSteps((prev) => prev.filter((s) => s.stepKey !== stepKey));
    } catch (error) {
      setStepError(error instanceof Error ? error.message : 'Failed to remove step.');
    } finally {
      setRemovingStep(null);
    }
  }

  async function handleAddComment(): Promise<void> {
    if (!id || !newComment.trim() || !principal?.personId) return;
    setAddingComment(true);
    setCommentError(null);
    try {
      const comment = await addCaseComment(id, principal.personId, newComment.trim());
      setComments((prev) => [...prev, comment]);
      setNewComment('');
    } catch (error) {
      setCommentError(error instanceof Error ? error.message : 'Failed to add comment.');
    } finally {
      setAddingComment(false);
    }
  }

  return (
    <PageContainer testId="case-details-page">
      <ConfirmDialog
        confirmLabel="Close case"
        message="Close this case? The case will be marked as closed."
        onCancel={() => setConfirmCloseOpen(false)}
        onConfirm={() => {
          setConfirmCloseOpen(false);
          void handleClose();
        }}
        open={confirmCloseOpen}
        title="Close Case"
      />
      <ConfirmDialog
        confirmLabel="Archive case"
        message="Archive this case? The case will be preserved but removed from active views."
        onCancel={() => setConfirmArchiveOpen(false)}
        onConfirm={() => {
          setConfirmArchiveOpen(false);
          void handleArchive();
        }}
        open={confirmArchiveOpen}
        title="Archive Case"
      />
      <ConfirmDialog
        confirmLabel="Cancel case"
        message={cancelReason.trim() ? `Cancel with reason: "${cancelReason}"` : 'Please enter a cancellation reason below before confirming.'}
        onCancel={() => setConfirmCancelOpen(false)}
        onConfirm={() => {
          setConfirmCancelOpen(false);
          void handleCancel();
        }}
        open={confirmCancelOpen}
        title="Cancel Case"
      />
      <PageHeader
        actions={
          <Link className="button button--secondary" to="/cases">
            Back to cases
          </Link>
        }
        eyebrow="Cases"
        subtitle="Review linked people and optional staffing context without collapsing case workflow into assignment workflow."
        title={displayCase?.caseNumber ?? 'Case Detail'}
      />

      {state.isLoading ? <LoadingState label="Loading case details..." variant="skeleton" skeletonType="detail" /> : null}
      {state.notFound ? (
        <SectionCard>
          <EmptyState
            description={`No case was found for ${id ?? 'the requested id'}.`}
            title="Case not found"
          />
        </SectionCard>
      ) : null}
      {state.error ? <ErrorState description={state.error} /> : null}

      {displayCase ? (
        <>
          <div className="kpi-strip">
            <SummaryCard label="Case Number" value={displayCase.caseNumber} />
            <SummaryCard label="Type" value={displayCase.caseTypeDisplayName} />
            <SummaryCard label="Status" value={displayCase.status} />
            <SummaryCard label="Participants" value={String(displayCase.participants.length + 2)} />
          </div>

          {slaStatus && (displayCase.status === 'OPEN' || displayCase.status === 'IN_PROGRESS') ? (
            <div
              style={{
                background: slaStatus.isOverdue
                  ? (slaStatus.escalationTier >= 2 ? 'var(--color-danger-bg)' : 'var(--color-warning-bg)')
                  : 'var(--color-success-bg)',
                border: `1px solid ${slaStatus.isOverdue ? (slaStatus.escalationTier >= 2 ? 'var(--color-status-danger)' : 'var(--color-status-warning)') : 'var(--color-status-active)'}`,
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.75rem 1rem',
                marginBottom: '1rem',
              }}
            >
              <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                SLA:
              </span>
              {slaStatus.isOverdue ? (
                <span style={{ color: slaStatus.escalationTier >= 2 ? 'var(--color-status-danger)' : 'var(--color-status-warning)', fontSize: '0.875rem' }}>
                  {slaStatus.hoursOverdue.toFixed(1)}h overdue
                  {slaStatus.escalationTier > 0 ? ` — Escalation Tier ${slaStatus.escalationTier}` : ''}
                </span>
              ) : (
                <span style={{ color: 'var(--color-status-active)', fontSize: '0.875rem' }}>
                  {slaStatus.hoursRemaining.toFixed(1)}h remaining (deadline: {formatDateTime(slaStatus.deadline)})
                </span>
              )}
            </div>
          ) : null}

          {lifecycleError ? <ErrorState description={lifecycleError} /> : null}

          {displayCase.status === 'OPEN' || displayCase.status === 'IN_PROGRESS' ? (
            <SectionCard title="Case Actions">
              <div className="entity-form__actions" style={{ gap: '12px', display: 'flex', flexWrap: 'wrap' }}>
                <button
                  className="button button--primary"
                  disabled={isClosing}
                  onClick={() => setConfirmCloseOpen(true)}
                  type="button"
                >
                  {isClosing ? 'Closing...' : 'Close Case'}
                </button>
                <button
                  className="button button--secondary"
                  onClick={() => setShowCancelForm((v) => !v)}
                  type="button"
                >
                  Cancel Case
                </button>
                <button
                  className="button button--secondary"
                  disabled={isArchiving}
                  onClick={() => setConfirmArchiveOpen(true)}
                  type="button"
                >
                  {isArchiving ? 'Archiving...' : 'Archive'}
                </button>
              </div>
              {showCancelForm ? (
                <div style={{ marginTop: '12px' }}>
                  <label className="field">
                    <span className="field__label">Cancellation reason</span>
                    <textarea
                      className="field__control"
                      onChange={(e) => setCancelReason(e.target.value)}
                      rows={3}
                      value={cancelReason}
                    />
                  </label>
                  <div className="entity-form__actions" style={{ marginTop: '8px' }}>
                    <button
                      className="button button--primary"
                      disabled={isCancelling || !cancelReason.trim()}
                      onClick={() => setConfirmCancelOpen(true)}
                      type="button"
                    >
                      {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                    </button>
                    <button
                      className="button button--secondary"
                      onClick={() => { setShowCancelForm(false); setCancelReason(''); }}
                      type="button"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ) : null}
            </SectionCard>
          ) : null}

          <div className="dashboard-main-grid">
            <SectionCard title="Case Summary">
              <dl className="details-list">
                <div>
                  <dt>Case Number</dt>
                  <dd>{displayCase.caseNumber}</dd>
                </div>
                <div>
                  <dt>Case Type</dt>
                  <dd>{displayCase.caseTypeDisplayName}</dd>
                </div>
                <div>
                  <dt>Subject Person</dt>
                  <dd>
                    <Link to={`/people/${displayCase.subjectPersonId}`}>
                      {displayCase.subjectPersonName ?? displayCase.subjectPersonId}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt>Owner Person</dt>
                  <dd>
                    <Link to={`/people/${displayCase.ownerPersonId}`}>
                      {displayCase.ownerPersonName ?? displayCase.ownerPersonId}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt>Opened</dt>
                  <dd>{formatDateTime(displayCase.openedAt)}</dd>
                </div>
                {displayCase.closedAt ? (
                  <div>
                    <dt>Closed</dt>
                    <dd>{formatDateTime(displayCase.closedAt)}</dd>
                  </div>
                ) : null}
                {displayCase.cancelReason ? (
                  <div>
                    <dt>Cancellation reason</dt>
                    <dd>{displayCase.cancelReason}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>Summary</dt>
                  <dd>{displayCase.summary ?? 'No summary provided'}</dd>
                </div>
              </dl>
            </SectionCard>

            <SectionCard title="Workflow Steps">
              {stepsLoading ? <LoadingState label="Loading steps..." variant="skeleton" skeletonType="detail" /> : null}
              {stepError ? <ErrorState description={stepError} /> : null}
              {!stepsLoading && steps.length === 0 ? (
                <EmptyState
                  description="No workflow steps are defined for this case."
                  title="No steps"
                />
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="dash-compact-table">
                    <thead>
                      <tr>
                        <th>Step</th>
                        <th>Status</th>
                        <th>Details</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {steps.map((step) => (
                        <tr key={step.stepKey}>
                          <td style={{ fontWeight: 500 }}>{step.displayName}</td>
                          <td>
                            {step.status === 'COMPLETED' ? (
                              <span
                                style={{
                                  backgroundColor: 'var(--color-success-bg)',
                                  border: '1px solid var(--color-status-active)',
                                  borderRadius: '4px',
                                  color: 'var(--color-status-active)',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  padding: '1px 6px',
                                }}
                              >
                                Completed
                              </span>
                            ) : (
                              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{step.status}</span>
                            )}
                          </td>
                          <td style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                            {step.completedAt ? formatDateTime(step.completedAt) : ''}
                            {step.dueAt && step.status !== 'COMPLETED' ? `Due ${formatDate(step.dueAt)}` : ''}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              {step.status !== 'COMPLETED' ? (
                                <button
                                  className="button button--secondary"
                                  disabled={completingStep === step.stepKey}
                                  onClick={() => { void handleCompleteStep(step.stepKey); }}
                                  type="button"
                                >
                                  {completingStep === step.stepKey ? 'Completing...' : 'Complete'}
                                </button>
                              ) : null}
                              <button
                                className="button button--secondary"
                                disabled={removingStep === step.stepKey}
                                onClick={() => { void handleRemoveStep(step.stepKey); }}
                                style={{ fontSize: '12px' }}
                                type="button"
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {(displayCase?.status === 'OPEN' || displayCase?.status === 'IN_PROGRESS') ? (
                <div style={{ borderTop: '1px solid var(--color-border)', display: 'flex', gap: '8px', marginTop: '12px', paddingTop: '12px' }}>
                  <input
                    className="field__control"
                    onChange={(e) => setNewStepName(e.target.value)}
                    placeholder="Add custom step..."
                    style={{ flex: 1 }}
                    type="text"
                    value={newStepName}
                  />
                  <button
                    className="button button--primary"
                    disabled={addingStep || !newStepName.trim()}
                    onClick={() => { void handleAddStep(); }}
                    type="button"
                  >
                    {addingStep ? 'Adding...' : 'Add Step'}
                  </button>
                </div>
              ) : null}
            </SectionCard>

            <SectionCard title="Comments">
              {commentsLoading ? <LoadingState label="Loading comments..." variant="skeleton" skeletonType="detail" /> : null}
              {commentError ? <ErrorState description={commentError} /> : null}
              {!commentsLoading && comments.length === 0 ? (
                <EmptyState description="No comments yet." title="No comments" />
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="dash-compact-table">
                    <thead>
                      <tr>
                        <th>Comment</th>
                        <th>Author</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comments.map((comment) => (
                        <tr key={comment.id}>
                          <td style={{ fontWeight: 500 }}>{comment.body}</td>
                          <td style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{comment.authorPersonId}</td>
                          <td style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{formatDateTime(comment.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {principal?.personId ? (
                <div style={{ borderTop: comments.length > 0 ? '1px solid var(--color-border)' : 'none', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', paddingTop: comments.length > 0 ? '12px' : 0 }}>
                  <textarea
                    className="field__control"
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    rows={3}
                    value={newComment}
                  />
                  <button
                    className="button button--primary"
                    disabled={addingComment || !newComment.trim()}
                    onClick={() => { void handleAddComment(); }}
                    style={{ alignSelf: 'flex-end' }}
                    type="button"
                  >
                    {addingComment ? 'Posting...' : 'Post Comment'}
                  </button>
                </div>
              ) : null}
            </SectionCard>

            <SectionCard title="Linked Context">
              <dl className="details-list">
                <div>
                  <dt>Related Project</dt>
                  <dd>
                    {displayCase.relatedProjectId ? (
                      <Link to={`/projects/${displayCase.relatedProjectId}`}>
                        {displayCase.relatedProjectId}
                      </Link>
                    ) : (
                      'No related project'
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Related Assignment</dt>
                  <dd>
                    {displayCase.relatedAssignmentId ? (
                      <Link to={`/assignments/${displayCase.relatedAssignmentId}`}>
                        {displayCase.relatedAssignmentId}
                      </Link>
                    ) : (
                      'No related assignment'
                    )}
                  </dd>
                </div>
              </dl>
            </SectionCard>

            <SectionCard title="Participants">
              {displayCase.participants.length === 0 ? (
                <EmptyState
                  description="No participants were added to this case."
                  title="No participants"
                />
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="dash-compact-table">
                    <thead>
                      <tr>
                        <th>Role</th>
                        <th>Person</th>
                        <th style={{ textAlign: 'right' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayCase.participants.map((participant) => (
                        <tr key={`${participant.personId}-${participant.role}`} style={{ cursor: 'pointer' }} onClick={() => window.location.assign(`/people/${participant.personId}`)}>
                          <td style={{ fontWeight: 500 }}>{participant.role}</td>
                          <td style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{participant.personId}</td>
                          <td style={{ textAlign: 'right' }}>
                            <Link style={{ fontSize: 10, color: 'var(--color-accent)' }} to={`/people/${participant.personId}`}>
                              Open person
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
