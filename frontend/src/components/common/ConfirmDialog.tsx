import { useEffect, useState } from 'react';

import { Button, Modal, Textarea } from '@/components/ds';

interface ConfirmDialogProps {
  confirmLabel?: string;
  message: string;
  onCancel: () => void;
  onConfirm: (reason?: string) => void;
  open: boolean;
  requireReason?: boolean;
  title: string;
  /**
   * Phase DS-2-3 — visual tone of the primary action. `'danger'` styles the
   * Confirm button as destructive (red). Default: `'default'` (primary blue).
   * Existing callsites that don't pass `tone` continue to render unchanged.
   */
  tone?: 'default' | 'danger';
}

/**
 * Phase DS-2-3 — rebuilt on `<Modal>`. Same external API as before so the
 * 50+ existing callsites work without changes; internally now inherits
 * focus trap, scroll lock, escape close, mobile auto-fullscreen, and stack
 * management from the shared overlay infrastructure.
 */
export function ConfirmDialog({
  confirmLabel = 'Confirm',
  message,
  onCancel,
  onConfirm,
  open,
  requireReason = false,
  title,
  tone = 'default',
}: ConfirmDialogProps): JSX.Element {
  const [reason, setReason] = useState('');

  // Reset the reason field whenever the dialog re-opens — prevents leaking
  // a previous reason into the next confirm.
  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  function handleConfirm(): void {
    onConfirm(requireReason ? reason : undefined);
    setReason('');
  }

  function handleCancel(): void {
    onCancel();
    setReason('');
  }

  return (
    <Modal
      open={open}
      onClose={handleCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            disabled={requireReason && !reason.trim()}
            onClick={handleConfirm}
            data-autofocus="true"
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="ds-confirm-dialog__message">{message}</p>
      {requireReason ? (
        <label className="ds-confirm-dialog__reason">
          <span className="ds-confirm-dialog__reason-label">Reason</span>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
      ) : null}
    </Modal>
  );
}
