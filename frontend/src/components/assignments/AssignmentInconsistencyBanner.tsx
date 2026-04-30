interface AssignmentInconsistencyBannerProps {
  status: string;
  staffingRequestId?: string | null;
  /** When true, the banner is suppressed (assignment is consistent with the new model). */
  suppress?: boolean;
}

const LEGACY_PRE_BOOKED_STATUSES = new Set(['CREATED', 'PROPOSED', 'IN_REVIEW']);

/**
 * Detects assignments created under the previous (slate-on-assignment) workflow
 * where the row was born with a placeholder personId before the slate flow
 * even kicked off. Such rows have no path forward in the new model.
 */
export function AssignmentInconsistencyBanner({
  status,
  staffingRequestId: _staffingRequestId,
  suppress,
}: AssignmentInconsistencyBannerProps): JSX.Element | null {
  if (suppress) return null;
  if (!LEGACY_PRE_BOOKED_STATUSES.has(status)) return null;

  return (
    <div
      role="status"
      style={{
        background: 'var(--color-status-warning-soft, var(--color-surface-alt))',
        color: 'var(--color-text)',
        border: '1px solid var(--color-status-warning)',
        borderRadius: 4,
        padding: 'var(--space-2) var(--space-3)',
        fontSize: 12,
        marginBottom: 'var(--space-2)',
      }}
    >
      <strong style={{ color: 'var(--color-status-warning)' }}>
        Legacy workflow assignment.
      </strong>{' '}
      This assignment was created under a previous workflow where a person was
      attached before the slate review. The new model creates assignments only
      after a candidate is picked — so the early-stage actions on this page no
      longer apply. New work should start from a Staffing Request.
    </div>
  );
}
