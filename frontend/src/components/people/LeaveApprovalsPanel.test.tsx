import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderRoute } from '@test/render-route';
import { LeaveApprovalsPanel } from './LeaveApprovalsPanel';
import type { ApprovalQueueItem } from '@/lib/api/time-management';

const fetchApprovalQueueMock = vi.fn();
const drawerSpy = vi.fn();

vi.mock('@/lib/api/time-management', () => ({
  fetchApprovalQueue: (...args: unknown[]) => fetchApprovalQueueMock(...args),
}));

// Lightweight drawer stub — we only need to assert it's rendered with the
// chosen target (so the row-click → drawer wiring is verified). The real
// drawer has its own unit suite.
vi.mock('@/components/time-management/LeaveDecisionDrawer', () => ({
  LeaveDecisionDrawer: (props: { open: boolean; target: { personName: string } | null }) => {
    drawerSpy(props);
    return props.open && props.target ? (
      <div data-testid="leave-decision-drawer">drawer:{props.target.personName}</div>
    ) : null;
  },
}));

const PENDING_LEAVE_A: ApprovalQueueItem = {
  id: 'lr-1',
  type: 'leave',
  personId: 'p-1',
  personName: 'Priya Natarajan',
  status: 'PENDING',
  submittedAt: '2026-05-20T10:00:00Z',
  leaveType: 'ANNUAL',
  leaveStartDate: '2026-06-01',
  leaveEndDate: '2026-06-05',
  leaveDays: 5,
};

const PENDING_LEAVE_B: ApprovalQueueItem = {
  id: 'lr-2',
  type: 'leave',
  personId: 'p-2',
  personName: 'Sven Olsen',
  status: 'PENDING',
  submittedAt: '2026-05-21T10:00:00Z',
  leaveType: 'SICK',
  leaveStartDate: '2026-06-10',
  leaveEndDate: '2026-06-11',
  leaveDays: 2,
};

const PENDING_TIMESHEET: ApprovalQueueItem = {
  id: 'ts-1',
  type: 'timesheet',
  personId: 'p-3',
  personName: 'Ada Lovelace',
  status: 'SUBMITTED',
  submittedAt: '2026-05-20T10:00:00Z',
  weekStart: '2026-05-18',
  totalHours: 40,
  overtimeHours: 0,
};

afterEach(() => {
  fetchApprovalQueueMock.mockReset();
  drawerSpy.mockReset();
});

describe('LeaveApprovalsPanel', () => {
  it('renders the loaded list (and filters out non-leave items)', async () => {
    fetchApprovalQueueMock.mockResolvedValue([PENDING_LEAVE_A, PENDING_LEAVE_B, PENDING_TIMESHEET]);
    renderRoute(<LeaveApprovalsPanel />);
    expect(await screen.findByText('Priya Natarajan')).toBeInTheDocument();
    expect(screen.getByText('Sven Olsen')).toBeInTheDocument();
    // Timesheet row must not appear — this panel is leave-only.
    expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument();
  });

  it('renders empty state when no leave requests are pending', async () => {
    fetchApprovalQueueMock.mockResolvedValue([]);
    renderRoute(<LeaveApprovalsPanel />);
    expect(await screen.findByText('No leave requests pending')).toBeInTheDocument();
  });

  it('renders error state when the fetch fails', async () => {
    fetchApprovalQueueMock.mockRejectedValue(new Error('boom'));
    renderRoute(<LeaveApprovalsPanel />);
    await waitFor(() => expect(screen.getByText(/boom/)).toBeInTheDocument());
  });

  it('opens the decision drawer when a row is clicked', async () => {
    const user = userEvent.setup();
    fetchApprovalQueueMock.mockResolvedValue([PENDING_LEAVE_A]);
    renderRoute(<LeaveApprovalsPanel />);
    const row = await screen.findByText('Priya Natarajan');
    await user.click(row);
    expect(await screen.findByTestId('leave-decision-drawer')).toHaveTextContent(
      'drawer:Priya Natarajan',
    );
  });
});
