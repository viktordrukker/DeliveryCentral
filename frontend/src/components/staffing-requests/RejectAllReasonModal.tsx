import { useEffect, useState } from 'react';

import { Combobox, type ComboboxOption, FormField, FormModal, Textarea } from '@/components/ds';
import { fetchMetadataDictionaries, fetchMetadataDictionaryById } from '@/lib/api/metadata';

interface RejectAllReasonModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (input: { reasonCode: string; reason?: string; sendBack: boolean }) => Promise<void> | void;
}

const DICTIONARY_KEY = 'assignment-rejection-reasons';

/**
 * Reject the proposal slate. Reasons come from the
 * `assignment-rejection-reasons` MetadataDictionary. The "Send back to RM"
 * toggle decides whether the request returns to OPEN or moves to CANCELLED.
 */
export function RejectAllReasonModal(props: RejectAllReasonModalProps): JSX.Element | null {
  if (!props.open) return null;
  return <Inner {...props} />;
}

function Inner({ open, onCancel, onSubmit }: RejectAllReasonModalProps): JSX.Element {
  const [reasonOptions, setReasonOptions] = useState<ComboboxOption[]>([]);
  const [reasonCode, setReasonCode] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [sendBack, setSendBack] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const list = await fetchMetadataDictionaries({ entityType: 'ProjectAssignment' });
        const summary = list.items.find((d) => d.dictionaryKey === DICTIONARY_KEY);
        if (!summary) {
          if (active) setLoadError('Rejection-reason taxonomy is not configured.');
          return;
        }
        const detail = await fetchMetadataDictionaryById(summary.id);
        if (!active) return;
        const opts = detail.entries
          .filter((e) => e.isEnabled)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map<ComboboxOption>((e) => ({ value: e.entryKey, label: e.displayName }));
        setReasonOptions(opts);
      } catch (err) {
        if (active) setLoadError(err instanceof Error ? err.message : 'Failed to load rejection reasons.');
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <FormModal
      open={open}
      onCancel={onCancel}
      onSubmit={async () => {
        await onSubmit({
          reasonCode,
          reason: reason.trim() ? reason.trim() : undefined,
          sendBack,
        });
      }}
      title="Reject all candidates"
      description={
        sendBack
          ? 'The request returns to OPEN so the Resource Manager can build another slate.'
          : 'The request moves to CANCELLED. Use this only when the role is no longer needed.'
      }
      size="sm"
      submitLabel={sendBack ? 'Send back to RM' : 'Cancel the request'}
      cancelLabel="Keep reviewing"
      tone="danger"
      submitDisabled={!reasonCode}
      dirty={Boolean(reasonCode || reason)}
      testId="reject-all-reason-modal"
    >
      <FormField
        label="Reason"
        required
        hint={!loadError ? 'Configurable via Admin → Dictionaries → Assignment Rejection Reasons.' : undefined}
        error={loadError}
      >
        <Combobox
          value={reasonCode || null}
          onValueChange={(v) => setReasonCode(v ?? '')}
          options={reasonOptions}
          placeholder={loadError ? 'Reasons unavailable' : 'Pick a reason…'}
          disabled={Boolean(loadError)}
        />
      </FormField>
      <FormField label="Note (optional)" hint="Free-text context for the RM. Visible in audit history.">
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="e.g. None of the candidates have the required clearance."
        />
      </FormField>
      <FormField
        label="Outcome"
        hint="Pick whether to ask the RM to retry, or close the request entirely."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="radio"
              checked={sendBack}
              onChange={() => setSendBack(true)}
              name="reject-outcome"
            />
            Send back to RM (request → OPEN)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="radio"
              checked={!sendBack}
              onChange={() => setSendBack(false)}
              name="reject-outcome"
            />
            Cancel this request (request → CANCELLED)
          </label>
        </div>
      </FormField>
    </FormModal>
  );
}
