import { useEffect, useState } from 'react';

import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { StatusBadge, type StatusTone } from '@/components/common/StatusBadge';
import { fetchEmployeeActivity, type EmployeeActivityEvent } from '@/lib/api/employee-activity';
import { formatDateShort } from '@/lib/format-date';

const EVENT_CONFIG: Record<string, { icon: string; label: string; tone: StatusTone }> = {
  ASSIGNED: { icon: '\u2795', label: 'Assigned', tone: 'active' },
  DEACTIVATED: { icon: '\u26D4', label: 'Deactivated', tone: 'danger' },
  HIRED: { icon: '\u2705', label: 'Hired', tone: 'active' },
  ORG_UNIT_CHANGED: { icon: '\u{1F3E2}', label: 'Org Changed', tone: 'info' },
  REACTIVATED: { icon: '\u{1F504}', label: 'Reactivated', tone: 'active' },
  ROLE_CHANGED: { icon: '\u{1F504}', label: 'Role Changed', tone: 'info' },
  TERMINATED: { icon: '\u274C', label: 'Terminated', tone: 'danger' },
  UNASSIGNED: { icon: '\u2796', label: 'Unassigned', tone: 'warning' },
  ASSIGNMENT_APPROVED: { icon: '\u2714', label: 'Approved', tone: 'active' },
  ASSIGNMENT_ENDED: { icon: '\u23F9', label: 'Ended', tone: 'neutral' },
};

interface PersonActivityFeedProps {
  limit?: number;
  personId: string;
}

export function PersonActivityFeed({ limit = 20, personId }: PersonActivityFeedProps): JSX.Element {
  const [events, setEvents] = useState<EmployeeActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void fetchEmployeeActivity(personId, limit)
      .then((data) => { if (active) setEvents(data); })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : 'Failed to load activity.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [personId, limit]);

  if (loading) return <LoadingState label="Loading activity feed..." />;
  if (error) return <div style={{ color: 'var(--color-status-danger)', fontSize: 12 }}>{error}</div>;
  if (events.length === 0) return <EmptyState description="No lifecycle events recorded yet." title="No activity" />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {events.map((event, i) => {
        const config = EVENT_CONFIG[event.eventType] ?? { icon: '\u2022', label: event.eventType, tone: 'neutral' as StatusTone };
        const isLast = i === events.length - 1;
        return (
          <div key={event.id} style={{ display: 'flex', gap: 'var(--space-3)', minHeight: 44 }}>
            {/* Timeline line + dot */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: `var(--color-status-${config.tone})`, flexShrink: 0, marginTop: 4 }} />
              {!isLast && <div style={{ width: 2, flex: 1, background: 'var(--color-border)', marginTop: 2 }} />}
            </div>
            {/* Content */}
            <div style={{ flex: 1, paddingBottom: 'var(--space-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 2 }}>
                <StatusBadge label={config.label} size="small" tone={config.tone} />
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatDateShort(event.occurredAt)}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text)', lineHeight: 1.4 }}>
                {event.summary}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
