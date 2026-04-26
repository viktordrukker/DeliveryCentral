import { SectionCard } from '@/components/common/SectionCard';
import { AuditTimeline } from '@/components/common/AuditTimeline';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { useRecentActivity, type RecentActivityRole } from '@/features/dashboard/useRecentActivity';

interface Props {
  role: RecentActivityRole;
  title?: string;
  limit?: number;
}

export function RecentActivityRail({ role, title = 'Recent activity', limit = 5 }: Props): JSX.Element {
  const { events, isLoading, error } = useRecentActivity({ role, limit });

  return (
    <SectionCard title={title} collapsible>
      {isLoading ? (
        <LoadingState label="Loading recent activity..." variant="skeleton" skeletonType="table" />
      ) : error ? (
        <EmptyState description={error} title="Unavailable" />
      ) : events.length === 0 ? (
        <EmptyState description="No recent activity found for this role." title="Nothing yet" />
      ) : (
        <AuditTimeline events={events} />
      )}
    </SectionCard>
  );
}
