import { useState } from 'react';

interface ConfirmDialogProps {
  confirmLabel?: string;
  message: string;
  onCancel: () => void;
  onConfirm: (reason?: string) => void;
  open: boolean;
  requireReason?: boolean;
  title: string;
}

export function ConfirmDialog({
  confirmLabel = 'Confirm',
  message,
  onCancel,
  onConfirm,
  open,
  requireReason = false,
  title,
}: ConfirmDialogProps): JSX.Element | null {
  const [reason, setReason] = useState('');

  if (!open) return null;

  function handleConfirm(): void {
    onConfirm(requireReason ? reason : undefined);
    setReason('');
  }

  function handleCancel(): void {
    onCancel();
    setReason('');
  }

  return (
    <div
      aria-modal="true"
      className="confirm-dialog-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleCancel();
      }}
      role="dialog"
    >
      <div className="confirm-dialog">
        <h3 className="confirm-dialog__title">{title}</h3>
        <p className="confirm-dialog__message">{message}</p>

        {requireReason ? (
          <label className="field">
            <span className="field__label">Reason</span>
            <textarea
              className="field__control"
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              value={reason}
            />
          </label>
        ) : null}

        <div className="confirm-dialog__actions">
          <button
            className="button"
            disabled={requireReason && !reason.trim()}
            onClick={handleConfirm}
            type="button"
          >
            {confirmLabel}
          </button>
          <button className="button button--secondary" onClick={handleCancel} type="button">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
