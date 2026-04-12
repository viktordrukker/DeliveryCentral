import { NotificationOutcome } from '@/lib/api/notifications';
import { EmptyState } from '@/components/common/EmptyState';

interface NotificationOutcomeListProps {
  items: NotificationOutcome[];
}

function normalizeStatus(status: NotificationOutcome['status']): string {
  return status.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export function NotificationOutcomeList({ items }: NotificationOutcomeListProps): JSX.Element {
  if (items.length === 0) {
    return (
      <EmptyState
        description="No recent notification outcomes were returned."
        title="No recent outcomes"
      />
    );
  }

  return (
    <div className="monitoring-list">
      {items.map((item) => (
        <div className="monitoring-list__item" key={`${item.notificationRequestId}-${item.attemptNumber}`}>
          <div className="monitoring-card__header">
            <div>
              <div className="monitoring-list__title">{item.templateDisplayName}</div>
              <p className="monitoring-list__summary">
                {item.eventName} · {item.channelKey} · {item.targetSummary}
              </p>
            </div>
            <span className={`status-indicator status-indicator--${normalizeStatus(item.status)}`}>
              {item.status}
            </span>
          </div>

          <dl className="details-list">
            <div>
              <dt>Attempted</dt>
              <dd>{new Date(item.attemptedAt).toLocaleString('en-US')}</dd>
            </div>
            <div>
              <dt>Attempt</dt>
              <dd>{item.attemptNumber}</dd>
            </div>
            <div>
              <dt>Template</dt>
              <dd>{item.templateKey}</dd>
            </div>
            <div>
              <dt>Request</dt>
              <dd>{item.notificationRequestId}</dd>
            </div>
            <div>
              <dt>Error Summary</dt>
              <dd>{item.errorSummary ?? 'No error recorded'}</dd>
            </div>
          </dl>
        </div>
      ))}
    </div>
  );
}
