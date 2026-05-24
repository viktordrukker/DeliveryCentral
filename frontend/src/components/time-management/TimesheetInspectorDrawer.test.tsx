import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  TimesheetInspectorDrawer,
  type TimesheetInspectorTarget,
} from './TimesheetInspectorDrawer';

const approveMock = vi.fn();
const rejectMock = vi.fn();

vi.mock('@/lib/api/timesheets', () => ({
  approveTimesheet: (...args: unknown[]) => approveMock(...args),
  rejectTimesheet: (...args: unknown[]) => rejectMock(...args),
}));

const TARGET: TimesheetInspectorTarget = {
  id: 'ts-1',
  personId: 'p-1',
  personName: 'Priya Natarajan',
  weekStart: '2026-05-18',
  totalHours: 42,
  overtimeHours: 2,
  status: 'SUBMITTED',
  submittedAt: '2026-05-22T15:30:00Z',
};

afterEach(() => {
  approveMock.mockReset();
  rejectMock.mockReset();
});

describe('TimesheetInspectorDrawer', () => {
  it('returns null when target is null', () => {
    const { container } = render(
      <TimesheetInspectorDrawer
        open
        target={null}
        onClose={() => undefined}
        onDecided={() => undefined}
      />,
    );
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders requester + week + KPI triple', () => {
    render(
      <TimesheetInspectorDrawer
        open
        target={TARGET}
        onClose={() => undefined}
        onDecided={() => undefined}
      />,
    );
    expect(screen.getByText(/Priya Natarajan/)).toBeInTheDocument();
    expect(screen.getByText(/Week of 2026-05-18/)).toBeInTheDocument();
    // Reported / Standard / Overtime KPI labels (exact match — the anomaly
    // text also contains "Overtime" but with surrounding words).
    expect(screen.getByText('Reported')).toBeInTheDocument();
    expect(screen.getByText('Standard')).toBeInTheDocument();
    expect(screen.getByText('Overtime')).toBeInTheDocument();
    // Values
    expect(screen.getByText('42.0h')).toBeInTheDocument();
    expect(screen.getByText('40.0h')).toBeInTheDocument();
    expect(screen.getByText('2.0h')).toBeInTheDocument();
  });

  it('derives no-anomaly when hours match standard with zero overtime', () => {
    render(
      <TimesheetInspectorDrawer
        open
        target={{ ...TARGET, totalHours: 40, overtimeHours: 0 }}
        onClose={() => undefined}
        onDecided={() => undefined}
      />,
    );
    expect(screen.getByText(/No anomalies detected/i)).toBeInTheDocument();
  });

  it('derives danger anomaly when total hours is zero', () => {
    render(
      <TimesheetInspectorDrawer
        open
        target={{ ...TARGET, totalHours: 0, overtimeHours: 0 }}
        onClose={() => undefined}
        onDecided={() => undefined}
      />,
    );
    expect(screen.getByText(/No hours logged this week/i)).toBeInTheDocument();
  });

  it('derives warning anomaly when under standard hours', () => {
    render(
      <TimesheetInspectorDrawer
        open
        target={{ ...TARGET, totalHours: 30, overtimeHours: 0 }}
        onClose={() => undefined}
        onDecided={() => undefined}
      />,
    );
    expect(screen.getByText(/Under expected hours/i)).toBeInTheDocument();
  });

  it('derives heavy-overtime anomaly when overtime >= 16h', () => {
    render(
      <TimesheetInspectorDrawer
        open
        target={{ ...TARGET, totalHours: 56, overtimeHours: 16 }}
        onClose={() => undefined}
        onDecided={() => undefined}
      />,
    );
    expect(screen.getByText(/Heavy overtime/i)).toBeInTheDocument();
  });

  it('Approve calls approveTimesheet + onDecided + onAdvance', async () => {
    approveMock.mockResolvedValue({ id: 'ts-1', status: 'APPROVED' });
    const onDecided = vi.fn();
    const onAdvance = vi.fn();
    const user = userEvent.setup();
    render(
      <TimesheetInspectorDrawer
        open
        target={TARGET}
        onClose={() => undefined}
        onDecided={onDecided}
        onAdvance={onAdvance}
      />,
    );
    await user.click(screen.getByRole('button', { name: /^Approve$/ }));
    await waitFor(() => expect(approveMock).toHaveBeenCalledWith('ts-1'));
    expect(onDecided).toHaveBeenCalledWith('approved');
    expect(onAdvance).toHaveBeenCalled();
  });

  it('Reject shows reason textarea on first click; confirms on second click', async () => {
    rejectMock.mockResolvedValue({ id: 'ts-1', status: 'REJECTED' });
    const onDecided = vi.fn();
    const user = userEvent.setup();
    render(
      <TimesheetInspectorDrawer
        open
        target={TARGET}
        onClose={() => undefined}
        onDecided={onDecided}
      />,
    );
    await user.click(screen.getByRole('button', { name: /^Reject…$/ }));
    const textarea = await screen.findByLabelText(/Reason for rejection/i);
    await user.type(textarea, 'Hours don\'t match assignments.');
    await user.click(screen.getByRole('button', { name: /Confirm reject/i }));
    await waitFor(() => expect(rejectMock).toHaveBeenCalledWith('ts-1', "Hours don't match assignments."));
    expect(onDecided).toHaveBeenCalledWith('rejected');
  });

  it('Reject blocks empty reason', async () => {
    const onError = vi.fn();
    const user = userEvent.setup();
    render(
      <TimesheetInspectorDrawer
        open
        target={TARGET}
        onClose={() => undefined}
        onDecided={() => undefined}
        onError={onError}
      />,
    );
    await user.click(screen.getByRole('button', { name: /^Reject…$/ }));
    await user.click(screen.getByRole('button', { name: /Confirm reject/i }));
    expect(rejectMock).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith('Please add a reason before rejecting.');
  });

  it('mentions the per-day grid follow-up gap in the placeholder', () => {
    render(
      <TimesheetInspectorDrawer
        open
        target={TARGET}
        onClose={() => undefined}
        onDecided={() => undefined}
      />,
    );
    expect(screen.getByText(/Day-by-day breakdown/i)).toBeInTheDocument();
    expect(screen.getByText(/per-day entry grid/i)).toBeInTheDocument();
  });
});
