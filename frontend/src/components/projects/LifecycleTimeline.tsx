import type { BusinessAuditRecord } from '@/lib/api/business-audit';
import { formatDate } from '@/lib/format-date';

interface LifecycleTimelineProps {
  events: BusinessAuditRecord[];
}

const LIFECYCLE_ACTIONS = new Set([
  'PROJECT_CREATED',
  'PROJECT_ACTIVATED',
  'PROJECT_CLOSED',
  'PROJECT_CLOSE_OVERRIDE',
  'PROJECT_UPDATED',
  'BUDGET_UPSERTED',
  'ASSIGNMENT_CREATED',
  'ASSIGNMENT_APPROVED',
  'TEAM_ASSIGNED',
]);

const EVENT_COLORS: Record<string, string> = {
  PROJECT_CREATED: 'var(--color-chart-1)',
  PROJECT_ACTIVATED: 'var(--color-status-active)',
  PROJECT_CLOSED: 'var(--color-text-muted)',
  PROJECT_CLOSE_OVERRIDE: 'var(--color-status-danger)',
  PROJECT_UPDATED: 'var(--color-chart-3)',
  BUDGET_UPSERTED: 'var(--color-chart-4)',
  ASSIGNMENT_CREATED: 'var(--color-chart-5)',
  ASSIGNMENT_APPROVED: 'var(--color-chart-2)',
  TEAM_ASSIGNED: 'var(--color-chart-6)',
};

const EVENT_LABELS: Record<string, string> = {
  PROJECT_CREATED: 'Created',
  PROJECT_ACTIVATED: 'Activated',
  PROJECT_CLOSED: 'Closed',
  PROJECT_CLOSE_OVERRIDE: 'Override Close',
  PROJECT_UPDATED: 'Updated',
  BUDGET_UPSERTED: 'Budget Set',
  ASSIGNMENT_CREATED: 'Assignment',
  ASSIGNMENT_APPROVED: 'Approved',
  TEAM_ASSIGNED: 'Team Staffed',
};

function humanizeAction(actionType: string): string {
  return EVENT_LABELS[actionType] ?? actionType.replace(/_/g, ' ').toLowerCase();
}

export function LifecycleTimeline({ events }: LifecycleTimelineProps): JSX.Element {
  const lifecycleEvents = events.filter((e) => LIFECYCLE_ACTIONS.has(e.actionType));

  if (lifecycleEvents.length === 0) {
    return <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>No lifecycle events recorded yet.</p>;
  }

  // Sort chronologically
  const sorted = [...lifecycleEvents].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  );

  return (
    <div data-testid="lifecycle-timeline">
      {/* Horizontal milestone timeline */}
      <div style={{ overflowX: 'auto', padding: 'var(--space-3) 0' }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          minWidth: Math.max(400, sorted.length * 120),
          position: 'relative',
        }}>
          {/* Connecting line */}
          <div style={{
            position: 'absolute',
            top: 16,
            left: 24,
            right: 24,
            height: 2,
            background: 'var(--color-border)',
            zIndex: 0,
          }} />

          {sorted.map((event, i) => {
            const color = EVENT_COLORS[event.actionType] ?? 'var(--color-border-strong)';
            return (
              <div
                key={`${event.actionType}-${event.occurredAt}-${i}`}
                style={{
                  flex: '1 1 0',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  position: 'relative',
                  zIndex: 1,
                  minWidth: 90,
                }}
              >
                {/* Dot */}
                <div style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: color,
                  border: '2px solid var(--color-surface)',
                  boxShadow: 'var(--shadow-card)',
                  marginBottom: 'var(--space-2)',
                }} />
                {/* Label */}
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text)', textAlign: 'center' }}>
                  {humanizeAction(event.actionType)}
                </div>
                {/* Date */}
                <div style={{ fontSize: 10, color: 'var(--color-text-subtle)', marginTop: 2, textAlign: 'center' }}>
                  {formatDate(event.occurredAt)}
                </div>
                {/* Actor */}
                {event.actorDisplayName ? (
                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 1, textAlign: 'center' }}>
                    {event.actorDisplayName}
                  </div>
                ) : null}
                {/* Summary */}
                {event.changeSummary ? (
                  <div style={{
                    fontSize: 10,
                    color: 'var(--color-text-muted)',
                    marginTop: 'var(--space-1)',
                    textAlign: 'center',
                    maxWidth: 110,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                    title={event.changeSummary}
                  >
                    {event.changeSummary}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
