import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/common/EmptyState';
import { SectionCard } from '@/components/common/SectionCard';
import { TipBalloon } from '@/components/common/TipBalloon';
import { ProjectTimelineGantt } from '@/components/charts/ProjectTimelineGantt';
import type {
  ManagedProjectDashboardItem,
  ProjectDashboardAttentionItem,
} from '@/lib/api/dashboard-project-manager';

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
          <div style={{ overflow: 'auto' }}>
            <table className="dash-compact-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Project</th>
                  <th style={{ width: 140 }}>Reason</th>
                  <th style={{ width: 200 }}>Detail</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {attentionProjects.map((item) => (
                  <tr key={item.projectId} style={{ cursor: 'pointer' }} onClick={() => onRowClick(item.projectId)}>
                    <td style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-muted)' }}>{item.projectCode}</td>
                    <td style={{ fontWeight: 500 }}>{item.projectName}</td>
                    <td style={{ fontSize: 11 }}>{item.reason}</td>
                    <td style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{item.detail}</td>
                    <td>
                      <Link
                        to={`/projects/${item.projectId}/dashboard`}
                        onClick={(e) => e.stopPropagation()}
                        style={{ fontSize: 10, color: 'var(--color-accent)' }}
                      >
                        Go
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </>
  );
}
