import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { ADMIN_ROLES, hasAnyRole } from '@/app/route-manifest';
import { NotificationOutcomeList } from '@/components/admin/NotificationOutcomeList';
import { SendTestPanel } from '@/components/admin/SendTestPanel';
import { TemplateList } from '@/components/admin/TemplateList';
import { TemplatePreview } from '@/components/admin/TemplatePreview';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PaginationControls } from '@/components/common/PaginationControls';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatDateTime } from '@/lib/format-date';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import {
  NotificationTestFormValues,
  initialNotificationTestFormValues,
  useNotificationTemplates,
} from '@/features/admin/useNotificationTemplates';
import { useNotificationQueue } from '@/features/admin/useNotificationQueue';
import { Button, Table, type Column } from '@/components/ds';
import type { NotificationQueueItem } from '@/lib/api/notifications';

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
  // W1-26 — director sees a read-only view: the surface is hidden from
  // navigation for them by the manifest, but if they deep-link in they should
  // not see Send-test or Requeue write actions. Only admin gets write controls.
  const { principal } = useAuth();
  const canEdit = hasAnyRole(principal?.roles, ADMIN_ROLES);

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

  const templateCount = state.templates.length;
  const queuedCount = queue.items.filter((i) => i.status === 'QUEUED' || i.status === 'RETRYING')
    .length;
  const failedCount = queue.items.filter((i) => i.status === 'FAILED_TERMINAL').length;
  const sentCount = queue.items.filter((i) => i.status === 'SENT').length;

  return (
    <PageContainer viewport>
      <PageHeader
        actions={
          <Button as={Link} variant="secondary" to="/admin">
            Back to admin panel
          </Button>
        }
        eyebrow="Administration"
        subtitle="Review configured notification templates and send safe test messages without exposing channel secrets."
        title="Notification Templates"
      />

      <div className="kpi-strip" aria-label="Notification metrics">
        <Link
          className="kpi-strip__item"
          to="/admin/notifications"
          style={{ borderLeft: '3px solid var(--color-accent)' }}
        >
          <span className="kpi-strip__value">{templateCount}</span>
          <span className="kpi-strip__label">Templates</span>
          <span className="kpi-strip__context" style={{ color: 'var(--color-text-muted)' }}>
            configured
          </span>
        </Link>
        <Link
          className="kpi-strip__item"
          to="/admin/notifications"
          style={{
            borderLeft: `3px solid ${
              queuedCount > 0 ? 'var(--color-status-warning)' : 'var(--color-status-neutral)'
            }`,
          }}
        >
          <span className="kpi-strip__value">{queuedCount}</span>
          <span className="kpi-strip__label">Queued</span>
          <span className="kpi-strip__context" style={{ color: 'var(--color-text-muted)' }}>
            awaiting delivery
          </span>
        </Link>
        <Link
          className="kpi-strip__item"
          to="/admin/notifications"
          style={{
            borderLeft: `3px solid ${
              failedCount > 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)'
            }`,
          }}
        >
          <span className="kpi-strip__value">{failedCount}</span>
          <span className="kpi-strip__label">Failed</span>
          <span
            className="kpi-strip__context"
            style={{
              color:
                failedCount > 0
                  ? 'var(--color-status-danger)'
                  : 'var(--color-status-active)',
            }}
          >
            {failedCount > 0 ? 'requires requeue' : '✓ all clear'}
          </span>
        </Link>
        <Link
          className="kpi-strip__item"
          to="/admin/notifications"
          style={{ borderLeft: '3px solid var(--color-status-active)' }}
        >
          <span className="kpi-strip__value">{sentCount}</span>
          <span className="kpi-strip__label">Sent</span>
          <span className="kpi-strip__context" style={{ color: 'var(--color-text-muted)' }}>
            on this page
          </span>
        </Link>
      </div>

      {state.isLoading ? <LoadingState label="Loading notification templates..." variant="skeleton" skeletonType="table" /> : null}
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
              {/* W1-26 — only admin can send test notifications. Director is read-only. */}
              {canEdit ? (
                <SendTestPanel
                  error={state.error}
                  isSubmitting={state.isSubmitting}
                  onChange={handleChange}
                  onSubmit={handleSubmit}
                  result={state.result}
                  template={state.selectedTemplate}
                  values={values}
                />
              ) : null}
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

        {queue.isLoading ? <LoadingState label="Loading notification queue..." variant="skeleton" skeletonType="table" /> : null}
        {queue.error ? <ErrorState description={queue.error} /> : null}

        {!queue.isLoading && !queue.error ? (
          <>
            <div className="results-meta">
              <span>
                {queue.totalCount === 0
                  ? '0 requests'
                  : `${(queue.page - 1) * queue.pageSize + 1}–${Math.min(queue.page * queue.pageSize, queue.totalCount)} of ${queue.totalCount} requests`}
                {' '}&mdash; page {queue.page} of {totalPages}
              </span>
            </div>

            {queue.items.length === 0 ? (
              <EmptyState
                description="No notification requests match the selected status filter."
                title="No notifications"
              />
            ) : (
              <Table
                variant="compact"
                columns={[
                  { key: 'recipient', title: 'Recipient', getValue: (i) => i.recipient, render: (i) => i.recipient },
                  { key: 'event', title: 'Event', getValue: (i) => i.eventName, render: (i) => i.eventName },
                  { key: 'status', title: 'Status', getValue: (i) => i.status, render: (i) => (
                    <StatusBadge status={i.status} />
                  ) },
                  { key: 'attempts', title: 'Attempts', getValue: (i) => i.attemptCount, render: (i) => `${i.attemptCount} / ${i.maxAttempts}` },
                  { key: 'requestedAt', title: 'Requested At', getValue: (i) => i.requestedAt, render: (i) => formatDateTime(i.requestedAt) },
                  { key: 'payload', title: 'Payload', render: (i) => (
                    <>
                      <details>
                        <summary>Detail</summary>
                        {i.latestRenderedBody ? (
                          <>
                            <p><strong>Rendered body:</strong></p>
                            <pre className="code-block">{i.latestRenderedBody}</pre>
                          </>
                        ) : null}
                        <p><strong>Payload:</strong></p>
                        <pre className="code-block">{JSON.stringify(i.payload, null, 2)}</pre>
                      </details>
                      {i.failureReason ? <span className="error-text">{i.failureReason}</span> : null}
                    </>
                  ) },
                  { key: 'actions', title: 'Actions', render: (i) => (
                    // W1-26 — Requeue is admin-only. Director is read-only.
                    i.status === 'FAILED_TERMINAL' && canEdit ? (
                      <Button variant="secondary" size="sm" disabled={queue.isLoading} onClick={() => { void queue.handleRequeue(i.id); }} type="button">
                        Requeue
                      </Button>
                    ) : null
                  ) },
                ] as Column<NotificationQueueItem>[]}
                rows={queue.items}
                getRowKey={(i) => i.id}
              />
            )}

            {queue.items.length > 0 ? (
              <PaginationControls
                page={queue.page}
                pageSize={queue.pageSize}
                totalItems={queue.totalCount}
                onPageChange={queue.handlePageChange}
                onPageSizeChange={queue.handlePageSizeChange}
                itemLabel="requests"
              />
            ) : null}
          </>
        ) : null}
      </SectionCard>
    </PageContainer>
  );
}
