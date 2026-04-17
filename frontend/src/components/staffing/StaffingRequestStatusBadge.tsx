import { StaffingRequestStatus } from '@/lib/api/staffing-requests';
import { StatusBadge, type StatusTone } from '@/components/common/StatusBadge';

export function StaffingRequestStatusBadge({ status }: { status: StaffingRequestStatus }): JSX.Element {
  const labelByStatus: Record<StaffingRequestStatus, string> = {
    CANCELLED: 'Cancelled',
    DRAFT: 'Draft',
    FULFILLED: 'Fulfilled',
    IN_REVIEW: 'In Review',
    OPEN: 'Open',
  };
  const toneByStatus: Record<StaffingRequestStatus, StatusTone> = {
    CANCELLED: 'danger',
    DRAFT: 'neutral',
    FULFILLED: 'active',
    IN_REVIEW: 'pending',
    OPEN: 'active',
  };

  return <StatusBadge label={labelByStatus[status] ?? status} size="small" tone={toneByStatus[status] ?? 'neutral'} />;
}
