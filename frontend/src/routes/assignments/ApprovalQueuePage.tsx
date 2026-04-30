import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { useTitleBarActions } from '@/app/title-bar-context';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button, Table, type Column } from '@/components/ds';
import { useApprovalQueue, type ApprovalQueueScope } from '@/features/assignments/useApprovalQueue';
import { ASSIGNMENT_STATUS_LABELS } from '@/lib/labels';
import { type AssignmentDirectoryItem } from '@/lib/api/assignments';

const SCOPE_OPTIONS: { value: ApprovalQueueScope; label: string }[] = [
  { value: 'mine', label: 'Mine' },
  { value: 'team', label: "Team's" },
  { value: 'breached', label: 'Breached' },
  { value: 'all', label: 'All' },
];

const NUM = { fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const };

function formatDue(now: Date, dueAt: string | null | undefined): string {
  if (!dueAt) return '—';
  const due = new Date(dueAt);
  const ms = due.getTime() - now.getTime();
  const days = ms / (1000 * 60 * 60 * 24);
  if (ms < 0) {
    const overdueDays = Math.abs(days);
    if (overdueDays < 1) return 'Breached';
    return `${overdueDays.toFixed(0)}d over`;
  }
  if (days < 1) return 'Today';
  return `${days.toFixed(0)}d`;
}

function rowTone(item: AssignmentDirectoryItem): 'danger' | 'warning' | undefined {
  if (item.slaBreachedAt) return 'danger';
  if (item.slaDueAt) {
    const dueIn = new Date(item.slaDueAt).getTime() - Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    if (dueIn < oneDay) return 'warning';
  }
  return undefined;
}

export function ApprovalQueuePage(): JSX.Element {
  const navigate = useNavigate();
  const { principal, isLoading: authLoading } = useAuth();
  const [scope, setScope] = useState<ApprovalQueueScope>('all');
  const { setActions } = useTitleBarActions();

  const { items, totalCount, isLoading, error, refresh } = useApprovalQueue({
    ownerPersonId: principal?.personId,
    actorRoles: principal?.roles,
    scope,
  });

  useEffect(() => {
    setActions(
      <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
        {SCOPE_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={scope === opt.value ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setScope(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
        <Button variant="ghost" size="sm" onClick={refresh}>
          Refresh
        </Button>
      </div>,
    );
    return () => setActions(null);
  }, [scope, refresh, setActions]);

  const now = useMemo(() => new Date(), [items]);

  const columns: Column<AssignmentDirectoryItem>[] = useMemo(
    () => [
      { key: 'project', title: 'Project', render: (row) => row.project.displayName },
      { key: 'person', title: 'Person', render: (row) => row.person.displayName },
      { key: 'role', title: 'Role', render: (row) => row.staffingRole },
      {
        key: 'status',
        title: 'Status',
        width: 160,
        render: (row) => {
          const awaitingDirector =
            row.approvalState === 'BOOKED' && row.requiresDirectorApproval === true;
          const tone =
            row.approvalState === 'IN_REVIEW' ? 'warning'
            : row.approvalState === 'PROPOSED' ? 'info'
            : awaitingDirector ? 'warning'
            : 'neutral';
          const label = awaitingDirector
            ? 'Awaiting Director'
            : (ASSIGNMENT_STATUS_LABELS[row.approvalState] ?? row.approvalState);
          return <StatusBadge tone={tone} variant="chip" label={label} />;
        },
      },
      { key: 'slaStage', title: 'SLA stage', width: 110, render: (row) => row.slaStage ?? '—' },
      {
        key: 'slaDueAt',
        title: 'Due in',
        width: 100,
        cellStyle: NUM,
        render: (row) => {
          const tone = rowTone(row);
          const color =
            tone === 'danger' ? 'var(--color-status-danger)'
            : tone === 'warning' ? 'var(--color-status-warning)'
            : 'var(--color-text)';
          return <span style={{ color }}>{formatDue(now, row.slaDueAt)}</span>;
        },
      },
      {
        key: 'allocation',
        title: 'Allocation',
        width: 100,
        cellStyle: NUM,
        render: (row) => `${row.allocationPercent}%`,
      },
      {
        key: 'open',
        title: '',
        width: 70,
        render: (row) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/assignments/${row.id}`);
            }}
          >
            Open
          </Button>
        ),
      },
    ],
    [navigate, now],
  );

  return (
    <PageContainer testId="approval-queue-page">
      <header style={{ marginBottom: 'var(--space-3)' }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>Approval queue</h1>
        <p style={{ margin: 'var(--space-1) 0 0', color: 'var(--color-text-muted)', fontSize: 13 }}>
          {totalCount} assignment{totalCount === 1 ? '' : 's'} awaiting review.
        </p>
      </header>
      {authLoading || isLoading ? (
        <LoadingState variant="skeleton" skeletonType="page" />
      ) : error ? (
        <ErrorState description={error} onRetry={refresh} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Nothing waiting on you"
          description="When a Resource Manager submits a proposal slate, it lands here."
          action={{ label: 'Go to dashboard', href: '/dashboard' }}
        />
      ) : (
        <Table<AssignmentDirectoryItem>
          variant="compact"
          columns={columns}
          rows={items}
          getRowKey={(row) => row.id}
          rowStyle={(row) => {
            const tone = rowTone(row);
            if (tone === 'danger') return { background: 'rgba(239, 68, 68, 0.06)' };
            if (tone === 'warning') return { background: 'rgba(245, 158, 11, 0.06)' };
            return undefined;
          }}
          onRowClick={(row) => navigate(`/assignments/${row.id}`)}
        />
      )}
    </PageContainer>
  );
}

export default ApprovalQueuePage;
