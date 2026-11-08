import type { AssignmentHistoryItem } from '@/lib/api/assignments';
import type { ProjectPositionFillHistory } from '@/lib/api/project-positions';
import { formatDateTime } from '@/lib/format-date';

/**
 * W2-04 — unified lifecycle timeline. Renders either:
 *  - Legacy `AssignmentHistoryItem[]`
 *  - Lean `ProjectPositionFillHistory[]` (used by ProjectPositionDetailPage)
 *
 * The component reads only the union of fields present on both shapes, so it
 * is safe against future BE additions on either side. Lean rows carry status
 * transitions explicitly (`previousStatus` → `newStatus`); legacy rows carry
 * snapshots (`previousSnapshot` / `newSnapshot`). The render adapts.
 */
type TimelineItem = AssignmentHistoryItem | ProjectPositionFillHistory;

interface AssignmentHistoryTimelineProps {
  items: TimelineItem[];
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

function renderTransition(item: TimelineItem): JSX.Element | null {
  // Lean-shape path — explicit status / person transition fields.
  if (isLeanFillHistory(item)) {
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

  // Legacy snapshot path.
  if (!item.previousSnapshot && !item.newSnapshot) return null;
  return (
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
  );
}

function isLeanFillHistory(item: TimelineItem): item is ProjectPositionFillHistory {
  return 'positionId' in item;
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
