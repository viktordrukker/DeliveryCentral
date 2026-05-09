import { Link, useNavigate } from 'react-router-dom';

import { SectionCard } from '@/components/common/SectionCard';
import { Table, type Column } from '@/components/ds';
import type { ResourceManagerDashboardResponse } from '@/lib/api/dashboard-resource-manager';

const NUM = { fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const };

interface RmTeamCapacitySectionProps {
  rows: ResourceManagerDashboardResponse['teamCapacitySummary'];
}

export function RmTeamCapacitySection({
  rows,
}: RmTeamCapacitySectionProps): JSX.Element | null {
  const navigate = useNavigate();
  if (rows.length === 0) return null;
  return (
    <SectionCard
      title="Team Capacity by Org Unit"
      collapsible
      chartExport={{
        headers: ['Team', 'Members', 'Active Assignments', 'Active Projects', 'Overallocated', 'Unassigned'],
        rows: rows.map((t) => ({
          Team: t.teamName,
          Members: String(t.memberCount),
          'Active Assignments': String(t.activeAssignmentCount),
          'Active Projects': String(t.activeProjectCount),
          Overallocated: String(t.overallocatedPeopleCount),
          Unassigned: String(t.unassignedPeopleCount),
        })),
      }}
    >
      <Table
        variant="compact"
        columns={
          [
            {
              key: 'team',
              title: 'Team',
              getValue: (t) => t.teamName,
              render: (t) => <span style={{ fontWeight: 500 }}>{t.teamName}</span>,
            },
            {
              key: 'members',
              title: 'Members',
              align: 'right',
              getValue: (t) => t.memberCount,
              render: (t) => <span style={NUM}>{t.memberCount}</span>,
            },
            {
              key: 'assignments',
              title: 'Assignments',
              align: 'right',
              getValue: (t) => t.activeAssignmentCount,
              render: (t) => <span style={NUM}>{t.activeAssignmentCount}</span>,
            },
            {
              key: 'projects',
              title: 'Projects',
              align: 'right',
              getValue: (t) => t.activeProjectCount,
              render: (t) => <span style={NUM}>{t.activeProjectCount}</span>,
            },
            {
              key: 'overalloc',
              title: 'Overalloc',
              align: 'right',
              getValue: (t) => t.overallocatedPeopleCount,
              render: (t) => (
                <span
                  style={{
                    ...NUM,
                    color: t.overallocatedPeopleCount > 0 ? 'var(--color-status-danger)' : 'inherit',
                    fontWeight: t.overallocatedPeopleCount > 0 ? 600 : 400,
                  }}
                >
                  {t.overallocatedPeopleCount}
                </span>
              ),
            },
            {
              key: 'unassigned',
              title: 'Unassigned',
              align: 'right',
              getValue: (t) => t.unassignedPeopleCount,
              render: (t) => (
                <span
                  style={{
                    ...NUM,
                    color: t.unassignedPeopleCount > 0 ? 'var(--color-status-warning)' : 'inherit',
                  }}
                >
                  {t.unassignedPeopleCount}
                </span>
              ),
            },
            {
              key: 'view',
              title: '',
              width: 40,
              render: (t) => (
                <Link
                  to={`/teams/${t.teamId}`}
                  onClick={(e) => e.stopPropagation()}
                  style={{ fontSize: 10, color: 'var(--color-accent)' }}
                >
                  View
                </Link>
              ),
            },
          ] as Column<ResourceManagerDashboardResponse['teamCapacitySummary'][number]>[]
        }
        rows={rows}
        getRowKey={(t) => t.teamId}
        onRowClick={(t) => navigate(`/teams/${t.teamId}`)}
      />
    </SectionCard>
  );
}
