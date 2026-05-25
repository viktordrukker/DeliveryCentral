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
 * Reference: `DS/page-plan-money.jsx`. Workstream swimlane Gantt is a
 * follow-up (V2-A.3) — Plan v1 keeps the existing flat Milestones Gantt.
 */
export function PlanTab({ project, projectId, shape, reload }: PlanTabProps): JSX.Element {
  return (
    <div
      data-testid="plan-tab"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}
    >
      <MilestonesTab projectId={projectId} shape={shape} />
      <RisksIssuesTab projectId={projectId} />
      <ChangeRequestsTab projectId={projectId} />
      <TeamVendorsTab project={project} projectId={projectId} reload={reload} />
    </div>
  );
}
