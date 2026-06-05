/**
 * LEAN-P4-missing-10 — /me?tab=leave self-service leave request submission.
 *
 * Verifies:
 *   - The Request leave form renders inside /me?tab=leave (no manager
 *     intervention required).
 *   - Submitting the form calls `createLeaveRequest` with type, start, end
 *     and notes — the personId is resolved server-side from the principal.
 *   - On success the form clears and `fetchMyLeaveRequests` is re-fetched.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMyLeaveRequestsMock = vi.fn();
const fetchMyLeaveBalanceMock = vi.fn();
const createLeaveRequestMock = vi.fn();
const fetchPublicHolidaysMock = vi.fn();
const fetchEmployeeDashboardMock = vi.fn();

vi.mock('@/lib/api/leaveRequests', () => ({
  createLeaveRequest: (...args: unknown[]) => createLeaveRequestMock(...args),
  fetchMyLeaveBalance: (...args: unknown[]) => fetchMyLeaveBalanceMock(...args),
  fetchMyLeaveRequests: (...args: unknown[]) => fetchMyLeaveRequestsMock(...args),
}));

vi.mock('@/lib/api/my-time', () => ({
  fetchPublicHolidays: (...args: unknown[]) => fetchPublicHolidaysMock(...args),
}));

vi.mock('@/lib/api/dashboard-employee', () => ({
  fetchEmployeeDashboard: (...args: unknown[]) => fetchEmployeeDashboardMock(...args),
}));

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    principal: {
      authSource: 'bearer_token',
      displayName: 'Employee User',
      email: 'employee@example.com',
      personId: 'person-1',
      roles: ['employee'],
    },
  }),
}));

import { LeaveTab } from './LeaveTab';

describe('LeaveTab (/me?tab=leave) — self-service leave request submission', () => {
  beforeEach(() => {
    fetchMyLeaveRequestsMock.mockReset();
    fetchMyLeaveBalanceMock.mockReset();
    createLeaveRequestMock.mockReset();
    fetchPublicHolidaysMock.mockReset();
    fetchEmployeeDashboardMock.mockReset();

    fetchMyLeaveRequestsMock.mockResolvedValue([]);
    fetchMyLeaveBalanceMock.mockResolvedValue([
      {
        entitlement: 25,
        id: 'bal-1',
        leaveType: 'ANNUAL',
        pending: 0,
        personId: 'person-1',
        remaining: 25,
        used: 0,
        year: 2026,
      },
    ]);
    fetchPublicHolidaysMock.mockResolvedValue([]);
    fetchEmployeeDashboardMock.mockResolvedValue(null);
  });

  it('renders the Request leave form for the authenticated employee', async () => {
    render(<LeaveTab />);

    expect(await screen.findByRole('heading', { name: 'Request leave' })).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Start date')).toBeInTheDocument();
    expect(screen.getByText('End date')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Request leave/i })).toBeInTheDocument();
  });

  it('submits a self-service leave request via createLeaveRequest', async () => {
    createLeaveRequestMock.mockResolvedValue({
      createdAt: '2026-06-05T00:00:00Z',
      endDate: '2026-07-03',
      id: 'lr-1',
      notes: 'Family trip',
      personId: 'person-1',
      reviewComment: null,
      reviewedAt: null,
      reviewedBy: null,
      startDate: '2026-07-01',
      status: 'PENDING',
      type: 'ANNUAL',
    });

    const user = userEvent.setup();
    render(<LeaveTab />);

    await screen.findByRole('heading', { name: 'Request leave' });

    const startInput = screen.getByLabelText('Start date');
    const endInput = screen.getByLabelText('End date');
    const notesInput = screen.getByLabelText('Notes (optional)');

    await user.type(startInput, '2026-07-01');
    await user.type(endInput, '2026-07-03');
    await user.type(notesInput, 'Family trip');

    await user.click(screen.getByRole('button', { name: /Request leave/i }));

    await waitFor(() => {
      expect(createLeaveRequestMock).toHaveBeenCalledWith({
        endDate: '2026-07-03',
        notes: 'Family trip',
        startDate: '2026-07-01',
        type: 'ANNUAL',
      });
    });

    // After success the form refetches the caller's leave requests.
    await waitFor(() => {
      expect(fetchMyLeaveRequestsMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
    expect(await screen.findByText('Leave request submitted.')).toBeInTheDocument();
  });

  it('surfaces an error when createLeaveRequest fails', async () => {
    createLeaveRequestMock.mockRejectedValue(new Error('Overlapping request exists'));

    const user = userEvent.setup();
    render(<LeaveTab />);

    await screen.findByRole('heading', { name: 'Request leave' });

    await user.type(screen.getByLabelText('Start date'), '2026-07-01');
    await user.type(screen.getByLabelText('End date'), '2026-07-03');

    await user.click(screen.getByRole('button', { name: /Request leave/i }));

    expect(await screen.findByText('Overlapping request exists')).toBeInTheDocument();
  });
});
