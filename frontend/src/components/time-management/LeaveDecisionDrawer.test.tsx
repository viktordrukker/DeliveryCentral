import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LeaveDecisionDrawer, type LeaveDecisionTarget } from './LeaveDecisionDrawer';

const approveMock = vi.fn();
const rejectMock = vi.fn();
const fetchBalanceMock = vi.fn();
const fetchAssignmentsMock = vi.fn();

vi.mock('@/lib/api/leaveRequests', () => ({
  approveLeaveRequest: (...args: unknown[]) => approveMock(...args),
  rejectLeaveRequest: (...args: unknown[]) => rejectMock(...args),
  fetchMyLeaveBalance: (...args: unknown[]) => fetchBalanceMock(...args),
}));

vi.mock('@/lib/api/assignments', () => ({
  fetchAssignments: (...args: unknown[]) => fetchAssignmentsMock(...args),
}));

const TARGET: LeaveDecisionTarget = {
  id: 'lr-1',
  personId: 'p-1',
  personName: 'Priya Natarajan',
  leaveType: 'ANNUAL',
  leaveStartDate: '2026-06-01',
  leaveEndDate: '2026-06-05',
  leaveDays: 5,
  notes: 'Family wedding',
  submittedAt: '2026-05-20T10:00:00Z',
};

function defaultMocks(): void {
  approveMock.mockResolvedValue({ id: 'lr-1', status: 'APPROVED' });
  rejectMock.mockResolvedValue({ id: 'lr-1', status: 'REJECTED' });
  fetchBalanceMock.mockResolvedValue([]);
  fetchAssignmentsMock.mockResolvedValue({ items: [], totalCount: 0 });
}

afterEach(() => {
  approveMock.mockReset();
  rejectMock.mockReset();
  fetchBalanceMock.mockReset();
  fetchAssignmentsMock.mockReset();
});

describe('LeaveDecisionDrawer', () => {
  it('returns null when target is null (even if open)', () => {
    const { container } = render(
      <LeaveDecisionDrawer
        open
        target={null}
        onClose={() => undefined}
        onDecided={() => undefined}
      />,
    );
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders requester name + leave type + range in the header', async () => {
    defaultMocks();
    render(
      <LeaveDecisionDrawer
        open
        target={TARGET}
        onClose={() => undefined}
        onDecided={() => undefined}
      />,
    );
    expect(screen.getByText(/Priya Natarajan/)).toBeInTheDocument();
    expect(screen.getByText(/Annual Leave/)).toBeInTheDocument();
    expect(screen.getByText(/5 days/)).toBeInTheDocument();
    await waitFor(() => expect(fetchAssignmentsMock).toHaveBeenCalledWith({ personId: 'p-1', pageSize: 100 }));
  });

  it('renders the requester notes when present', () => {
    defaultMocks();
    render(
      <LeaveDecisionDrawer
        open
        target={TARGET}
        onClose={() => undefined}
        onDecided={() => undefined}
      />,
    );
    expect(screen.getByText('Family wedding')).toBeInTheDocument();
  });

  it('renders conflicting assignments when fetch returns rows in range', async () => {
    defaultMocks();
    fetchAssignmentsMock.mockResolvedValue({
      items: [
        {
          id: 'a-1',
          allocationPercent: 80,
          approvalState: 'ASSIGNED',
          endDate: '2026-06-10',
          startDate: '2026-05-01',
          person: { id: 'p-1', displayName: 'Priya Natarajan' },
          project: { id: 'proj-1', displayName: 'MCB-UK' },
          staffingRole: 'Senior FE',
        },
      ],
      totalCount: 1,
    });
    render(
      <LeaveDecisionDrawer
        open
        target={TARGET}
        onClose={() => undefined}
        onDecided={() => undefined}
      />,
    );
    await waitFor(() => expect(screen.getByText('MCB-UK')).toBeInTheDocument());
    expect(screen.getByText('Senior FE')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('renders "no conflicts" message when fetch returns empty', async () => {
    defaultMocks();
    render(
      <LeaveDecisionDrawer
        open
        target={TARGET}
        onClose={() => undefined}
        onDecided={() => undefined}
      />,
    );
    await waitFor(() => expect(screen.getByText(/No active assignments overlap/i)).toBeInTheDocument());
  });

  it('Approve button calls approveLeaveRequest + onDecided', async () => {
    defaultMocks();
    const onDecided = vi.fn();
    const user = userEvent.setup();
    render(
      <LeaveDecisionDrawer
        open
        target={TARGET}
        onClose={() => undefined}
        onDecided={onDecided}
      />,
    );
    await user.click(screen.getByRole('button', { name: /^Approve$/ }));
    await waitFor(() => expect(approveMock).toHaveBeenCalledWith('lr-1', {}));
    expect(onDecided).toHaveBeenCalledWith('approved', expect.objectContaining({ status: 'APPROVED' }));
  });

  it('Reject button shows reason textarea on first click; confirms on second click', async () => {
    defaultMocks();
    const onDecided = vi.fn();
    const user = userEvent.setup();
    render(
      <LeaveDecisionDrawer
        open
        target={TARGET}
        onClose={() => undefined}
        onDecided={onDecided}
      />,
    );
    const rejectBtn = screen.getByRole('button', { name: /^Reject…$/ });
    await user.click(rejectBtn);
    const reasonTextarea = await screen.findByLabelText(/Reason for rejection/i);
    expect(reasonTextarea).toBeInTheDocument();
    await user.type(reasonTextarea, 'Coverage gap in critical sprint week.');
    const confirmBtn = screen.getByRole('button', { name: /Confirm reject/i });
    await user.click(confirmBtn);
    await waitFor(() => expect(rejectMock).toHaveBeenCalledWith('lr-1', { reviewComment: 'Coverage gap in critical sprint week.' }));
    expect(onDecided).toHaveBeenCalledWith('rejected', expect.objectContaining({ status: 'REJECTED' }));
  });

  it('Reject blocks submission when reason is whitespace-only', async () => {
    defaultMocks();
    const onError = vi.fn();
    const user = userEvent.setup();
    render(
      <LeaveDecisionDrawer
        open
        target={TARGET}
        onClose={() => undefined}
        onDecided={() => undefined}
        onError={onError}
      />,
    );
    await user.click(screen.getByRole('button', { name: /^Reject…$/ }));
    const reasonTextarea = await screen.findByLabelText(/Reason for rejection/i);
    await user.type(reasonTextarea, '   ');
    await user.click(screen.getByRole('button', { name: /Confirm reject/i }));
    expect(rejectMock).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith('Please add a reason before rejecting.');
  });

  it('Approve with comment from the optional details captures reviewComment', async () => {
    defaultMocks();
    const user = userEvent.setup();
    render(
      <LeaveDecisionDrawer
        open
        target={TARGET}
        onClose={() => undefined}
        onDecided={() => undefined}
      />,
    );
    // The details element is collapsed by default; clicking the summary opens it.
    const summary = screen.getByText(/Add a comment with this approval/i);
    await user.click(summary);
    const textareas = screen.getAllByRole('textbox');
    // Approval textarea is the one inside the details element.
    const approveTextarea = textareas[textareas.length - 1];
    await user.type(approveTextarea, 'Coverage arranged with pool.');
    await user.click(screen.getByRole('button', { name: /^Approve$/ }));
    await waitFor(() => expect(approveMock).toHaveBeenCalledWith('lr-1', { reviewComment: 'Coverage arranged with pool.' }));
  });

  it('onAdvance fires after a successful decision', async () => {
    defaultMocks();
    const onAdvance = vi.fn();
    const user = userEvent.setup();
    render(
      <LeaveDecisionDrawer
        open
        target={TARGET}
        onClose={() => undefined}
        onDecided={() => undefined}
        onAdvance={onAdvance}
      />,
    );
    await user.click(screen.getByRole('button', { name: /^Approve$/ }));
    await waitFor(() => expect(onAdvance).toHaveBeenCalled());
  });
});
