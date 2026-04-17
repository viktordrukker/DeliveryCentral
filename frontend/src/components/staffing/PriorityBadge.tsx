import { StatusBadge, type StatusTone } from '@/components/common/StatusBadge';

export function PriorityBadge({ priority }: { priority: string }): JSX.Element {
  const toneByPriority: Record<string, StatusTone> = {
    HIGH: 'warning',
    LOW: 'neutral',
    MEDIUM: 'info',
    URGENT: 'danger',
  };

  return <StatusBadge label={priority} size="small" tone={toneByPriority[priority] ?? 'neutral'} uppercase={true} />;
}
