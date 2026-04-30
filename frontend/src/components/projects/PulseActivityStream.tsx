import { useState } from 'react';

import type { PulseActivityItem } from '@/lib/api/project-pulse';
import { formatDate } from '@/lib/format-date';
import { Button } from '@/components/ds';

interface PulseActivityStreamProps {
  activity: PulseActivityItem[];
}

type Filter = 'all' | 'assignments' | 'risks' | 'cr' | 'milestones' | 'override';

const FILTERS: Array<{ key: Filter; label: string; types: string[] | null }> = [
  { key: 'all', label: 'All', types: null },
  { key: 'assignments', label: 'Assignments', types: ['ProjectAssignment'] },
  { key: 'risks', label: 'Risks', types: ['ProjectRisk'] },
  { key: 'cr', label: 'Change req.', types: ['ProjectChangeRequest'] },
  { key: 'milestones', label: 'Milestones', types: ['ProjectMilestone'] },
  { key: 'override', label: 'Overrides', types: ['ProjectRadiatorOverride', 'ProjectRagSnapshot'] },
];

function iconFor(aggregateType: string): string {
  if (aggregateType === 'ProjectAssignment') return '👥';
  if (aggregateType === 'ProjectRisk') return '⚠';
  if (aggregateType === 'ProjectChangeRequest') return '✎';
  if (aggregateType === 'ProjectMilestone') return '◆';
  if (aggregateType === 'ProjectRadiatorOverride') return '⟲';
  if (aggregateType === 'ProjectRagSnapshot') return '◉';
  return '•';
}

function relativeTime(iso: string): string {
  const now = new Date();
  const then = new Date(iso);
  const ms = now.getTime() - then.getTime();
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) {
    const mins = Math.max(1, Math.floor(ms / 60_000));
    return `${mins}m ago`;
  }
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function PulseActivityStream({ activity }: PulseActivityStreamProps): JSX.Element {
  const [filter, setFilter] = useState<Filter>('all');
  const active = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
  const filtered = active.types === null
    ? activity
    : activity.filter((a) => active.types!.includes(a.aggregateType));

  return (
    <div data-testid="pulse-activity-stream">
      <div
        role="toolbar"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          marginBottom: 8,
        }}
      >
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            variant={filter === f.key ? 'primary' : 'secondary'}
            size="sm"
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: 12, margin: '8px 0' }}>
          No activity in the last 7 days.
        </p>
      ) : (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            maxHeight: 320,
            overflowY: 'auto',
          }}
        >
          {filtered.map((a) => (
            <li
              key={a.id}
              style={{
                alignItems: 'baseline',
                borderBottom: '1px solid var(--color-border)',
                display: 'grid',
                fontSize: 12,
                gap: 8,
                gridTemplateColumns: '18px 1fr auto',
                padding: '6px 0',
              }}
            >
              <span aria-hidden="true">{iconFor(a.aggregateType)}</span>
              <span>
                <strong>{a.summary}</strong>
                {a.actorDisplayName ? (
                  <span style={{ color: 'var(--color-text-muted)' }}> · {a.actorDisplayName}</span>
                ) : null}
              </span>
              <span
                style={{ color: 'var(--color-text-subtle)', fontSize: 11 }}
                title={formatDate(a.occurredAt)}
              >
                {relativeTime(a.occurredAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
