import { useCallback } from 'react';
import { toast } from 'sonner';

import { bookAssignment, cancelAssignment, completeAssignment } from '@/lib/api/assignments';
import { reviewStaffingRequest, fulfilStaffingRequest, cancelStaffingRequest, releaseStaffingRequest } from '@/lib/api/staffing-requests';
import { showUndoToast } from '@/lib/undo-toast';

export interface StaffingDeskActions {
  approveAssignment: (id: string, reason?: string) => Promise<void>;
  rejectAssignment: (id: string, reason: string) => Promise<void>;
  endAssignment: (id: string, reason: string, endDate?: string) => Promise<void>;
  reviewRequest: (id: string) => Promise<void>;
  releaseRequest: (id: string) => Promise<void>;
  fulfilRequest: (id: string, proposedByPersonId: string, assignedPersonId: string) => Promise<void>;
  cancelRequest: (id: string) => Promise<void>;
}

export function useStaffingDeskActions(refetch: () => void): StaffingDeskActions {
  const wrap = useCallback(
    (label: string, fn: () => Promise<unknown>) => {
      return fn()
        .then(() => {
          toast.success(label);
          refetch();
        })
        .catch((err: unknown) => {
          toast.error(err instanceof Error ? err.message : `${label} failed.`);
        });
    },
    [refetch],
  );

  return {
    approveAssignment: useCallback(
      (id: string, reason?: string) => wrap('Assignment approved', () => bookAssignment(id, { reason: reason ?? '' })),
      [wrap],
    ),
    rejectAssignment: useCallback(
      (id: string, reason: string) =>
        cancelAssignment(id, { reason })
          .then((result) => {
            refetch();
            showUndoToast({
              undoActionId: result.undoActionId,
              successMessage: 'Assignment rejected.',
              onUndone: () => refetch(),
            });
          })
          .catch((err: unknown) => {
            toast.error(err instanceof Error ? err.message : 'Assignment rejected failed.');
          }),
      [refetch],
    ),
    endAssignment: useCallback(
      (id: string, reason: string, endDate?: string) => {
        // Legacy `endDate` parameter: forward as suffix on reason so the
        // canonical handler captures the operator's back-dated intent in
        // the audit trail. See HD-1 cutover audit.
        const merged = endDate
          ? `${reason || 'completed'} (endDate=${endDate})`
          : reason;
        return wrap('Assignment ended', () => completeAssignment(id, { reason: merged }));
      },
      [wrap],
    ),
    reviewRequest: useCallback(
      (id: string) => wrap('Request taken into review', () => reviewStaffingRequest(id)),
      [wrap],
    ),
    releaseRequest: useCallback(
      (id: string) => wrap('Request released', () => releaseStaffingRequest(id)),
      [wrap],
    ),
    fulfilRequest: useCallback(
      (id: string, proposedByPersonId: string, assignedPersonId: string) =>
        wrap('Request fulfilled', () => fulfilStaffingRequest(id, proposedByPersonId, assignedPersonId)),
      [wrap],
    ),
    cancelRequest: useCallback(
      (id: string) => wrap('Request cancelled', () => cancelStaffingRequest(id)),
      [wrap],
    ),
  };
}
