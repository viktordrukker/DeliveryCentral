import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/common/EmptyState';
import { SectionCard } from '@/components/common/SectionCard';
import { TipBalloon } from '@/components/common/TipBalloon';
import { PriorityBadge } from '@/components/staffing/PriorityBadge';
import { formatChangeType } from '@/lib/labels';
import { formatDate } from '@/lib/format-date';
import { Table, type Column } from '@/components/ds';
import type {
  OpenStaffingRequestSummary,
  ProjectDashboardAttentionItem,
  RecentlyChangedAssignmentItem,
} from '@/lib/api/dashboard-project-manager';

const NUM = { fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const };

export interface OverallocatedPerson {
  id: string;
  displayName: string;
  totalPercent: number;
}

interface Props {
  overallocated: OverallocatedPerson[];
  projectsWithStaffingGaps: ProjectDashboardAttentionItem[];
  openRequests: OpenStaffingRequestSummary[];
  recentChanges: RecentlyChangedAssignmentItem[];
  onPersonClick: (personId: string) => void;
  onProjectClick: (projectId: string) => void;
  onRequestClick: (requestId: string) => void;
}

interface IssueRow {
  rowKey: string;
  kind: 'over' | 'gap';
  index: number;
  severityLabel: string;
  severityColor: string;
  category: string;
  entity: string;
  detail: string;
  linkTo: string;
  linkLabel: string;
  clickTarget: string;
}

export function PmStaffingTab({
  overallocated,
  projectsWithStaffingGaps,
  openRequests,
  recentChanges,
  onPersonClick,
  onProjectClick,
  onRequestClick,
}: Props): JSX.Element {
  const hasIssues = overallocated.length > 0 || projectsWithStaffingGaps.length > 0;

  const issueRows: IssueRow[] = [
    ...overallocated.map((p, i) => ({
      rowKey: `over-${p.id}`,
      kind: 'over' as const,
      index: i + 1,
      severityLabel: 'High',
      severityColor: 'var(--color-status-danger)',
      category: 'Overallocated',
      entity: p.displayName,
      detail: `${p.totalPercent}% total allocation`,
      linkTo: `/people/${p.id}`,
      linkLabel: 'View',
      clickTarget: p.id,
    })),
    ...projectsWithStaffingGaps.map((g, i) => ({
      rowKey: `gap-${g.projectId}-${g.reason}`,
      kind: 'gap' as const,
      index: overallocated.length + i + 1,
      severityLabel: 'Med',
      severityColor: 'var(--color-status-warning)',
      category: 'Staffing Gap',
      entity: g.projectName,
      detail: `${g.reason} · ${g.detail}`,
      linkTo: `/assignments/new?projectId=${g.projectId}`,
      linkLabel: 'Fill',
      clickTarget: g.projectId,
    })),
  ];

  const issueColumns: Column<IssueRow>[] = [
    { key: 'index', title: '#', width: 28, getValue: (r) => r.index, render: (r) => <span style={{ color: 'var(--color-text-subtle)', fontSize: 11 }}>{r.index}</span> },
    { key: 'severity', title: 'Severity', width: 70, getValue: (r) => r.severityLabel, render: (r) => (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: r.severityColor, flexShrink: 0 }} />
        <span style={{ color: r.severityColor, fontWeight: 600, fontSize: 11 }}>{r.severityLabel}</span>
      </span>
    ) },
    { key: 'category', title: 'Category', width: 100, getValue: (r) => r.category, render: (r) => r.category },
    { key: 'entity', title: 'Entity', getValue: (r) => r.entity, render: (r) => <span style={{ fontWeight: 500 }}>{r.entity}</span> },
    { key: 'detail', title: 'Detail', width: 160, getValue: (r) => r.detail, render: (r) => <span style={{ fontSize: 11 }}>{r.detail}</span> },
    { key: 'go', title: '', width: 40, render: (r) => (
      <Link to={r.linkTo} onClick={(e) => e.stopPropagation()} style={{ fontSize: 10, color: 'var(--color-accent)' }}>
        {r.linkLabel}
      </Link>
    ) },
  ];

  const requestColumns: Column<OpenStaffingRequestSummary>[] = [
    { key: 'role', title: 'Role', getValue: (r) => r.role, render: (r) => <span style={{ fontWeight: 500 }}>{r.role}</span> },
    { key: 'priority', title: 'Priority', width: 80, getValue: (r) => r.priority, render: (r) => <PriorityBadge priority={r.priority} /> },
    { key: 'start', title: 'Start', width: 90, getValue: (r) => r.startDate, render: (r) => <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>{r.startDate}</span> },
    { key: 'hc', title: 'Headcount', align: 'right', getValue: (r) => r.headcountFulfilled, render: (r) => <span style={NUM}>{r.headcountFulfilled}/{r.headcountRequired}</span> },
    { key: 'go', title: '', width: 40, render: (r) => (
      <Link to={`/staffing-requests/${r.id}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: 10, color: 'var(--color-accent)' }}>
        View
      </Link>
    ) },
  ];

  const changeColumns: Column<RecentlyChangedAssignmentItem>[] = [
    { key: 'project', title: 'Project', getValue: (i) => i.projectName, render: (i) => <span style={{ fontWeight: 500 }}>{i.projectName}</span> },
    { key: 'person', title: 'Person', getValue: (i) => i.personDisplayName, render: (i) => i.personDisplayName },
    { key: 'change', title: 'Change', width: 100, getValue: (i) => i.changeType, render: (i) => <span style={{ fontSize: 11 }}>{formatChangeType(i.changeType)}</span> },
    { key: 'date', title: 'Date', width: 90, getValue: (i) => i.changedAt, render: (i) => <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>{formatDate(i.changedAt)}</span> },
  ];

  return (
    <>
      {hasIssues && (
        <div className="dash-action-section" style={{ position: 'relative' }}>
          <TipBalloon tip="Staffing issues needing attention — overallocated people and projects with gaps." arrow="left" />
          <div className="dash-action-section__header">
            <span className="dash-action-section__title">
              Staffing Issues ({overallocated.length + projectsWithStaffingGaps.length})
            </span>
          </div>
          <Table
            variant="compact"
            columns={issueColumns}
            rows={issueRows}
            getRowKey={(r) => r.rowKey}
            onRowClick={(r) => (r.kind === 'over' ? onPersonClick(r.clickTarget) : onProjectClick(r.clickTarget))}
          />
        </div>
      )}

      {openRequests.length > 0 && (
        <SectionCard title={`Open Staffing Requests (${openRequests.length})`} collapsible>
          <Table
            variant="compact"
            columns={requestColumns}
            rows={openRequests}
            getRowKey={(r) => r.id}
            onRowClick={(r) => onRequestClick(r.id)}
          />
          <div style={{ marginTop: 8 }}>
            <Link style={{ fontSize: 11, color: 'var(--color-text-muted)' }} to="/staffing-requests">
              View all staffing requests
            </Link>
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="Recently Changed Assignments"
        collapsible
        chartExport={{
          headers: ['Project', 'Person', 'Change', 'Date'],
          rows: recentChanges.map((i) => ({
            Project: i.projectName,
            Person: i.personDisplayName,
            Change: i.changeType,
            Date: i.changedAt.slice(0, 10),
          })),
        }}
      >
        {recentChanges.length === 0 ? (
          <EmptyState
            description="No recent assignment changes were found for managed projects."
            title="No recent changes"
          />
        ) : (
          <Table
            variant="compact"
            columns={changeColumns}
            rows={recentChanges}
            getRowKey={(i) => i.assignmentId}
          />
        )}
      </SectionCard>
    </>
  );
}
