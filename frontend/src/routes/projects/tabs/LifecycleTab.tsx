import { useEffect, useState } from 'react';

import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { SectionCard } from '@/components/common/SectionCard';
import { AuditTimeline } from '@/components/common/AuditTimeline';
import { LifecycleTimeline } from '@/components/projects/LifecycleTimeline';
import { fetchBusinessAudit, type BusinessAuditRecord } from '@/lib/api/business-audit';

interface LifecycleTabProps {
  projectId: string;
}

export function LifecycleTab({ projectId }: LifecycleTabProps): JSX.Element {
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
    <>
      {/* ── Lifecycle Milestones ── */}
      <SectionCard title="Project Lifecycle">
        <LifecycleTimeline events={events} />
      </SectionCard>

      {/* ── Full Audit Trail ── */}
      <SectionCard title="Full Change History" collapsible>
        <AuditTimeline events={events} />
      </SectionCard>
    </>
  );
}
