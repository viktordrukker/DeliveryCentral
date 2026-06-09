import { Link, useNavigate } from 'react-router-dom';

import { SectionCard } from '@/components/common/SectionCard';
import { Avatar, Button, Pct, Table, type Column } from '@/components/ds';
import { formatDate } from '@/lib/format-date';
import type { ResourceManagerDashboardResponse } from '@/lib/api/dashboard-resource-manager';

const NUM = { fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const };

function indicatorColor(ind: string): string {
  if (ind === 'OVERALLOCATED') return 'var(--color-status-danger)';
  if (ind === 'UNDERALLOCATED') return 'var(--color-status-warning)';
  return 'var(--color-status-active)';
}

interface RmAllocationIndicatorsTableProps {
  rows: ResourceManagerDashboardResponse['allocationIndicators'];
}

export function RmAllocationIndicatorsTable({
  rows,
}: RmAllocationIndicatorsTableProps): JSX.Element | null {
  const navigate = useNavigate();
  if (rows.length === 0) return null;
  return (
    <SectionCard
      title="All Allocation Indicators"
      collapsible
      chartExport={{
        headers: ['Person', 'Team', 'Indicator', 'Allocation %'],
        rows: rows.map((i) => ({
          Person: i.displayName,
          Team: i.teamName,
          Indicator: i.indicator,
          'Allocation %': String(i.totalAllocationPercent),
        })),
      }}
    >
      <Table
        variant="compact"
        columns={
          [
            {
              key: 'person',
              title: 'Person',
              getValue: (i) => i.displayName,
              render: (i) => (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                  <Avatar name={i.displayName} size="xs" />
                  <span>{i.displayName}</span>
                </span>
              ),
            },
            {
              key: 'team',
              title: 'Team',
              getValue: (i) => i.teamName,
              render: (i) => (
                <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{i.teamName}</span>
              ),
            },
            {
              key: 'indicator',
              title: 'Indicator',
              width: 100,
              getValue: (i) => i.indicator,
              render: (i) => (
                <span style={{ color: indicatorColor(i.indicator), fontWeight: 600, fontSize: 11 }}>
                  {i.indicator}
                </span>
              ),
            },
            {
              key: 'alloc',
              title: 'Alloc %',
              align: 'right',
              getValue: (i) => i.totalAllocationPercent,
              render: (i) => (
                <span style={{ fontWeight: 600, color: indicatorColor(i.indicator) }}>
                  <Pct value={i.totalAllocationPercent} fractionDigits={0} />
                </span>
              ),
            },
            {
              key: 'bar',
              title: 'Bar',
              width: 80,
              render: (i) => (
                <div
                  style={{
                    background: 'var(--color-border)',
                    borderRadius: 2,
                    height: 6,
                    width: '100%',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(i.totalAllocationPercent, 100)}%`,
                      borderRadius: 2,
                      background: indicatorColor(i.indicator),
                    }}
                  />
                </div>
              ),
            },
            {
              key: 'view',
              title: '',
              width: 40,
              render: (i) => (
                <Link
                  to={`/people/${i.personId}`}
                  onClick={(e) => e.stopPropagation()}
                  style={{ fontSize: 10, color: 'var(--color-accent)' }}
                >
                  View
                </Link>
              ),
            },
          ] as Column<ResourceManagerDashboardResponse['allocationIndicators'][number]>[]
        }
        rows={rows}
        getRowKey={(i) => i.personId}
        onRowClick={(i) => navigate(`/people/${i.personId}`)}
      />
    </SectionCard>
  );
}

interface RmFuturePipelineTableProps {
  rows: ResourceManagerDashboardResponse['futureAssignmentPipeline'];
}

export function RmFuturePipelineTable({
  rows,
}: RmFuturePipelineTableProps): JSX.Element | null {
  const navigate = useNavigate();
  if (rows.length === 0) return null;
  return (
    <SectionCard
      title={`Future Pipeline (${rows.length})`}
      collapsible
      chartExport={{
        headers: ['Person', 'Project', 'Status', 'Start Date'],
        rows: rows.map((i) => ({
          Person: i.personDisplayName,
          Project: i.projectName,
          Status: i.approvalState,
          'Start Date': i.startDate.slice(0, 10),
        })),
      }}
    >
      <Table
        variant="compact"
        columns={
          [
            {
              key: 'person',
              title: 'Person',
              getValue: (i) => i.personDisplayName,
              render: (i) => <span style={{ fontWeight: 500 }}>{i.personDisplayName}</span>,
            },
            {
              key: 'project',
              title: 'Project',
              getValue: (i) => i.projectName,
              render: (i) => i.projectName,
            },
            {
              key: 'status',
              title: 'Status',
              width: 90,
              getValue: (i) => i.approvalState,
              render: (i) => (
                <span style={{ fontSize: 11, fontWeight: 600 }}>{i.approvalState}</span>
              ),
            },
            {
              key: 'startDate',
              title: 'Start Date',
              width: 90,
              getValue: (i) => i.startDate,
              render: (i) => (
                <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>
                  {formatDate(i.startDate)}
                </span>
              ),
            },
            {
              key: 'view',
              title: '',
              width: 40,
              render: (i) => (
                <Link
                  to={`/projects/${i.projectId}?position=${i.assignmentId}`}
                  onClick={(e) => e.stopPropagation()}
                  style={{ fontSize: 10, color: 'var(--color-accent)' }}
                >
                  View
                </Link>
              ),
            },
          ] as Column<ResourceManagerDashboardResponse['futureAssignmentPipeline'][number]>[]
        }
        rows={rows}
        getRowKey={(i) => i.assignmentId}
        onRowClick={(i) => navigate(`/projects/${i.projectId}?position=${i.assignmentId}`)}
      />
    </SectionCard>
  );
}

interface RmIdleResourcesTableProps {
  rows: ResourceManagerDashboardResponse['peopleWithoutAssignments'];
  onQuickAssign: (personId: string) => void;
}

export function RmIdleResourcesTable({
  rows,
  onQuickAssign,
}: RmIdleResourcesTableProps): JSX.Element | null {
  if (rows.length === 0) return null;
  return (
    <SectionCard title={`Idle Resources (${rows.length})`} collapsible>
      <Table
        variant="compact"
        columns={
          [
            {
              key: 'person',
              title: 'Person',
              getValue: (p) => p.displayName,
              render: (p) => (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                  <Avatar name={p.displayName} size="xs" />
                  <span>{p.displayName}</span>
                </span>
              ),
            },
            {
              key: 'team',
              title: 'Team',
              getValue: (p) => p.teamName,
              render: (p) => (
                <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{p.teamName}</span>
              ),
            },
            {
              key: 'alloc',
              title: 'Alloc %',
              align: 'right',
              getValue: (p) => p.totalAllocationPercent,
              render: (p) => <Pct value={p.totalAllocationPercent} fractionDigits={0} />,
            },
            {
              key: 'action',
              title: '',
              width: 100,
              render: (p) => (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickAssign(p.personId);
                  }}
                  style={{ fontSize: 10 }}
                >
                  Quick assign
                </Button>
              ),
            },
          ] as Column<ResourceManagerDashboardResponse['peopleWithoutAssignments'][number]>[]
        }
        rows={rows}
        getRowKey={(p) => p.personId}
      />
    </SectionCard>
  );
}
