import { useState } from 'react';

import { type BusinessAuditRecord } from '@/lib/api/business-audit';
import { formatDate } from '@/lib/format-date';
import { Button, Table, type Column } from '@/components/ds';

interface AuditTimelineProps {
  events: BusinessAuditRecord[];
}

function humanizeAction(actionType: string): string {
  return actionType
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function relativeTime(occurredAt: string): string {
  const diff = Date.now() - new Date(occurredAt).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(occurredAt);
}

function actionColor(actionType: string): string {
  const upper = actionType.toUpperCase();
  if (upper.includes('CREATE') || upper.includes('ADD')) return 'var(--color-accent)';
  if (upper.includes('DELETE') || upper.includes('REMOVE') || upper.includes('REVOKE') || upper.includes('TERMINATE')) return 'var(--color-status-danger)';
  if (upper.includes('UPDATE') || upper.includes('EDIT') || upper.includes('AMEND') || upper.includes('CHANGE')) return 'var(--color-status-warning)';
  if (upper.includes('APPROVE')) return 'var(--color-status-active)';
  if (upper.includes('REJECT')) return 'var(--color-status-danger)';
  return 'var(--color-text-muted)';
}

interface EventCardProps {
  event: BusinessAuditRecord;
}

function EventCard({ event }: EventCardProps): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const color = actionColor(event.actionType);
  const hasDiff =
    (event.oldValues && Object.keys(event.oldValues).length > 0) ||
    (event.newValues && Object.keys(event.newValues).length > 0) ||
    (event.metadata && Object.keys(event.metadata).length > 0);

  const diffKeys = new Set([
    ...Object.keys(event.oldValues ?? {}),
    ...Object.keys(event.newValues ?? {}),
  ]);

  return (
    <div className="audit-timeline__event" data-testid="audit-timeline-event">
      <div className="audit-timeline__icon" style={{ backgroundColor: color }}>
        <span style={{ color: 'var(--color-surface)', fontSize: '10px', fontWeight: 700 }}>
          {event.actionType.charAt(0).toUpperCase()}
        </span>
      </div>
      <div className="audit-timeline__content">
        <div className="audit-timeline__header">
          <span className="audit-timeline__action">{humanizeAction(event.actionType)}</span>
          <span className="audit-timeline__entity" style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>
            {event.targetEntityType}
            {event.targetEntityId ? ` · ${event.targetEntityId}` : ''}
          </span>
          {event.actorId ? (
            <span className="audit-timeline__actor" style={{ color: 'var(--color-text)', fontSize: '12px' }}>
              by {event.actorDisplayName ?? event.actorId}
            </span>
          ) : null}
          <span className="audit-timeline__time" style={{ color: '#9ca3af', fontSize: '11px', marginLeft: 'auto' }}>
            {relativeTime(event.occurredAt)}
          </span>
        </div>
        {event.changeSummary ? (
          <div className="audit-timeline__summary" style={{ fontSize: '13px', color: '#374151', marginTop: '4px' }}>
            {event.changeSummary}
          </div>
        ) : null}
        {hasDiff ? (
          <Button
            variant="link"
            size="sm"
            onClick={() => setExpanded((v) => !v)}
            type="button"
          >
            {expanded ? 'Hide details' : 'Show details'}
          </Button>
        ) : null}
        {expanded && hasDiff ? (
          <div className="audit-timeline__diff" style={{ marginTop: '8px', fontSize: '12px' }}>
            {diffKeys.size > 0 ? (
              <Table
                variant="compact"
                columns={[
                  { key: 'key', title: 'Key', getValue: (k) => k, render: (k) => <span style={{ fontWeight: 600 }}>{k}</span> },
                  { key: 'old', title: 'Old', getValue: (k) => event.oldValues?.[k] !== undefined ? JSON.stringify(event.oldValues[k]) : '', render: (k) => (
                    <span style={{ color: 'var(--color-status-danger)' }}>
                      {event.oldValues?.[k] !== undefined ? JSON.stringify(event.oldValues[k]) : '—'}
                    </span>
                  ) },
                  { key: 'new', title: 'New', getValue: (k) => event.newValues?.[k] !== undefined ? JSON.stringify(event.newValues[k]) : '', render: (k) => (
                    <span style={{ color: 'var(--color-status-active)' }}>
                      {event.newValues?.[k] !== undefined ? JSON.stringify(event.newValues[k]) : '—'}
                    </span>
                  ) },
                ] as Column<string>[]}
                rows={Array.from(diffKeys)}
                getRowKey={(k) => k}
              />
            ) : null}
            {event.metadata && Object.keys(event.metadata).length > 0 && diffKeys.size === 0 ? (
              <pre style={{ background: 'var(--color-surface-alt)', borderRadius: '4px', padding: '8px', overflow: 'auto' }}>
                {JSON.stringify(event.metadata, null, 2)}
              </pre>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function AuditTimeline({ events }: AuditTimelineProps): JSX.Element {
  if (events.length === 0) {
    return (
      <div className="audit-timeline audit-timeline--empty" data-testid="audit-timeline-empty">
        <p style={{ color: '#6b7280', fontSize: '14px' }}>No audit events recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="audit-timeline" data-testid="audit-timeline">
      {events.map((event, index) => (
        <EventCard
          event={event}
          key={`${event.occurredAt}-${event.actionType}-${index}`}
        />
      ))}
    </div>
  );
}
