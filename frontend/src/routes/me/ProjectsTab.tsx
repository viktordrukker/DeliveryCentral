import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { fetchAssignments, type AssignmentDirectoryItem } from '@/lib/api/assignments';
import { formatDate } from '@/lib/format-date';

const NUM = { fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const };

/**
 * /me?tab=projects — My Memberships table.
 *
 * Columns: Project · Role · Allocation % · Start · End · Status.
 * Active first; "Show historical (n)" expander reveals ended assignments
 * below. Each row deep-links to /projects/:id (Law 4 — actions within
 * 200px of the row).
 *
 * Data: /assignments?personId=<me>. Active = no endDate, or endDate >= today.
 * Historical = endDate < today.
 */
export function ProjectsTab(): JSX.Element {
  const { principal } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<AssignmentDirectoryItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHistorical, setShowHistorical] = useState(false);

  useEffect(() => {
    if (!principal?.personId) return undefined;
    let active = true;
    setLoading(true);
    setError(null);
    fetchAssignments({ personId: principal.personId, pageSize: 200 })
      .then((res) => {
        if (active) setItems(res.items);
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
    const a: AssignmentDirectoryItem[] = [];
    const h: AssignmentDirectoryItem[] = [];
    for (const item of items ?? []) {
      const end = item.endDate ? new Date(item.endDate) : null;
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
  rows: AssignmentDirectoryItem[];
  muted?: boolean;
}

function MembershipsTable({ rows, muted }: MembershipsTableProps): JSX.Element {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        className="dash-compact-table"
        style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-body-sm, 13px)' }}
      >
        <thead>
          <tr>
            <Th>Project</Th>
            <Th>Role</Th>
            <Th align="right">Alloc</Th>
            <Th>Start</Th>
            <Th>End</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              data-href={`/projects/${r.project.id}`}
              style={{ opacity: muted ? 0.75 : 1, cursor: 'pointer' }}
              onClick={() => (window.location.href = `/projects/${r.project.id}`)}
            >
              <Td>
                <Link
                  to={`/projects/${r.project.id}`}
                  style={{ color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 500 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {r.project.displayName ?? 'Project'}
                </Link>
              </Td>
              <Td>{r.staffingRole}</Td>
              <Td style={NUM}>{r.allocationPercent}%</Td>
              <Td>{formatDate(r.startDate)}</Td>
              <Td>{r.endDate ? formatDate(r.endDate) : '—'}</Td>
              <Td>
                <StatusBadge status={r.approvalState} variant="chip" />
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' }): JSX.Element {
  return (
    <th
      style={{
        textAlign: align ?? 'left',
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        color: 'var(--color-text-subtle)',
        padding: '8px 10px',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface-alt)',
        fontWeight: 500,
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }): JSX.Element {
  return (
    <td
      style={{
        padding: '10px',
        borderBottom: '1px solid var(--color-border-subtle, var(--color-border))',
        color: 'var(--color-text)',
        ...style,
      }}
    >
      {children}
    </td>
  );
}
