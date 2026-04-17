import { useCallback } from 'react';
import { toast } from 'sonner';

import { approveAssignment, rejectAssignment, endAssignment } from '@/lib/api/assignments';
import { reviewStaffingRequest, fulfilStaffingRequest, cancelStaffingRequest, releaseStaffingRequest } from '@/lib/api/staffing-requests';

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
      (id: string, reason?: string) => wrap('Assignment approved', () => approveAssignment(id, { reason: reason ?? '' })),
      [wrap],
    ),
    rejectAssignment: useCallback(
      (id: string, reason: string) => wrap('Assignment rejected', () => rejectAssignment(id, { reason })),
      [wrap],
    ),
    endAssignment: useCallback(
      (id: string, reason: string, endDate?: string) =>
        wrap('Assignment ended', () => endAssignment(id, { reason, endDate: endDate ?? new Date().toISOString().slice(0, 10) })),
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
