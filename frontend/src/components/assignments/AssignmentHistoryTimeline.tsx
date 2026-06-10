import type { ProjectPositionFillHistory } from '@/lib/api/project-positions';
import { formatDateTime } from '@/lib/format-date';

/**
 * W2-04 — position lifecycle timeline. Renders `ProjectPositionFillHistory[]`
 * rows from the lean `/project-positions/:id/history` endpoint. Lean rows
 * carry status transitions explicitly (`previousStatus` → `newStatus`).
 */
interface AssignmentHistoryTimelineProps {
  items: ProjectPositionFillHistory[];
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
    <div className="history-timeline" data-testid="assignment-history-timeline">
      {items.map((item) => (
        <article className="history-timeline__item" key={item.id}>
          <div className="history-timeline__header">
            <div>
              <div className="history-timeline__title">{formatChangeType(item.changeType)}</div>
              <div className="history-timeline__meta">
                {formatDateTime(item.occurredAt)}
                {item.changedByPersonId ? ` · ${item.changedByPersonId}` : ''}
              </div>
            </div>
          </div>

          {item.changeReason ? (
            <p className="history-timeline__reason">{item.changeReason}</p>
          ) : null}

          {renderTransition(item)}
        </article>
      ))}
    </div>
  );
}

function renderTransition(item: ProjectPositionFillHistory): JSX.Element | null {
  const rows: Array<[string, string]> = [];
  if (item.previousStatus || item.newStatus) {
    rows.push([
      'Status',
      `${item.previousStatus ?? '—'} → ${item.newStatus ?? '—'}`,
    ]);
  }
  if (item.previousPersonId || item.newPersonId) {
    rows.push([
      'Person',
      `${item.previousPersonId ?? '—'} → ${item.newPersonId ?? '—'}`,
    ]);
  }
  if (rows.length === 0) return null;
  return (
    <dl className="history-timeline__snapshot">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function formatChangeType(changeType: string): string {
  return changeType
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}
