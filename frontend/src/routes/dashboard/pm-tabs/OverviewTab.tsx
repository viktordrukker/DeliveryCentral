import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/common/EmptyState';
import { SectionCard } from '@/components/common/SectionCard';
import { TipBalloon } from '@/components/common/TipBalloon';
import { ProjectStaffingCoverageChart } from '@/components/charts/ProjectStaffingCoverageChart';
import type { ManagedProjectDashboardItem } from '@/lib/api/dashboard-project-manager';
import { Table, type Column } from '@/components/ds';

const NUM = { fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const };

interface Props {
  managedProjects: ManagedProjectDashboardItem[];
  onRowClick: (projectId: string) => void;
}

export function PmOverviewTab({ managedProjects, onRowClick }: Props): JSX.Element {
  const coverageData = managedProjects.map((p) => ({
    allocated: p.staffingCount,
    name: p.name,
    projectId: p.id,
    required: Math.max(p.staffingCount, 1),
  }));

  return (
    <>
      {coverageData.length > 0 && (
        <div className="dashboard-hero" style={{ position: 'relative' }}>
          <TipBalloon tip="Staffing coverage across your projects. Bars show allocated vs required headcount." arrow="left" />
          <div className="dashboard-hero__header">
            <div>
              <div className="dashboard-hero__title">Staffing Coverage</div>
              <div className="dashboard-hero__subtitle">Allocated vs required headcount per project</div>
            </div>
          </div>
          <div className="dashboard-hero__chart">
            <ProjectStaffingCoverageChart data={coverageData} />
          </div>
        </div>
      )}
      <SectionCard
        title="Managed Projects"
        collapsible
        chartExport={{
          headers: ['Project', 'Code', 'Status', 'Staff'],
          rows: managedProjects.map((p) => ({
            Project: p.name,
            Code: p.projectCode,
            Status: p.status,
            Staff: String(p.staffingCount),
          })),
        }}
      >
        {managedProjects.length === 0 ? (
          <EmptyState
            description="This project manager does not currently own any projects."
            title="No managed projects"
            action={{ label: 'Create project', href: '/projects/new' }}
          />
        ) : (
          <Table
            variant="compact"
            columns={[
              { key: 'name', title: 'Project', getValue: (p) => p.name, render: (p) => <span style={{ fontWeight: 500 }}>{p.name}</span> },
              { key: 'code', title: 'Code', width: 80, getValue: (p) => p.projectCode, render: (p) => <span style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-muted)' }}>{p.projectCode}</span> },
              { key: 'status', title: 'Status', width: 70, getValue: (p) => p.status, render: (p) => <span style={{ fontSize: 11, fontWeight: 600 }}>{p.status}</span> },
              { key: 'staff', title: 'Staff', align: 'right', getValue: (p) => p.staffingCount, render: (p) => <span style={NUM}>{p.staffingCount}</span> },
              { key: 'go', title: '', width: 40, render: (p) => <Link to={`/projects/${p.id}/dashboard`} onClick={(e) => e.stopPropagation()} style={{ fontSize: 10, color: 'var(--color-accent)' }}>Go</Link> },
            ] as Column<ManagedProjectDashboardItem>[]}
            rows={managedProjects}
            getRowKey={(p) => p.id}
            onRowClick={(p) => onRowClick(p.id)}
          />
        )}
      </SectionCard>
    </>
  );
}
