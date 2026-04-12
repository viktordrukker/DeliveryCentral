import { useState } from 'react';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';

interface AssignmentEndActionsProps {
  canEnd: boolean;
  isSubmitting: boolean;
  onEnd: (request: { endDate: string; reason: string }) => Promise<void>;
}

export function AssignmentEndActions({
  canEnd,
  isSubmitting,
  onEnd,
}: AssignmentEndActionsProps): JSX.Element {
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleEnd(): void {
    setConfirmOpen(true);
  }

  return (
    <div className="workflow-panel">
      <ConfirmDialog
        confirmLabel="Confirm end"
        message="End this assignment? This preserves the assignment record and adds a lifecycle history entry."
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          void onEnd({ endDate, reason });
        }}
        open={confirmOpen}
        title="End Assignment"
      />

      <label className="field">
        <span className="field__label">End Date</span>
        <input
          className="field__control"
          onChange={(event) => setEndDate(event.target.value)}
          type="date"
          value={endDate}
        />
      </label>

      <label className="field">
        <span className="field__label">End Reason</span>
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
          disabled={!canEnd || isSubmitting || !endDate}
          onClick={handleEnd}
          type="button"
        >
          {isSubmitting ? 'Submitting...' : 'End assignment'}
        </button>
      </div>
    </div>
  );
}
