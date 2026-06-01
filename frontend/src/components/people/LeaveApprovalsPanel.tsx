import { useCallback, useEffect, useState } from 'react';

import { Avatar } from '@/components/ds/Avatar';
import { Table, type Column } from '@/components/ds';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  LeaveDecisionDrawer,
  type LeaveDecisionTarget,
} from '@/components/time-management/LeaveDecisionDrawer';
import { fetchApprovalQueue, type ApprovalQueueItem } from '@/lib/api/time-management';

/**
 * Approvals Hub PR-3 — /people Leave-Approvals tab body.
 *
 * Lists pending leave requests for managers in the /people canvas. Clicking a
 * row opens the existing `<LeaveDecisionDrawer>` (the same surface used by
 * `/time-management`), so this is a parallel manager entry-point with no
 * duplicated decision UX.
 *
 * Deviation from the spec: the spec said `fetchLeaveRequests({ status: 'PENDING' })`,
 * but the raw `/leave-requests` endpoint only returns `personId` (no joined
 * `personName`). The unified `/time-management/queue` endpoint already
 * pre-joins person names and is the proven path used by `TimeManagementPage`
 * for the exact same drawer flow. Filtering to `type === 'leave'` client-side
 * gives us the same row set without an extra directory roundtrip.
 */
export function LeaveApprovalsPanel(): JSX.Element {
  const [items, setItems] = useState<ApprovalQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [drawerTarget, setDrawerTarget] = useState<ApprovalQueueItem | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void fetchApprovalQueue()
      .then((rows) => {
        if (!active) return;
        setItems(rows.filter((r) => r.type === 'leave'));
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load leave approvals.');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tick]);

  const refetch = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  const columns: Column<ApprovalQueueItem>[] = [
    {
      key: 'person',
      title: 'Person',
      getValue: (r) => r.personName,
      render: (r) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Avatar name={r.personName} size="xs" />
          <span>{r.personName}</span>
        </span>
      ),
    },
    {
      key: 'type',
      title: 'Type',
      getValue: (r) => r.leaveType ?? '',
      render: (r) => <span style={{ color: 'var(--color-text-muted)' }}>{r.leaveType ?? '—'}</span>,
    },
    {
      key: 'dates',
      title: 'Dates',
      getValue: (r) => r.leaveStartDate ?? '',
      render: (r) => formatRange(r.leaveStartDate, r.leaveEndDate),
    },
    {
      key: 'days',
      title: 'Days',
      align: 'right',
      getValue: (r) => r.leaveDays ?? null,
      render: (r) => (
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{r.leaveDays ?? '—'}</span>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      getValue: (r) => r.status,
      render: (r) => <StatusBadge tone="pending" label={r.status} variant="chip" />,
    },
  ];

  const target: LeaveDecisionTarget | null = drawerTarget
    ? {
        id: drawerTarget.id,
        personId: drawerTarget.personId,
        personName: drawerTarget.personName,
        leaveType: drawerTarget.leaveType,
        leaveStartDate: drawerTarget.leaveStartDate,
        leaveEndDate: drawerTarget.leaveEndDate,
        leaveDays: drawerTarget.leaveDays,
        notes: drawerTarget.notes,
        submittedAt: drawerTarget.submittedAt,
      }
    : null;

  return (
    <>
      <SectionCard title="Pending leave requests">
        {loading ? <LoadingState variant="skeleton" skeletonType="table" /> : null}
        {error ? <ErrorState description={error} onRetry={refetch} /> : null}
        {!loading && !error ? (
          items.length === 0 ? (
            <EmptyState
              title="No leave requests pending"
              description="Approved or rejected requests show up on the requester's /me?tab=leave."
              action={{ href: '/time-management', label: 'Open time management' }}
            />
          ) : (
            <Table
              variant="compact"
              columns={columns}
              rows={items}
              getRowKey={(r) => r.id}
              onRowClick={(r) => setDrawerTarget(r)}
            />
          )
        ) : null}
      </SectionCard>

      <LeaveDecisionDrawer
        open={drawerTarget !== null}
        target={target}
        onClose={() => setDrawerTarget(null)}
        onDecided={() => {
          setDrawerTarget(null);
          refetch();
        }}
      />
    </>
  );
}

function formatRange(start: string | undefined, end: string | undefined): string {
  if (!start || !end) return '—';
  const fmt = (iso: string): string => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  return `${fmt(start)} – ${fmt(end)}`;
}
