import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Pct, Table, type Column } from '@/components/ds';
import { listProjectPositions, type ProjectPosition } from '@/lib/api/project-positions';
import { formatDate } from '@/lib/format-date';

/**
 * /me?tab=projects — My Memberships table.
 *
 * Columns: Project · Role · Allocation % · Start · End · Status.
 * Active first; "Show historical (n)" expander reveals ended assignments
 * below. Each row deep-links to /projects/:id (Law 4 — actions within
 * 200px of the row).
 *
 * Data: /project-positions?activePersonId=<me>. Active = no endDate, or endDate >= today.
 * Historical = endDate < today.
 */
export function ProjectsTab(): JSX.Element {
  const { principal } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<ProjectPosition[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHistorical] = useState(false);

  useEffect(() => {
    if (!principal?.personId) return undefined;
    let active = true;
    setLoading(true);
    setError(null);
    listProjectPositions({ activePersonId: principal.personId, take: 200 })
      .then((res) => {
        if (active) setItems(res.positions);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load memberships');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [principal?.personId]);

  const { activeRows, historicalRows } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const a: ProjectPosition[] = [];
    const h: ProjectPosition[] = [];
    for (const item of items ?? []) {
      const endStr = item.activeValidTo ?? item.endDate ?? null;
      const end = endStr ? new Date(endStr) : null;
      if (!end || end >= today) a.push(item);
      else h.push(item);
    }
    return { activeRows: a, historicalRows: h };
  }, [items]);

  if (loading) return <LoadingState variant="skeleton" skeletonType="page" />;
  if (error) return <ErrorState title="Couldn't load memberships" description={error} />;

  if (activeRows.length === 0 && historicalRows.length === 0) {
    return (
      <SectionCard title="My memberships">
        <EmptyState
          title="No assignments yet"
          description="You're not currently staffed on any project. Talk to your resource manager about upcoming work."
          actions={[
            { label: 'View open projects', onClick: () => navigate('/projects'), variant: 'primary' },
          ]}
        />
      </SectionCard>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <SectionCard title={`Active assignments (${activeRows.length})`}>
        {activeRows.length === 0 ? (
          <EmptyState
            title="No active assignments"
            description="Past assignments are listed below."
          />
        ) : (
          <MembershipsTable rows={activeRows} />
        )}
      </SectionCard>

      {historicalRows.length > 0 && (
        <SectionCard title={`Historical (${historicalRows.length})`} collapsible defaultCollapsed={!showHistorical}>
          <MembershipsTable rows={historicalRows} muted />
        </SectionCard>
      )}
    </div>
  );
}

interface MembershipsTableProps {
  rows: ProjectPosition[];
  muted?: boolean;
}

function MembershipsTable({ rows, muted }: MembershipsTableProps): JSX.Element {
  const columns: Column<ProjectPosition>[] = [
    {
      key: 'project',
      title: 'Project',
      getValue: (r) => r.projectName ?? r.projectCode ?? r.projectId,
      render: (r) => (
        <Link
          to={`/projects/${r.projectId}`}
          style={{ color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 500 }}
        >
          {r.projectName ?? r.projectCode ?? r.projectId}
        </Link>
      ),
    },
    {
      key: 'role',
      title: 'Role',
      getValue: (r) => r.role,
      render: (r) => r.role,
    },
    {
      key: 'alloc',
      title: 'Alloc',
      align: 'right',
      getValue: (r) => r.activeAllocationPercent ?? r.requiredAllocationPercent,
      render: (r) => <Pct value={r.activeAllocationPercent ?? r.requiredAllocationPercent} fractionDigits={0} />,
    },
    {
      key: 'start',
      title: 'Start',
      getValue: (r) => r.activeValidFrom ?? r.startDate ?? '',
      render: (r) => {
        const v = r.activeValidFrom ?? r.startDate;
        return v ? formatDate(v) : '—';
      },
    },
    {
      key: 'end',
      title: 'End',
      getValue: (r) => r.activeValidTo ?? r.endDate ?? '',
      render: (r) => {
        const v = r.activeValidTo ?? r.endDate;
        return v ? formatDate(v) : '—';
      },
    },
    {
      key: 'status',
      title: 'Status',
      getValue: (r) => r.fillStatus,
      render: (r) => <StatusBadge status={r.fillStatus} variant="chip" />,
    },
  ];
  return (
    <div style={{ overflowX: 'auto', opacity: muted ? 0.75 : 1 }}>
      <Table variant="compact" columns={columns} rows={rows} getRowKey={(r) => r.id} />
    </div>
  );
}
