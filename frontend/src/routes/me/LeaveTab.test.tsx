/**
 * LEAN-P4-missing-11 — LeaveTab cancel CTA + dsRefresh-gated pending list.
 *
 * Verifies:
 *   - Pending requests list renders only when dsRefresh is ON.
 *   - Clicking "Cancel" on a pending row opens a confirm dialog.
 *   - Confirming calls cancelLeaveRequest with the right id and triggers
 *     a reload.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMyLeaveRequestsMock = vi.fn();
const fetchMyLeaveBalanceMock = vi.fn();
const fetchPublicHolidaysMock = vi.fn();
const fetchEmployeeDashboardMock = vi.fn();
const createLeaveRequestMock = vi.fn();
const cancelLeaveRequestMock = vi.fn();
const previewLeaveMock = vi.fn();
const isFeatureEnabledMock = vi.fn();

vi.mock('@/lib/api/leaveRequests', () => ({
  cancelLeaveRequest: (...args: unknown[]) => cancelLeaveRequestMock(...args),
  createLeaveRequest: (...args: unknown[]) => createLeaveRequestMock(...args),
  fetchMyLeaveBalance: (...args: unknown[]) => fetchMyLeaveBalanceMock(...args),
  fetchMyLeaveRequests: (...args: unknown[]) => fetchMyLeaveRequestsMock(...args),
  previewLeave: (...args: unknown[]) => previewLeaveMock(...args),
}));

vi.mock('@/lib/api/dashboard-employee', () => ({
  fetchEmployeeDashboard: (...args: unknown[]) => fetchEmployeeDashboardMock(...args),
}));

vi.mock('@/lib/api/my-time', () => ({
  fetchPublicHolidays: (...args: unknown[]) => fetchPublicHolidaysMock(...args),
}));

vi.mock('@/lib/feature-flags', async () => {
  const actual = await vi.importActual<typeof import('@/lib/feature-flags')>('@/lib/feature-flags');
  return {
    ...actual,
    isFeatureEnabled: (...args: unknown[]) => isFeatureEnabledMock(...args),
  };
});

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    principal: {
      authSource: 'bearer_token',
      displayName: 'Test User',
      email: 'test@example.com',
      personId: 'person-1',
      roles: ['employee'],
    },
  }),
}));

import { LeaveTab, isCompleteDate } from './LeaveTab';

const PENDING_REQUEST = {
  id: 'lr-1',
  personId: 'person-1',
  type: 'ANNUAL' as const,
  status: 'PENDING' as const,
  startDate: '2026-06-15',
  endDate: '2026-06-19',
  notes: 'Holiday trip',
  reviewedAt: null,
  reviewedBy: null,
  reviewComment: null,
  createdAt: '2026-05-01T00:00:00.000Z',
};

const BALANCE = [
  {
    id: 'b-1',
    personId: 'person-1',
    year: 2026,
    leaveType: 'ANNUAL',
    entitlement: 25,
    used: 3,
    pending: 5,
    remaining: 17,
  },
];

describe('LeaveTab — LEAN-P4-missing-11 cancel CTA', () => {
  beforeEach(() => {
    fetchMyLeaveRequestsMock.mockReset();
    fetchMyLeaveBalanceMock.mockReset();
    fetchPublicHolidaysMock.mockReset();
    fetchEmployeeDashboardMock.mockReset();
    cancelLeaveRequestMock.mockReset();
    previewLeaveMock.mockReset();
    isFeatureEnabledMock.mockReset();

    fetchMyLeaveRequestsMock.mockResolvedValue([PENDING_REQUEST]);
    fetchMyLeaveBalanceMock.mockResolvedValue(BALANCE);
    fetchPublicHolidaysMock.mockResolvedValue([]);
    fetchEmployeeDashboardMock.mockResolvedValue({ currentAssignments: [] });
    cancelLeaveRequestMock.mockResolvedValue({ ...PENDING_REQUEST, status: 'CANCELLED' });
  });

  it('hides the pending list when dsRefresh is OFF', async () => {
    isFeatureEnabledMock.mockReturnValue(false);
    render(<LeaveTab />);

    await waitFor(() => expect(fetchMyLeaveRequestsMock).toHaveBeenCalled());
    expect(screen.queryByText(/Pending requests/i)).toBeNull();
  });

  it('shows the pending list and a cancel button when dsRefresh is ON', async () => {
    isFeatureEnabledMock.mockReturnValue(true);
    render(<LeaveTab />);

    await waitFor(() => expect(fetchMyLeaveRequestsMock).toHaveBeenCalled());
    expect(await screen.findByText(/Pending requests \(1\)/i)).toBeInTheDocument();
    // The pending row shows the date range as a single string.
    expect(screen.getByText('2026-06-15 → 2026-06-19')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Cancel leave from 2026-06-15 to 2026-06-19/i }),
    ).toBeInTheDocument();
  });

  it('confirming cancel calls cancelLeaveRequest with the leave id', async () => {
    isFeatureEnabledMock.mockReturnValue(true);
    render(<LeaveTab />);

    await waitFor(() => expect(fetchMyLeaveRequestsMock).toHaveBeenCalled());
    const cancelBtn = await screen.findByRole('button', {
      name: /Cancel leave from 2026-06-15 to 2026-06-19/i,
    });

    await userEvent.click(cancelBtn);
    // Confirm dialog opens with a "Cancel request" primary button.
    const confirmBtn = await screen.findByRole('button', { name: /Cancel request/i });
    await userEvent.click(confirmBtn);

    await waitFor(() => expect(cancelLeaveRequestMock).toHaveBeenCalledWith('lr-1'));
    // Reload was triggered (the loader is invoked a second time).
    await waitFor(() => expect(fetchMyLeaveRequestsMock.mock.calls.length).toBeGreaterThanOrEqual(2));
  });
});

describe('LeaveTab — isCompleteDate guard (F-LEAVE-PREVIEW)', () => {
  it('rejects half-typed / insane-year dates so the server preview is not fired', () => {
    // The reported 400 came from a native date input emitting "0202-07-07"
    // mid-typing. These must be treated as incomplete.
    expect(isCompleteDate('0202-07-07')).toBe(false);
    expect(isCompleteDate('202-07-07')).toBe(false);
    expect(isCompleteDate('2026-07')).toBe(false);
    expect(isCompleteDate('')).toBe(false);
    expect(isCompleteDate('2026-13-40')).toBe(false); // not a real calendar date
  });

  it('accepts a fully-formed ISO date with a sane year', () => {
    expect(isCompleteDate('2026-07-07')).toBe(true);
    expect(isCompleteDate('2030-12-31')).toBe(true);
  });
});
