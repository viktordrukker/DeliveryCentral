import { StaffingRequestStatus } from '@/lib/api/staffing-requests';

const STATUS_STYLE: Record<StaffingRequestStatus, { background: string; color: string; label: string }> = {
  DRAFT: { background: '#f3f4f6', color: '#6b7280', label: 'Draft' },
  OPEN: { background: '#dbeafe', color: '#1d4ed8', label: 'Open' },
  IN_REVIEW: { background: '#fef3c7', color: '#b45309', label: 'In Review' },
  FULFILLED: { background: '#d1fae5', color: '#065f46', label: 'Fulfilled' },
  CANCELLED: { background: '#fee2e2', color: '#991b1b', label: 'Cancelled' },
};

export function StaffingRequestStatusBadge({ status }: { status: StaffingRequestStatus }): JSX.Element {
  const style = STATUS_STYLE[status] ?? { background: '#f3f4f6', color: '#374151', label: status };
  return (
    <span
      style={{
        display: 'inline-block',
        background: style.background,
        color: style.color,
        borderRadius: 4,
        padding: '1px 8px',
        fontSize: '0.75rem',
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {style.label}
    </span>
  );
}
