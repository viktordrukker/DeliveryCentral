import { useState } from 'react';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';

interface AssignmentWorkflowActionsProps {
  canApprove: boolean;
  canReject: boolean;
  isSubmitting: boolean;
  onApprove: (comment: string) => Promise<void>;
  onReject: (reason: string) => Promise<void>;
}

export function AssignmentWorkflowActions({
  canApprove,
  canReject,
  isSubmitting,
  onApprove,
  onReject,
}: AssignmentWorkflowActionsProps): JSX.Element {
  const [comment, setComment] = useState('');
  const [reason, setReason] = useState('');
  const [confirmApproveOpen, setConfirmApproveOpen] = useState(false);
  const [confirmRejectOpen, setConfirmRejectOpen] = useState(false);

  function handleApprove(): void {
    setConfirmApproveOpen(true);
  }

  function handleReject(): void {
    setConfirmRejectOpen(true);
  }

  return (
    <div className="workflow-panel">
      <ConfirmDialog
        confirmLabel="Approve"
        message="Approve this assignment request?"
        onCancel={() => setConfirmApproveOpen(false)}
        onConfirm={() => {
          setConfirmApproveOpen(false);
          void onApprove(comment);
        }}
        open={confirmApproveOpen}
        title="Approve Assignment"
      />
      <ConfirmDialog
        confirmLabel="Reject"
        message="Reject this assignment request?"
        onCancel={() => setConfirmRejectOpen(false)}
        onConfirm={() => {
          setConfirmRejectOpen(false);
          void onReject(reason);
        }}
        open={confirmRejectOpen}
        title="Reject Assignment"
      />

      {canApprove ? (
        <>
          <label className="field">
            <span className="field__label">Approval Comment</span>
            <textarea
              className="field__control field__control--textarea"
              onChange={(event) => setComment(event.target.value)}
              rows={3}
              value={comment}
            />
          </label>

          <div className="workflow-panel__actions">
            <button
              className="button"
              disabled={isSubmitting}
              onClick={handleApprove}
              type="button"
            >
              {isSubmitting ? 'Submitting...' : 'Approve assignment'}
            </button>
          </div>
        </>
      ) : null}

      {canReject ? (
        <>
          <label className="field">
            <span className="field__label">Rejection Reason</span>
            <textarea
              className="field__control field__control--textarea"
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              value={reason}
            />
          </label>

          <div className="workflow-panel__actions">
            <button
              className="button button--secondary"
              disabled={isSubmitting}
              onClick={handleReject}
              type="button"
            >
              {isSubmitting ? 'Submitting...' : 'Reject assignment'}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
