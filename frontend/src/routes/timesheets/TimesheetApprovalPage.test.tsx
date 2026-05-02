import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import {
  approveTimesheet,
  fetchApprovalQueue,
  rejectTimesheet,
} from '@/lib/api/timesheets';
import { TimesheetApprovalPage } from './TimesheetApprovalPage';

vi.mock('@/lib/api/timesheets', () => ({
  fetchApprovalQueue: vi.fn(),
  approveTimesheet: vi.fn(),
  rejectTimesheet: vi.fn(),
}));

const mockedFetchApprovalQueue = vi.mocked(fetchApprovalQueue);
const mockedApproveTimesheet = vi.mocked(approveTimesheet);
const mockedRejectTimesheet = vi.mocked(rejectTimesheet);

const SUBMITTED_WEEK = {
  id: 'week-1',
  personId: 'person-1',
  weekStart: '2026-03-30',
  status: 'SUBMITTED' as const,
  entries: [
    {
      id: 'entry-1',
      projectId: 'PRJ-001',
      date: '2026-03-30',
      hours: 8,
      capex: false,
    },
  ],
};

const APPROVED_WEEK = {
  ...SUBMITTED_WEEK,
  id: 'week-1',
  status: 'APPROVED' as const,
  approvedBy: 'manager-1',
  approvedAt: '2026-04-05T10:00:00Z',
};

const REJECTED_WEEK = {
  ...SUBMITTED_WEEK,
  id: 'week-1',
  status: 'REJECTED' as const,
  rejectedReason: 'Missing project code',
};

describe('TimesheetApprovalPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFetchApprovalQueue.mockResolvedValue([SUBMITTED_WEEK]);
  });

  it('shows loading state initially', () => {
    mockedFetchApprovalQueue.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByLabelText('Loading approval queue...')).toBeInTheDocument();
  });

  it('renders the page after loading', async () => {
    renderPage();
    expect(await screen.findByTestId('timesheet-approval-page')).toBeInTheDocument();
    expect(screen.getByText('Approval Progress')).toBeInTheDocument();
  });

  it('renders approval queue items', async () => {
    renderPage();
    await screen.findByTestId('timesheet-approval-page');
    expect(screen.getByText('person-1')).toBeInTheDocument();
    expect(screen.getByText('2026-03-30')).toBeInTheDocument();
    expect(screen.getByText('SUBMITTED')).toBeInTheDocument();
    expect(screen.getByText('8.0h')).toBeInTheDocument();
  });

  it('renders empty state when no timesheets', async () => {
    mockedFetchApprovalQueue.mockResolvedValue([]);
    renderPage();
    await screen.findByTestId('timesheet-approval-page');
    expect(screen.getByText('No timesheets match the current filters.')).toBeInTheDocument();
  });

  it('shows error state when API fails', async () => {
    mockedFetchApprovalQueue.mockRejectedValue(new Error('Approval queue error'));
    renderPage();
    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders approve and reject buttons for SUBMITTED timesheets', async () => {
    renderPage();
    await screen.findByTestId('timesheet-approval-page');
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument();
  });

  it('calls approveTimesheet when Approve is clicked', async () => {
    mockedApproveTimesheet.mockResolvedValue(APPROVED_WEEK);
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId('timesheet-approval-page');

    await user.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => {
      expect(mockedApproveTimesheet).toHaveBeenCalledWith('week-1');
    });
  });

  it('opens reject dialog when Reject is clicked', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId('timesheet-approval-page');

    await user.click(screen.getByRole('button', { name: 'Reject' }));

    expect(screen.getByText('Reject Timesheet')).toBeInTheDocument();
    expect(screen.getByText('Please provide a reason for rejection.')).toBeInTheDocument();
  });

  it('calls rejectTimesheet with reason when confirmed', async () => {
    mockedRejectTimesheet.mockResolvedValue(REJECTED_WEEK);
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId('timesheet-approval-page');

    // Click the Reject button in the table row
    await user.click(screen.getByRole('button', { name: 'Reject' }));

    // Scope all subsequent queries to the dialog so we can't accidentally
    // grab the row's Reject button after the dialog opens.
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Reject Timesheet')).toBeInTheDocument();

    await user.type(within(dialog).getByRole('textbox', { name: 'Reason' }), 'Missing project code');
    await user.click(within(dialog).getByRole('button', { name: 'Reject' }));

    await waitFor(() => {
      expect(mockedRejectTimesheet).toHaveBeenCalledWith('week-1', 'Missing project code');
    });
  });

  it('expands the row when View is clicked', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId('timesheet-approval-page');

    await user.click(screen.getByRole('button', { name: 'View' }));

    // The read-only grid table has aria-label="Timesheet detail"
    expect(await screen.findByRole('table', { name: 'Timesheet detail' })).toBeInTheDocument();
  });

  it('renders approval progress bar', async () => {
    mockedFetchApprovalQueue.mockResolvedValue([SUBMITTED_WEEK, APPROVED_WEEK]);
    renderPage();
    await screen.findByTestId('timesheet-approval-page');

    expect(screen.getByLabelText('Approval progress')).toBeInTheDocument();
    expect(screen.getByText('1 / 2 approved (1 pending)')).toBeInTheDocument();
  });

  it('renders bulk approve button when items are selected', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId('timesheet-approval-page');

    await user.click(screen.getByLabelText('Select week-1'));

    expect(screen.getByRole('button', { name: 'Approve Selected' })).toBeInTheDocument();
  });
});

function renderPage(): void {
  render(
    <MemoryRouter initialEntries={['/timesheets/approval']}>
      <Routes>
        <Route element={<TimesheetApprovalPage />} path="/timesheets/approval" />
      </Routes>
    </MemoryRouter>,
  );
}
