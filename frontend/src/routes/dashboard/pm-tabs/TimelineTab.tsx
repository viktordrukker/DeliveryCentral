import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/common/EmptyState';
import { SectionCard } from '@/components/common/SectionCard';
import { TipBalloon } from '@/components/common/TipBalloon';
import { ProjectTimelineGantt } from '@/components/charts/ProjectTimelineGantt';
import type {
  ManagedProjectDashboardItem,
  ProjectDashboardAttentionItem,
} from '@/lib/api/dashboard-project-manager';
import { Table, type Column } from '@/components/ds';

interface Props {
  managedProjects: ManagedProjectDashboardItem[];
  attentionProjects: ProjectDashboardAttentionItem[];
  onRowClick: (projectId: string) => void;
}

export function PmTimelineTab({ managedProjects, attentionProjects, onRowClick }: Props): JSX.Element {
  const ganttData = managedProjects.map((p) => ({
    endDate: p.plannedEndDate,
    name: p.name,
    startDate: p.plannedStartDate,
    status: p.status,
  }));

  return (
    <>
      <div className="dashboard-hero" style={{ position: 'relative' }}>
        <TipBalloon tip="Gantt chart showing project timelines. Hover for dates." arrow="left" />
        <div className="dashboard-hero__header">
          <div>
            <div className="dashboard-hero__title">Project Timeline</div>
            <div className="dashboard-hero__subtitle">Planned start and end dates for managed projects</div>
          </div>
        </div>
        <div className="dashboard-hero__chart">
          <ProjectTimelineGantt projects={ganttData} />
        </div>
      </div>

      <SectionCard title="Nearing Closure" collapsible>
        {attentionProjects.length === 0 ? (
          <EmptyState
            description="No active projects are approaching their planned end date within 30 days."
            title="No projects nearing closure"
          />
        ) : (
          <Table
            variant="compact"
            columns={[
              { key: 'code', title: 'Code', getValue: (i) => i.projectCode, render: (i) => <span style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-muted)' }}>{i.projectCode}</span> },
              { key: 'name', title: 'Project', getValue: (i) => i.projectName, render: (i) => <span style={{ fontWeight: 500 }}>{i.projectName}</span> },
              { key: 'reason', title: 'Reason', width: 140, getValue: (i) => i.reason, render: (i) => <span style={{ fontSize: 11 }}>{i.reason}</span> },
              { key: 'detail', title: 'Detail', width: 200, getValue: (i) => i.detail, render: (i) => <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{i.detail}</span> },
              { key: 'go', title: '', width: 40, render: (i) => <Link to={`/projects/${i.projectId}/dashboard`} onClick={(e) => e.stopPropagation()} style={{ fontSize: 10, color: 'var(--color-accent)' }}>Go</Link> },
            ] as Column<ProjectDashboardAttentionItem>[]}
            rows={attentionProjects}
            getRowKey={(i) => i.projectId}
            onRowClick={(i) => onRowClick(i.projectId)}
          />
        )}
      </SectionCard>
    </>
  );
}
