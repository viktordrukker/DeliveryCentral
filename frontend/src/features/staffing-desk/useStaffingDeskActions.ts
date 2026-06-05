import { useCallback } from 'react';
import { toast } from 'sonner';

import { transitionProjectPositionFill } from '@/lib/api/project-positions';
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
    // LEAN-P2-2: assignment-side transitions read/write through the lean
    // /project-positions transition handler. Staffing-request actions still
    // hit the legacy /staffing-requests endpoints — that domain is a separate
    // migration tracked under P2-3/P2-7.
    approveAssignment: useCallback(
      (id: string, reason?: string) =>
        wrap('Assignment approved', () =>
          transitionProjectPositionFill(id, { toStatus: 'BOOKED', reason: reason ?? '' }),
        ),
      [wrap],
    ),
    rejectAssignment: useCallback(
      (id: string, reason: string) =>
        transitionProjectPositionFill(id, { toStatus: 'RELEASED', reason })
          .then(() => {
            refetch();
            showUndoToast({
              undoActionId: undefined,
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
        // lean handler captures the operator's back-dated intent in the
        // audit trail.
        const merged = endDate
          ? `${reason || 'completed'} (endDate=${endDate})`
          : reason;
        return wrap('Assignment ended', () =>
          transitionProjectPositionFill(id, { toStatus: 'RELEASED', reason: merged }),
        );
      },
      [wrap],
    ),
    // LEAN-P2 exit-gate: staffing-request actions migrated onto the unified
    // /project-positions transition handler. Mappings:
    //   reviewRequest  → toStatus: 'PROPOSED' (RM is reviewing a candidate)
    //   releaseRequest → toStatus: 'OPEN' (release back to the queue)
    //   fulfilRequest  → toStatus: 'BOOKED' with personId
    //   cancelRequest  → toStatus: 'RELEASED'
    reviewRequest: useCallback(
      (id: string) => wrap('Request taken into review', () =>
        transitionProjectPositionFill(id, { toStatus: 'PROPOSED' }),
      ),
      [wrap],
    ),
    releaseRequest: useCallback(
      (id: string) => wrap('Request released', () =>
        transitionProjectPositionFill(id, { toStatus: 'OPEN' }),
      ),
      [wrap],
    ),
    fulfilRequest: useCallback(
      (id: string, _proposedByPersonId: string, assignedPersonId: string) =>
        wrap('Request fulfilled', () =>
          transitionProjectPositionFill(id, { toStatus: 'BOOKED', personId: assignedPersonId }),
        ),
      [wrap],
    ),
    cancelRequest: useCallback(
      (id: string) => wrap('Request cancelled', () =>
        transitionProjectPositionFill(id, { toStatus: 'RELEASED' }),
      ),
      [wrap],
    ),
  };
}
