import type { ProjectDetails } from '@/lib/api/project-registry';
import type { ProjectShape } from '@/features/project-pulse/shape-defaults';

import { MilestonesTab } from './MilestonesTab';
import { RisksIssuesTab } from './RisksIssuesTab';
import { ChangeRequestsTab } from './ChangeRequestsTab';
import { TeamVendorsTab } from './TeamVendorsTab';

interface PlanTabProps {
  project: ProjectDetails;
  projectId: string;
  shape?: ProjectShape | null;
  reload: () => Promise<void>;
  /** V2-B.7 — header-driven "Add milestone" / "Add change request" signals. */
  milestoneAddSignal?: number;
  changeRequestAddSignal?: number;
}

/**
 * SoT PR 5 — Plan tab. KPI strip removed per DS canvas (KPI strip belongs on
 * Pulse only). Plan stacks the four delivery-planning surfaces (milestones,
 * risks/issues, change requests, team & vendors) as sequential sections.
 */
export function PlanTab({ project, projectId, shape, reload, milestoneAddSignal, changeRequestAddSignal }: PlanTabProps): JSX.Element {
  return (
    <div
      data-testid="plan-tab"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}
    >
      <MilestonesTab projectId={projectId} shape={shape} openCreateSignal={milestoneAddSignal} />
      <RisksIssuesTab projectId={projectId} />
      <ChangeRequestsTab projectId={projectId} openCreateSignal={changeRequestAddSignal} />
      <TeamVendorsTab project={project} projectId={projectId} reload={reload} />
    </div>
  );
}
