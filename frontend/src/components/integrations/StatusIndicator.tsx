import { StatusBadge } from '@/components/common/StatusBadge';

interface StatusIndicatorProps {
  status: string;
}

export function StatusIndicator({ status }: StatusIndicatorProps): JSX.Element {
  return <StatusBadge size="small" status={status} />;
}
