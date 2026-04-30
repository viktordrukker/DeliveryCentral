import { FormEvent } from 'react';
import { Button } from '@/components/ds';

interface GovernanceOverridePanelProps {
  actionLabel: string;
  confirmLabel: string;
  error?: string | null;
  impactMessage: string;
  isSubmitting: boolean;
  onReasonChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  reason: string;
  reasonError?: string | null;
  success?: string | null;
  subtitle: string;
  title: string;
}

export function GovernanceOverridePanel({
  actionLabel,
  confirmLabel,
  error,
  impactMessage,
  isSubmitting,
  onReasonChange,
  onSubmit,
  reason,
  reasonError,
  success,
  subtitle,
  title,
}: GovernanceOverridePanelProps): JSX.Element {
  return (
    <div className="override-panel" data-testid="governance-override-panel">
      <div className="override-panel__header">
        <div className="override-panel__eyebrow">Governance Override</div>
        <div className="override-panel__title">{title}</div>
        <p className="override-panel__copy">{subtitle}</p>
      </div>

      <div className="override-panel__impact">
        <strong>Impact:</strong> {impactMessage}
      </div>

      {error ? <div className="feedback-state feedback-state--error">{error}</div> : null}
      {success ? <div className="success-banner">{success}</div> : null}

      <form className="entity-form" onSubmit={onSubmit}>
        <label className="field">
          <span className="field__label">Override reason</span>
          <textarea
            className="field__control field__control--textarea"
            name="overrideReason"
            onChange={(event) => onReasonChange(event.target.value)}
            rows={4}
            value={reason}
          />
          {reasonError ? <span className="field__error">{reasonError}</span> : null}
        </label>

        <div className="entity-form__actions entity-form__actions--split">
          <span className="override-panel__confirmation">{confirmLabel}</span>
          <Button variant="primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Submitting override...' : actionLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
