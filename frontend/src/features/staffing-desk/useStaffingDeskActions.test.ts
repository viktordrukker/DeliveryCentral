import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useStaffingDeskActions } from './useStaffingDeskActions';

const transitionProjectPositionFill = vi.fn();
const showUndoToast = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock('@/lib/api/project-positions', () => ({
  transitionProjectPositionFill: (...a: unknown[]) => transitionProjectPositionFill(...a),
}));

vi.mock('@/lib/undo-toast', () => ({
  showUndoToast: (...a: unknown[]) => showUndoToast(...a),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
  },
}));

describe('useStaffingDeskActions — lean transition payloads (PR-13)', () => {
  const refetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    transitionProjectPositionFill.mockResolvedValue({});
  });

  it('approveAssignment drives PROPOSED→BOOKED on the canonical id', async () => {
    const { result } = renderHook(() => useStaffingDeskActions(refetch));
    await result.current.approveAssignment('pos_abc');
    expect(transitionProjectPositionFill).toHaveBeenCalledWith('pos_abc', {
      toStatus: 'BOOKED',
      reason: '',
    });
    await waitFor(() => expect(refetch).toHaveBeenCalled());
  });

  it('rejectAssignment drives PROPOSED→OPEN with the rejection reason', async () => {
    const { result } = renderHook(() => useStaffingDeskActions(refetch));
    await result.current.rejectAssignment('pos_abc', 'not a skill fit');
    expect(transitionProjectPositionFill).toHaveBeenCalledWith('pos_abc', {
      toStatus: 'OPEN',
      reason: 'not a skill fit',
    });
    await waitFor(() => expect(showUndoToast).toHaveBeenCalled());
    expect(refetch).toHaveBeenCalled();
  });

  it('endAssignment drives →RELEASED with the reason', async () => {
    const { result } = renderHook(() => useStaffingDeskActions(refetch));
    await result.current.endAssignment('pos_abc', 'project wrapped');
    expect(transitionProjectPositionFill).toHaveBeenCalledWith('pos_abc', {
      toStatus: 'RELEASED',
      reason: 'project wrapped',
    });
  });

  it('endAssignment folds a legacy endDate into the reason text', async () => {
    const { result } = renderHook(() => useStaffingDeskActions(refetch));
    await result.current.endAssignment('pos_abc', 'done', '2026-07-01');
    expect(transitionProjectPositionFill).toHaveBeenCalledWith('pos_abc', {
      toStatus: 'RELEASED',
      reason: 'done (endDate=2026-07-01)',
    });
  });

  it('reviewRequest drives OPEN→PROPOSED with the required personId', async () => {
    const { result } = renderHook(() => useStaffingDeskActions(refetch));
    await result.current.reviewRequest('pos_abc', 'person-9');
    expect(transitionProjectPositionFill).toHaveBeenCalledWith('pos_abc', {
      toStatus: 'PROPOSED',
      personId: 'person-9',
    });
  });

  it('releaseRequest drives PROPOSED→OPEN with the required reason', async () => {
    const { result } = renderHook(() => useStaffingDeskActions(refetch));
    await result.current.releaseRequest('pos_abc', 'candidate declined');
    expect(transitionProjectPositionFill).toHaveBeenCalledWith('pos_abc', {
      toStatus: 'OPEN',
      reason: 'candidate declined',
    });
  });

  it('cancelRequest drives →RELEASED with the required reason', async () => {
    const { result } = renderHook(() => useStaffingDeskActions(refetch));
    await result.current.cancelRequest('pos_abc', 'descoped');
    expect(transitionProjectPositionFill).toHaveBeenCalledWith('pos_abc', {
      toStatus: 'RELEASED',
      reason: 'descoped',
    });
  });

  it('no longer exposes the dead fulfilRequest action', () => {
    const { result } = renderHook(() => useStaffingDeskActions(refetch));
    expect('fulfilRequest' in result.current).toBe(false);
  });

  it('surfaces transition failures as an error toast without refetching', async () => {
    transitionProjectPositionFill.mockRejectedValueOnce(new Error('No transition from OPEN to BOOKED'));
    const { result } = renderHook(() => useStaffingDeskActions(refetch));
    await result.current.cancelRequest('pos_abc', 'descoped');
    expect(toastError).toHaveBeenCalledWith('No transition from OPEN to BOOKED');
    expect(refetch).not.toHaveBeenCalled();
  });
});
