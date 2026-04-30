import { FormEvent } from 'react';

import { NotificationTestFormValues } from '@/features/admin/useNotificationTemplates';
import { NotificationTemplate, NotificationTestSendResponse } from '@/lib/api/notifications';
import { SectionCard } from '@/components/common/SectionCard';
import { Button } from '@/components/ds';

interface SendTestPanelProps {
  error: string | null;
  isSubmitting: boolean;
  onChange: (field: keyof NotificationTestFormValues, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  result: NotificationTestSendResponse | null;
  template: NotificationTemplate | null;
  values: NotificationTestFormValues;
}

export function SendTestPanel({
  error,
  isSubmitting,
  onChange,
  onSubmit,
  result,
  template,
  values,
}: SendTestPanelProps): JSX.Element {
  return (
    <SectionCard title="Send Test">
      <p className="dictionary-editor__copy">
        Sends a test notification using the selected template and configured channel. Channel
        secrets are not shown in this UI.
      </p>

      <form className="dictionary-entry-form" onSubmit={onSubmit}>
        <label className="field">
          <span className="field__label">Recipient</span>
          <input
            className="field__control"
            onChange={(event) => onChange('recipient', event.target.value)}
            placeholder="example@company.test or webhook alias"
            type="text"
            value={values.recipient}
          />
        </label>

        <label className="field">
          <span className="field__label">Payload JSON</span>
          <textarea
            className="field__control field__control--textarea"
            onChange={(event) => onChange('payload', event.target.value)}
            value={values.payload}
          />
        </label>

        {template ? (
          <div className="admin-config-viewer__item">
            <dl className="admin-config-viewer">
              <div>
                <dt>Template</dt>
                <dd>{template.displayName}</dd>
              </div>
              <div>
                <dt>Channel</dt>
                <dd>{template.channelKey}</dd>
              </div>
            </dl>
          </div>
        ) : null}

        {error ? <div className="field__error">{error}</div> : null}

        {result ? (
          <div className="admin-config-viewer__item" role="status">
            <dl className="admin-config-viewer">
              <div>
                <dt>Status</dt>
                <dd>{result.status}</dd>
              </div>
              <div>
                <dt>Delivery ID</dt>
                <dd>{result.deliveryId}</dd>
              </div>
              <div>
                <dt>Request ID</dt>
                <dd>{result.notificationRequestId}</dd>
              </div>
            </dl>
          </div>
        ) : null}

        <div className="entity-form__actions">
          <Button variant="primary" disabled={isSubmitting || !template} type="submit">
            {isSubmitting ? 'Sending test...' : 'Send test'}
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}
