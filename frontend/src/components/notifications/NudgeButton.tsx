import { useState } from 'react';
import { toast } from 'sonner';

import { sendNudge, NudgeRateLimitError } from '@/lib/api/nudge';

interface Props {
  requestId: string;
  approverId: string;
  label?: string;
  size?: 'sm' | 'md';
}

/**
 * One-click reminder button for pending approvals.
 * Server enforces a 24h rate-limit per (approverId, requestId);
 * on 429 the button stays disabled with a "Recently nudged" tooltip.
 */
export function NudgeButton({ requestId, approverId, label = 'Nudge approver', size = 'sm' }: Props): JSX.Element {
  const [busy, setBusy] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [reason, setReason] = useState<string | null>(null);

  async function handleClick(): Promise<void> {
    if (busy || disabled) return;
    setBusy(true);
    try {
      await sendNudge({ requestId, approverId });
      toast.success('Nudge sent.');
      setDisabled(true);
      setReason('Nudge sent recently. Try again in 24 hours.');
    } catch (err) {
      if (err instanceof NudgeRateLimitError) {
        setDisabled(true);
        setReason('Already nudged within the last 24 hours.');
        toast.info('Already nudged recently.');
      } else {
        toast.error(err instanceof Error ? err.message : 'Failed to send nudge.');
      }
    } finally {
      setBusy(false);
    }
  }

  const className = `button button--secondary ${size === 'sm' ? 'button--sm' : ''}`.trim();

  return (
    <button
      className={className}
      disabled={busy || disabled}
      onClick={() => void handleClick()}
      title={reason ?? 'Send a reminder to the approver'}
      type="button"
    >
      {busy ? 'Sending\u2026' : disabled ? 'Nudged \u2713' : label}
    </button>
  );
}
