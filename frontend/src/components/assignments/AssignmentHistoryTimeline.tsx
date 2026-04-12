import { AssignmentHistoryItem } from '@/lib/api/assignments';

interface AssignmentHistoryTimelineProps {
  items: AssignmentHistoryItem[];
}

export function AssignmentHistoryTimeline({
  items,
}: AssignmentHistoryTimelineProps): JSX.Element {
  if (items.length === 0) {
    return (
      <div className="feedback-state">
        <h3>No lifecycle history yet</h3>
        <p>This assignment has no recorded lifecycle events yet.</p>
      </div>
    );
  }

  return (
    <div className="history-timeline">
      {items.map((item) => (
        <article className="history-timeline__item" key={item.id}>
          <div className="history-timeline__header">
            <div>
              <div className="history-timeline__title">{formatChangeType(item.changeType)}</div>
              <div className="history-timeline__meta">
                {new Date(item.occurredAt).toLocaleString('en-US')}
                {item.changedByPersonId ? ` · ${item.changedByPersonId}` : ''}
              </div>
            </div>
          </div>

          {item.changeReason ? (
            <p className="history-timeline__reason">{item.changeReason}</p>
          ) : null}

          {(item.previousSnapshot || item.newSnapshot) ? (
            <dl className="history-timeline__snapshot">
              {item.previousSnapshot ? (
                <div>
                  <dt>Previous</dt>
                  <dd>{formatSnapshot(item.previousSnapshot)}</dd>
                </div>
              ) : null}
              {item.newSnapshot ? (
                <div>
                  <dt>New</dt>
                  <dd>{formatSnapshot(item.newSnapshot)}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function formatChangeType(changeType: string): string {
  return changeType
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function formatSnapshot(snapshot: Record<string, unknown>): string {
  return Object.entries(snapshot)
    .map(([key, value]) => `${key}: ${String(value ?? 'n/a')}`)
    .join(' · ');
}
