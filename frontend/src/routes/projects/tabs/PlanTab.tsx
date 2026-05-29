import { useEffect, useState } from 'react';

import type { ProjectDetails } from '@/lib/api/project-registry';
import type { ProjectShape } from '@/features/project-pulse/shape-defaults';
import { fetchStaffingSummary, type StaffingSummary } from '@/lib/api/project-role-plan';
import { fetchMilestones, type ProjectMilestoneDto } from '@/lib/api/project-milestones';
import { Donut, type DonutTone } from '@/components/ds';

import { MilestonesTab } from './MilestonesTab';
import { RisksIssuesTab } from './RisksIssuesTab';
import { ChangeRequestsTab } from './ChangeRequestsTab';
import { TeamVendorsTab } from './TeamVendorsTab';

interface PlanTabProps {
  project: ProjectDetails;
  projectId: string;
  shape?: ProjectShape | null;
  reload: () => Promise<void>;
}

/**
 * V2-A.1 — consolidated Plan tab.
 *
 * Stacks the four delivery-planning surfaces (milestones, risks/issues,
 * change requests, team & vendors) as sequential sections per the canvas
 * 3-tab Pulse / Plan / Money grammar. Each sub-section retains its own
 * `SectionCard` headers, forms, and edit modes — the section primitives
 * scroll within the page rather than fragmenting across separate tab
 * URLs.
 *
 * V2-B.5 — a Plan-focused KPI strip sits above the sections: role-plan fill
 * (from /staffing-summary — the legacy role-plan source, since the lean
 * ProjectPosition model is still shelved) + milestone progress. Reference:
 * `DS/page-plan-money.jsx`. Workstream swimlane Gantt is a follow-up (B3).
 */
export function PlanTab({ project, projectId, shape, reload }: PlanTabProps): JSX.Element {
  const [summary, setSummary] = useState<StaffingSummary | null>(null);
  const [milestones, setMilestones] = useState<ProjectMilestoneDto[]>([]);

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetchStaffingSummary(projectId).catch(() => null),
      fetchMilestones(projectId).catch(() => [] as ProjectMilestoneDto[]),
    ]).then(([s, m]) => {
      if (active) {
        setSummary(s);
        setMilestones(m);
      }
    });
    return () => {
      active = false;
    };
  }, [projectId]);

  const msTotal = milestones.length;
  const msHit = milestones.filter((m) => m.status === 'HIT').length;
  const msPct = msTotal > 0 ? Math.round((msHit / msTotal) * 100) : 0;
  const fillRate = summary ? Math.round(summary.fillRate) : 0;
  const fillTone: DonutTone =
    fillRate >= 90 ? 'active' : fillRate >= 70 ? 'info' : fillRate >= 50 ? 'warning' : 'danger';

  return (
    <div
      data-testid="plan-tab"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}
    >
      {/* V2-B.5 — Plan KPI strip (real data: legacy staffing-summary + milestones). */}
      {summary && (summary.totalPlanned > 0 || msTotal > 0) ? (
        <div className="kpi-strip" data-testid="plan-kpi-strip">
          <div className="kpi tone-info">
            <span className="kpi-label">Roles planned</span>
            <span className="kpi-value">{summary.totalPlanned}</span>
            <span className="kpi-foot">across the role plan</span>
          </div>
          <div className={`kpi tone-${fillTone}`} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Donut
              value={summary.totalFilled}
              max={Math.max(summary.totalPlanned, 1)}
              size={48}
              thickness={6}
              tone={fillTone}
              label={`${fillRate}%`}
              ariaLabel={`${summary.totalFilled} of ${summary.totalPlanned} roles filled`}
            />
            <span style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="kpi-label">Filled</span>
              <span className="kpi-foot">
                {summary.totalFilled}/{summary.totalPlanned} roles
              </span>
            </span>
          </div>
          <div
            className={`kpi tone-${
              summary.totalGap === 0
                ? 'active'
                : summary.totalGap <= 2
                  ? 'info'
                  : summary.totalGap <= 5
                    ? 'warning'
                    : 'danger'
            }`}
          >
            <span className="kpi-label">Open gap</span>
            <span className="kpi-value">{summary.totalGap}</span>
            <span className="kpi-foot">unfilled roles</span>
          </div>
          <div
            className={`kpi tone-${
              msTotal === 0 ? 'info' : msPct >= 90 ? 'active' : msPct >= 60 ? 'info' : 'warning'
            }`}
          >
            <span className="kpi-label">Milestones hit</span>
            <span className="kpi-value">
              {msHit}/{msTotal}
            </span>
            <span className="kpi-foot">{msPct}% complete</span>
          </div>
        </div>
      ) : null}

      <MilestonesTab projectId={projectId} shape={shape} />
      <RisksIssuesTab projectId={projectId} />
      <ChangeRequestsTab projectId={projectId} />
      <TeamVendorsTab project={project} projectId={projectId} reload={reload} />
    </div>
  );
}
