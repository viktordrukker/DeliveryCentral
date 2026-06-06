import { useEffect, useState } from 'react';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Table, type Column } from '@/components/ds';
import {
  type DmEscalation,
  type DmEscalationStatus,
  listMyDmEscalations,
} from '@/lib/api/dm-escalation';

interface DmEscalationsCardProps {
  /** Refresh token bumped by ancestor to force re-fetch. */
  refreshKey?: number;
}

function statusTone(status: DmEscalationStatus): 'active' | 'warning' | 'danger' | 'pending' | 'neutral' {
  switch (status) {
    case 'PENDING': return 'pending';
    case 'CONFIRMED': return 'active';
    case 'OVERRIDDEN': return 'danger';
    case 'CANCELLED': return 'neutral';
  }
}

function sourceLabel(kind: DmEscalation['sourceKind']): string {
  switch (kind) {
    case 'timesheet': return 'Timesheet';
    case 'work-hour': return 'Work hour';
    case 'milestone': return 'Milestone';
    case 'leave': return 'Leave';
  }
}

/**
 * LEAN-P4-missing-9 — DM-side "Pending escalations I created" SectionCard.
 *
 * When a Delivery Manager rejects a downstream artefact, that rejection
 * lives here in PENDING state until a Director either confirms (sticks)
 * or overrides (DM must re-approve upstream).
 */
export function DmEscalationsCard({ refreshKey }: DmEscalationsCardProps): JSX.Element {
  const [rows, setRows] = useState<DmEscalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    listMyDmEscalations()
      .then((items) => { if (active) setRows(items); })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load escalations.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refreshKey]);

  if (error) return <ErrorState description={error} />;

  return (
    <SectionCard title="My escalations to Director" collapsible>
      {loading ? (
        <div data-testid="dm-escalations-loading" style={{ color: 'var(--color-text-muted)', padding: 'var(--space-3)' }}>
          Loading...
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No escalations open"
          description="When you reject a timesheet, work-hour or milestone, your rejection escalates here for Director confirmation."
        />
      ) : (
        <Table
          testId="dm-escalations-mine-table"
          variant="compact"
          columns={[
            {
              key: 'sourceKind',
              title: 'Type',
              width: 90,
              render: (r) => <span style={{ fontSize: 11 }}>{sourceLabel(r.sourceKind)}</span>,
            },
            {
              key: 'reason',
              title: 'Reason',
              render: (r) => <span>{r.reason}</span>,
            },
            {
              key: 'status',
              title: 'Status',
              width: 110,
              render: (r) => <StatusBadge label={r.status} tone={statusTone(r.status)} variant="chip" />,
            },
            {
              key: 'resolvedBy',
              title: 'Resolved by',
              width: 150,
              render: (r) =>
                r.resolvedByDisplayName ? (
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{r.resolvedByDisplayName}</span>
                ) : (
                  <span style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>—</span>
                ),
            },
            {
              key: 'created',
              title: 'Created',
              width: 120,
              render: (r) => (
                <span style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-muted)' }}>
                  {new Date(r.createdAt).toLocaleDateString()}
                </span>
              ),
            },
          ] as Column<DmEscalation>[]}
          rows={rows}
          getRowKey={(r) => r.id}
        />
      )}
    </SectionCard>
  );
}
