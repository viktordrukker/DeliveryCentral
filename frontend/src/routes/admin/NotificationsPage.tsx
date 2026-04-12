import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';

import { NotificationOutcomeList } from '@/components/admin/NotificationOutcomeList';
import { SendTestPanel } from '@/components/admin/SendTestPanel';
import { TemplateList } from '@/components/admin/TemplateList';
import { TemplatePreview } from '@/components/admin/TemplatePreview';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import {
  NotificationTestFormValues,
  initialNotificationTestFormValues,
  useNotificationTemplates,
} from '@/features/admin/useNotificationTemplates';
import { useNotificationQueue } from '@/features/admin/useNotificationQueue';

const STATUS_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Queued', value: 'QUEUED' },
  { label: 'Retrying', value: 'RETRYING' },
  { label: 'Sent', value: 'SENT' },
  { label: 'Failed (terminal)', value: 'FAILED_TERMINAL' },
];

export function NotificationsPage(): JSX.Element {
  const [values, setValues] = useState<NotificationTestFormValues>(
    initialNotificationTestFormValues,
  );
  const state = useNotificationTemplates();
  const queue = useNotificationQueue();

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await state.submitTestSend(values);
  }

  function handleChange(field: keyof NotificationTestFormValues, value: string): void {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
  }

  const totalPages = Math.max(1, Math.ceil(queue.totalCount / queue.pageSize));

  return (
    <PageContainer viewport>
      <PageHeader
        actions={
          <Link className="button button--secondary" to="/admin">
            Back to admin panel
          </Link>
        }
        eyebrow="Administration"
        subtitle="Review configured notification templates and send safe test messages without exposing channel secrets."
        title="Notification Templates"
      />

      {state.isLoading ? <LoadingState label="Loading notification templates..." /> : null}
      {state.error && !state.selectedTemplate ? <ErrorState description={state.error} /> : null}

      {!state.isLoading && !state.error ? (
        state.templates.length === 0 ? (
          <SectionCard>
            <EmptyState
              description="No notification templates were returned by the notifications API."
              title="No templates available"
            />
          </SectionCard>
        ) : (
          <div className="dictionary-admin-grid">
            <SectionCard title="Templates">
              <TemplateList
                items={state.templates}
                onSelect={state.selectTemplate}
                selectedKey={state.selectedTemplateKey}
              />
            </SectionCard>

            <div className="dictionary-editor">
              <TemplatePreview template={state.selectedTemplate} />
              <SendTestPanel
                error={state.error}
                isSubmitting={state.isSubmitting}
                onChange={handleChange}
                onSubmit={handleSubmit}
                result={state.result}
                template={state.selectedTemplate}
                values={values}
              />
              {state.successMessage ? (
                <div className="success-banner" role="status">
                  {state.successMessage}
                </div>
              ) : null}

              <SectionCard title="Recent Notification Outcomes">
                <NotificationOutcomeList items={state.outcomes} />
              </SectionCard>
            </div>
          </div>
        )
      ) : null}

      <SectionCard title="Notification Queue">
        <div className="entity-form__actions">
          <label className="field" style={{ maxWidth: '220px' }}>
            <span className="field__label">Filter by status</span>
            <select
              className="field__control"
              onChange={(e) => queue.handleStatusChange(e.target.value)}
              value={queue.selectedStatus}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {queue.isLoading ? <LoadingState label="Loading notification queue..." /> : null}
        {queue.error ? <ErrorState description={queue.error} /> : null}

        {!queue.isLoading && !queue.error ? (
          <>
            <div className="results-meta">
              <span>
                {queue.totalCount} request{queue.totalCount === 1 ? '' : 's'} &mdash; page{' '}
                {queue.page} of {totalPages}
              </span>
            </div>

            {queue.items.length === 0 ? (
              <EmptyState
                description="No notification requests match the selected status filter."
                title="No notifications"
              />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Recipient</th>
                    <th>Event</th>
                    <th>Status</th>
                    <th>Attempts</th>
                    <th>Requested At</th>
                    <th>Payload</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.recipient}</td>
                      <td>{item.eventName}</td>
                      <td>
                        <span className={`status-badge status-badge--${item.status.toLowerCase()}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>
                        {item.attemptCount} / {item.maxAttempts}
                      </td>
                      <td>{new Date(item.requestedAt).toLocaleString('en-US')}</td>
                      <td>
                        <details>
                          <summary>Detail</summary>
                          {item.latestRenderedBody ? (
                            <>
                              <p><strong>Rendered body:</strong></p>
                              <pre className="code-block">{item.latestRenderedBody}</pre>
                            </>
                          ) : null}
                          <p><strong>Payload:</strong></p>
                          <pre className="code-block">
                            {JSON.stringify(item.payload, null, 2)}
                          </pre>
                        </details>
                        {item.failureReason ? (
                          <span className="error-text">{item.failureReason}</span>
                        ) : null}
                      </td>
                      <td>
                        {item.status === 'FAILED_TERMINAL' ? (
                          <button
                            className="button button--secondary"
                            disabled={queue.isLoading}
                            onClick={() => { void queue.handleRequeue(item.id); }}
                            style={{ fontSize: '11px', padding: '2px 8px' }}
                            type="button"
                          >
                            Requeue
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {queue.totalCount > queue.pageSize ? (
              <div className="pagination">
                <button
                  className="button button--secondary"
                  disabled={queue.page <= 1 || queue.isLoading}
                  onClick={queue.handlePrevPage}
                  type="button"
                >
                  Previous
                </button>
                <span className="pagination__info">
                  Page {queue.page} of {totalPages}
                </span>
                <button
                  className="button button--secondary"
                  disabled={queue.page >= totalPages || queue.isLoading}
                  onClick={queue.handleNextPage}
                  type="button"
                >
                  Next
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </SectionCard>
    </PageContainer>
  );
}
