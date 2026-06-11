import { useCallback } from 'react';
import { toast } from 'sonner';

import { transitionProjectPositionFill } from '@/lib/api/project-positions';
import { showUndoToast } from '@/lib/undo-toast';

export interface StaffingDeskActions {
  approveAssignment: (id: string, reason?: string) => Promise<void>;
  rejectAssignment: (id: string, reason: string) => Promise<void>;
  endAssignment: (id: string, reason: string, endDate?: string) => Promise<void>;
  reviewRequest: (id: string, personId: string) => Promise<void>;
  releaseRequest: (id: string, reason: string) => Promise<void>;
  cancelRequest: (id: string, reason: string) => Promise<void>;
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

  // PR-13 — every action drives the lean /project-positions/:id/transition
  // handler with the canonical edges of the fill state machine:
  //   approveAssignment → PROPOSED→BOOKED
  //   rejectAssignment  → PROPOSED→OPEN with reason (candidate rejected,
  //                       position returns to the queue)
  //   endAssignment     → →RELEASED with reason
  //   reviewRequest     → OPEN→PROPOSED with personId (person-required
  //                       invariant — proposing without a candidate is a 400)
  //   releaseRequest    → PROPOSED→OPEN with reason
  //   cancelRequest     → →RELEASED with reason
  return {
    approveAssignment: useCallback(
      (id: string, reason?: string) =>
        wrap('Assignment approved', () =>
          transitionProjectPositionFill(id, { toStatus: 'BOOKED', reason: reason ?? '' }),
        ),
      [wrap],
    ),
    rejectAssignment: useCallback(
      (id: string, reason: string) =>
        transitionProjectPositionFill(id, { toStatus: 'OPEN', reason })
          .then(() => {
            refetch();
            showUndoToast({
              undoActionId: undefined,
              successMessage: 'Candidate rejected — position back in the queue.',
              onUndone: () => refetch(),
            });
          })
          .catch((err: unknown) => {
            toast.error(err instanceof Error ? err.message : 'Candidate rejection failed.');
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
    reviewRequest: useCallback(
      (id: string, personId: string) => wrap('Candidate proposed', () =>
        transitionProjectPositionFill(id, { toStatus: 'PROPOSED', personId }),
      ),
      [wrap],
    ),
    releaseRequest: useCallback(
      (id: string, reason: string) => wrap('Position released back to the queue', () =>
        transitionProjectPositionFill(id, { toStatus: 'OPEN', reason }),
      ),
      [wrap],
    ),
    cancelRequest: useCallback(
      (id: string, reason: string) => wrap('Position cancelled', () =>
        transitionProjectPositionFill(id, { toStatus: 'RELEASED', reason }),
      ),
      [wrap],
    ),
  };
}
