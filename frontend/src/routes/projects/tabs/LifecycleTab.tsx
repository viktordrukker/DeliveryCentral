import { useEffect, useState } from 'react';

import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { SectionCard } from '@/components/common/SectionCard';
import { AuditTimeline } from '@/components/common/AuditTimeline';
import { LifecycleTimeline } from '@/components/projects/LifecycleTimeline';
import { ProjectLifecycleControls } from '@/components/projects/ProjectLifecycleControls';
import { fetchBusinessAudit, type BusinessAuditRecord } from '@/lib/api/business-audit';
import type { ProjectDetails } from '@/lib/api/project-registry';

interface LifecycleTabProps {
  projectId: string;
  project?: ProjectDetails;
  canManageProject?: boolean;
  onReload?: () => Promise<void>;
}

export function LifecycleTab({ projectId, project, canManageProject, onReload }: LifecycleTabProps): JSX.Element {
  const [events, setEvents] = useState<BusinessAuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);

    void fetchBusinessAudit({ targetEntityType: 'Project', targetEntityId: projectId, pageSize: 200 })
      .then((data) => { if (active) setEvents(data.items); })
      .catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : 'Failed to load lifecycle data.'); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [projectId]);

  if (loading) return <LoadingState label="Loading lifecycle..." variant="skeleton" skeletonType="detail" />;
  if (error) return <ErrorState description={error} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {/* ── Lifecycle Controls (moved from Radiator tab) ── */}
      {project && canManageProject !== undefined && onReload ? (
        <ProjectLifecycleControls
          canManageProject={canManageProject}
          onReload={onReload}
          project={project}
        />
      ) : null}

      {/* ── Lifecycle Milestones ── */}
      <SectionCard title="Project Lifecycle">
        <LifecycleTimeline events={events} />
      </SectionCard>

      {/* ── Full Audit Trail ── */}
      <SectionCard title="Full Change History" collapsible>
        <AuditTimeline events={events} />
      </SectionCard>
    </div>
  );
}
