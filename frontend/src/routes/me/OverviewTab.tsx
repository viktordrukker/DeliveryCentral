import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { SectionCard } from '@/components/common/SectionCard';
import { Timeline, type TimelineSegment } from '@/components/ds';
import {
  fetchEmployeeDashboard,
  type EmployeeDashboardResponse,
} from '@/lib/api/dashboard-employee';
import { fetchMyLeaveRequests, type LeaveRequestDto } from '@/lib/api/leaveRequests';

interface Loaded {
  dashboard: EmployeeDashboardResponse;
  leave: LeaveRequestDto[];
}

/**
 * /me?tab=overview — Workspace landing.
 *
 * KPI strip:
 *   - Hours this week (from EmployeeCurrentWorkloadSummary.totalAllocationPercent)
 *   - Pending leave (count of PENDING fetchMyLeaveRequests)
 *   - Open notifications (notificationsSummary.pendingCount)
 *   - Active projects (currentAssignments.length)
 *
 * Hero: lifecycle-coloured Timeline of current + future assignments.
 * Two cards: Upcoming approvals against me (pendingWorkflowItems) +
 * Recent activity (notificationsSummary).
 *
 * Real data — no mocks. The redesign of the underlying API is out of
 * scope for this PR; we read from the existing employee-dashboard +
 * leave-requests endpoints.
 */
export function OverviewTab(): JSX.Element {
  const { principal } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<Loaded | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!principal?.personId) return;
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([fetchEmployeeDashboard(principal.personId), fetchMyLeaveRequests()])
      .then(([dashboard, leave]) => {
        if (!active) return;
        setData({ dashboard, leave });
      })
      .catch((e: unknown) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'Failed to load workspace overview');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [principal?.personId]);

  const segments: TimelineSegment[] = useMemo(() => {
    if (!data) return [];
    const all = [...data.dashboard.currentAssignments, ...data.dashboard.futureAssignments];
    return all.map((a) => ({
      id: a.id,
      label: `${a.project.displayName ?? 'Project'} · ${a.staffingRole}`,
      startDate: a.startDate,
      endDate: a.endDate,
      status: a.approvalState ?? 'assigned',
      allocationPercent: a.allocationPercent,
      href: `/projects/${a.project.id}`,
    }));
  }, [data]);

  if (loading) {
    return <LoadingState variant="skeleton" skeletonType="page" />;
  }
  if (error) {
    return (
      <ErrorState
        title="Couldn't load workspace overview"
        description={error}
      />
    );
  }
  if (!data) {
    return <LoadingState variant="skeleton" skeletonType="page" />;
  }

  const pendingLeaveCount = data.leave.filter((r) => r.status === 'PENDING').length;
  const summary = data.dashboard.currentWorkloadSummary;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div className="kpi-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-3)' }}>
        <KpiCard
          to="/me?tab=time"
          tone={summary.isOverallocated ? 'warning' : 'active'}
          label="Total allocation"
          value={`${summary.totalAllocationPercent.toFixed(0)}%`}
          foot={summary.isOverallocated ? 'Overallocated' : 'On capacity'}
        />
        <KpiCard
          to="/me?tab=leave"
          tone={pendingLeaveCount > 0 ? 'warning' : 'active'}
          label="Pending leave"
          value={String(pendingLeaveCount)}
          foot={pendingLeaveCount > 0 ? 'Awaiting decision' : 'None pending'}
        />
        <KpiCard
          to="/me?tab=inbox"
          tone={data.dashboard.notificationsSummary.pendingCount > 0 ? 'info' : 'neutral'}
          label="Open notifications"
          value={String(data.dashboard.notificationsSummary.pendingCount)}
          foot={data.dashboard.notificationsSummary.note}
        />
        <KpiCard
          to="/me?tab=projects"
          tone="active"
          label="Active projects"
          value={String(summary.activeAssignmentCount)}
          foot={summary.futureAssignmentCount > 0 ? `${summary.futureAssignmentCount} starting later` : 'No future starts'}
        />
      </div>

      <SectionCard title="My assignments">
        <p style={{ margin: '0 0 var(--space-3)', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-compact)' }}>
          Lifecycle-coloured Timeline of current + future assignments. Click a bar to open the project.
        </p>
        {segments.length === 0 ? (
          <EmptyState
            title="No active assignments"
            description="When you're staffed onto a project, it will show here."
            actions={[{ label: 'Browse projects', onClick: () => navigate('/projects'), variant: 'secondary' }]}
          />
        ) : (
          <div style={{ height: 220, padding: 'var(--space-3) 0' }}>
            <Timeline
              segments={segments}
              colorMode="lifecycle"
              variant="stacked"
              size="md"
              showLegend
              showToday
              ariaLabel="Your current and future assignments"
              onSegmentClick={(seg) => seg.href && navigate(seg.href)}
            />
          </div>
        )}
      </SectionCard>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--space-4)' }}>
        <SectionCard title={`Approvals waiting on you (${data.dashboard.pendingWorkflowItems.itemCount})`}>
          {data.dashboard.pendingWorkflowItems.itemCount === 0 ? (
            <EmptyState title="Nothing to approve right now" />
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {data.dashboard.pendingWorkflowItems.items.slice(0, 5).map((it) => (
                <li
                  key={it.id}
                  style={{
                    padding: 'var(--space-2) var(--space-3)',
                    background: 'var(--color-surface-alt)',
                    borderRadius: 'var(--radius-control)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>{it.title}</div>
                  {it.detail && (
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{it.detail}</div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Recent activity">
          {data.dashboard.notificationsSummary.pendingCount === 0 ? (
            <EmptyState title="No unread notifications" />
          ) : (
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--font-size-body)' }}>
              {data.dashboard.notificationsSummary.note}
              <br />
              <Link to="/me?tab=inbox" style={{ color: 'var(--color-accent)', marginTop: 'var(--space-2)', display: 'inline-block' }}>
                Open inbox →
              </Link>
            </p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

interface KpiCardProps {
  to: string;
  tone: 'active' | 'warning' | 'danger' | 'info' | 'neutral';
  label: string;
  value: string;
  foot?: string;
}

function KpiCard({ to, tone, label, value, foot }: KpiCardProps): JSX.Element {
  const borderColor: string = (() => {
    switch (tone) {
      case 'active':
        return 'var(--color-status-active)';
      case 'warning':
        return 'var(--color-status-warning)';
      case 'danger':
        return 'var(--color-status-danger)';
      case 'info':
        return 'var(--color-status-info)';
      default:
        return 'var(--color-border-strong)';
    }
  })();
  return (
    <Link
      to={to}
      className="kpi-strip__item"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: 'var(--space-3) var(--space-4)',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-card)',
        border: '1px solid var(--color-border)',
        borderLeft: `3px solid ${borderColor}`,
        textDecoration: 'none',
        color: 'inherit',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <span style={{ fontSize: 11, color: 'var(--color-text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span
        style={{
          fontSize: 'var(--font-size-kpi)',
          fontWeight: 600,
          color: 'var(--color-text)',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.1,
        }}
      >
        {value}
      </span>
      {foot && (
        <span style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>
          {foot}
        </span>
      )}
    </Link>
  );
}
