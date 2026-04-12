import { useState } from 'react';

import { type BusinessAuditRecord } from '@/lib/api/business-audit';

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
  return new Date(occurredAt).toLocaleDateString('en-US');
}

function actionColor(actionType: string): string {
  const upper = actionType.toUpperCase();
  if (upper.includes('CREATE') || upper.includes('ADD')) return '#2563eb';
  if (upper.includes('DELETE') || upper.includes('REMOVE') || upper.includes('REVOKE') || upper.includes('TERMINATE')) return '#dc2626';
  if (upper.includes('UPDATE') || upper.includes('EDIT') || upper.includes('AMEND') || upper.includes('CHANGE')) return '#d97706';
  if (upper.includes('APPROVE')) return '#16a34a';
  if (upper.includes('REJECT')) return '#dc2626';
  return '#6b7280';
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
        <span style={{ color: '#fff', fontSize: '10px', fontWeight: 700 }}>
          {event.actionType.charAt(0).toUpperCase()}
        </span>
      </div>
      <div className="audit-timeline__content">
        <div className="audit-timeline__header">
          <span className="audit-timeline__action">{humanizeAction(event.actionType)}</span>
          <span className="audit-timeline__entity" style={{ color: '#6b7280', fontSize: '12px' }}>
            {event.targetEntityType}
            {event.targetEntityId ? ` · ${event.targetEntityId}` : ''}
          </span>
          {event.actorId ? (
            <span className="audit-timeline__actor" style={{ color: '#374151', fontSize: '12px' }}>
              by {event.actorId}
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
          <button
            className="audit-timeline__expand"
            onClick={() => setExpanded((v) => !v)}
            style={{
              background: 'none',
              border: 'none',
              color: '#2563eb',
              cursor: 'pointer',
              fontSize: '12px',
              padding: '4px 0',
            }}
            type="button"
          >
            {expanded ? 'Hide details' : 'Show details'}
          </button>
        ) : null}
        {expanded && hasDiff ? (
          <div className="audit-timeline__diff" style={{ marginTop: '8px', fontSize: '12px' }}>
            {diffKeys.size > 0 ? (
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '2px 8px', background: '#f3f4f6' }}>Key</th>
                    <th style={{ textAlign: 'left', padding: '2px 8px', background: '#f3f4f6' }}>Old</th>
                    <th style={{ textAlign: 'left', padding: '2px 8px', background: '#f3f4f6' }}>New</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(diffKeys).map((key) => (
                    <tr key={key}>
                      <td style={{ padding: '2px 8px', fontWeight: 600 }}>{key}</td>
                      <td style={{ padding: '2px 8px', color: '#dc2626' }}>
                        {event.oldValues?.[key] !== undefined
                          ? JSON.stringify(event.oldValues[key])
                          : '—'}
                      </td>
                      <td style={{ padding: '2px 8px', color: '#16a34a' }}>
                        {event.newValues?.[key] !== undefined
                          ? JSON.stringify(event.newValues[key])
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
            {event.metadata && Object.keys(event.metadata).length > 0 && diffKeys.size === 0 ? (
              <pre style={{ background: '#f9fafb', borderRadius: '4px', padding: '8px', overflow: 'auto' }}>
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
