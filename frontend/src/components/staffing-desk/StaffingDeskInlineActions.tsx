import { useState } from 'react';

import { useAuth } from '@/app/auth-context';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { hasAnyRole, STAFFING_DESK_ROLES } from '@/app/route-manifest';
import type { StaffingDeskRow } from '@/lib/api/staffing-desk';
import type { StaffingDeskActions } from '@/features/staffing-desk/useStaffingDeskActions';

const RM_APPROVE_ROLES = ['resource_manager', 'director', 'admin'] as const;
const PM_END_ROLES = ['project_manager', 'resource_manager', 'delivery_manager', 'director', 'admin'] as const;

interface Props {
  actions: StaffingDeskActions;
  row: StaffingDeskRow;
}

export function StaffingDeskInlineActions({ actions, row }: Props): JSX.Element | null {
  const { principal } = useAuth();
  const roles = principal?.roles ?? [];
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  const canApprove = hasAnyRole(roles, [...RM_APPROVE_ROLES]);
  const canEnd = hasAnyRole(roles, [...PM_END_ROLES]);

  function handleConfirm(r?: string): void {
    if (!confirmAction) return;
    switch (confirmAction) {
      case 'reject':
        void actions.rejectAssignment(row.id, r ?? '');
        break;
      case 'end':
        void actions.endAssignment(row.id, r ?? '');
        break;
      case 'cancel':
        void actions.cancelRequest(row.id);
        break;
    }
    setConfirmAction(null);
  }

  if (row.kind === 'assignment') {
    return (
      <div style={{ display: 'flex', gap: 4 }}>
        {row.status === 'REQUESTED' && canApprove && (
          <button className="button button--sm" onClick={() => void actions.approveAssignment(row.id)} type="button" style={{ fontSize: 10, padding: '2px 8px' }}>
            Approve
          </button>
        )}
        {row.status === 'REQUESTED' && canApprove && (
          <button className="button button--secondary button--sm" onClick={() => setConfirmAction('reject')} type="button" style={{ fontSize: 10, padding: '2px 8px' }}>
            Reject
          </button>
        )}
        {row.status === 'ACTIVE' && canEnd && (
          <button className="button button--secondary button--sm" onClick={() => setConfirmAction('end')} type="button" style={{ fontSize: 10, padding: '2px 8px' }}>
            End
          </button>
        )}
        <ConfirmDialog
          open={confirmAction === 'reject' || confirmAction === 'end'}
          title={confirmAction === 'reject' ? 'Reject Assignment' : 'End Assignment'}
          message={confirmAction === 'reject' ? 'Provide a reason for rejection.' : 'Provide a reason for ending this assignment.'}
          requireReason
          onCancel={() => setConfirmAction(null)}
          onConfirm={handleConfirm}
        />
      </div>
    );
  }

  if (row.kind === 'request') {
    const canManage = hasAnyRole(roles, [...RM_APPROVE_ROLES]);
    const canCancel = hasAnyRole(roles, [...PM_END_ROLES]);
    const isTerminal = row.status === 'FULFILLED' || row.status === 'CANCELLED';

    return (
      <div style={{ display: 'flex', gap: 4 }}>
        {row.status === 'OPEN' && canManage && (
          <button className="button button--sm" onClick={() => void actions.reviewRequest(row.id)} type="button" style={{ fontSize: 10, padding: '2px 8px' }}>
            Review
          </button>
        )}
        {row.status === 'IN_REVIEW' && canManage && (
          <button className="button button--secondary button--sm" onClick={() => void actions.releaseRequest(row.id)} type="button" style={{ fontSize: 10, padding: '2px 8px' }}>
            Release
          </button>
        )}
        {!isTerminal && canCancel && (
          <button className="button button--secondary button--sm" onClick={() => setConfirmAction('cancel')} type="button" style={{ fontSize: 10, padding: '2px 8px', color: 'var(--color-status-danger)' }}>
            Cancel
          </button>
        )}
        <ConfirmDialog
          open={confirmAction === 'cancel'}
          title="Cancel Staffing Request"
          message="This request will be marked as cancelled. This cannot be undone."
          onCancel={() => setConfirmAction(null)}
          onConfirm={handleConfirm}
        />
      </div>
    );
  }

  return null;
}
