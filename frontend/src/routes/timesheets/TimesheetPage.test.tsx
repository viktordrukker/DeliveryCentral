import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import {
  fetchMyTimesheetWeek,
  submitTimesheetWeek,
  upsertTimesheetEntry,
} from '@/lib/api/timesheets';
import { TimesheetPage } from './TimesheetPage';

vi.mock('@/app/auth-context', async () => {
  const actual = await vi.importActual<typeof import('@/app/auth-context')>('@/app/auth-context');
  return {
    ...actual,
    useAuth: () => ({ principal: { personId: 'test-user', roles: ['employee'] }, isLoading: false }),
  };
});

vi.mock('@/lib/api/assignments', () => ({
  fetchAssignments: vi.fn().mockResolvedValue({ items: [], totalCount: 0 }),
}));

vi.mock('@/lib/api/timesheets', () => ({
  fetchMyTimesheetWeek: vi.fn(),
  submitTimesheetWeek: vi.fn(),
  upsertTimesheetEntry: vi.fn(),
}));

const mockedFetchMyTimesheetWeek = vi.mocked(fetchMyTimesheetWeek);
const mockedSubmitTimesheetWeek = vi.mocked(submitTimesheetWeek);
const mockedUpsertTimesheetEntry = vi.mocked(upsertTimesheetEntry);

const DRAFT_WEEK = {
  id: 'week-1',
  personId: 'person-1',
  weekStart: '2026-03-30',
  status: 'DRAFT' as const,
  entries: [
    {
      id: 'entry-1',
      projectId: 'PRJ-001',
      date: '2026-03-30',
      hours: 4,
      capex: false,
    },
  ],
};

const SUBMITTED_WEEK = {
  ...DRAFT_WEEK,
  id: 'week-1',
  status: 'SUBMITTED' as const,
};

describe('TimesheetPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFetchMyTimesheetWeek.mockResolvedValue(DRAFT_WEEK);
    mockedUpsertTimesheetEntry.mockResolvedValue({
      id: 'entry-1',
      projectId: 'PRJ-001',
      date: '2026-03-30',
      hours: 4,
      capex: false,
    });
  });

  it('shows loading state initially', () => {
    mockedFetchMyTimesheetWeek.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByText('Loading timesheet...')).toBeInTheDocument();
  });


  it('renders the weekly grid after load', async () => {
    renderPage();
    expect(await screen.findByTestId('timesheet-page')).toBeInTheDocument();
    expect(screen.getByText('My Timesheet')).toBeInTheDocument();
  });

  it('renders the week navigation buttons', async () => {
    renderPage();
    await screen.findByTestId('timesheet-page');
    expect(screen.getByLabelText('Previous week')).toBeInTheDocument();
    expect(screen.getByLabelText('Next week')).toBeInTheDocument();
  });

  it('renders the project row for existing entries', async () => {
    renderPage();
    await screen.findByTestId('timesheet-page');
    expect(screen.getByText('PRJ-001')).toBeInTheDocument();
  });

  it('renders DRAFT status badge', async () => {
    renderPage();
    await screen.findByTestId('timesheet-page');
    expect(screen.getByText('DRAFT')).toBeInTheDocument();
  });

  it('shows submit button for DRAFT weeks', async () => {
    renderPage();
    await screen.findByTestId('timesheet-page');
    expect(screen.getByRole('button', { name: 'Submit for Approval' })).toBeInTheDocument();
  });

  it('disables submit button for submitted weeks', async () => {
    mockedFetchMyTimesheetWeek.mockResolvedValue(SUBMITTED_WEEK);
    renderPage();
    await screen.findByTestId('timesheet-page');
    const submitBtn = screen.getByRole('button', { name: 'Submit for Approval' });
    expect(submitBtn).toBeDisabled();
  });

  it('shows read-only notice for approved week', async () => {
    mockedFetchMyTimesheetWeek.mockResolvedValue({
      ...DRAFT_WEEK,
      status: 'APPROVED',
    });
    renderPage();
    await screen.findByTestId('timesheet-page');
    // Multiple APPROVED texts (badge + notice) — use getAllByText
    expect(screen.getAllByText(/APPROVED/).length).toBeGreaterThanOrEqual(1);
    // Submit button should not be present when read-only
    expect(screen.queryByRole('button', { name: 'Submit for Approval' })).not.toBeInTheDocument();
  });

  it('shows error state when API fails', async () => {
    mockedFetchMyTimesheetWeek.mockRejectedValue(new Error('Timesheet API error'));
    renderPage();
    // ErrorState renders the error description in a <p> tag
    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
  });

  it('navigates to next week when Next button is clicked', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId('timesheet-page');

    mockedFetchMyTimesheetWeek.mockResolvedValue({
      ...DRAFT_WEEK,
      weekStart: '2026-04-06',
    });

    await user.click(screen.getByLabelText('Next week'));

    // fetchMyTimesheetWeek should be called with the new week start
    await waitFor(() => {
      expect(mockedFetchMyTimesheetWeek).toHaveBeenCalledTimes(2);
    });
  });

  it('navigates to previous week when Prev button is clicked', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId('timesheet-page');

    mockedFetchMyTimesheetWeek.mockResolvedValue({
      ...DRAFT_WEEK,
      weekStart: '2026-03-23',
    });

    await user.click(screen.getByLabelText('Previous week'));

    await waitFor(() => {
      expect(mockedFetchMyTimesheetWeek).toHaveBeenCalledTimes(2);
    });
  });

  it('calls submitTimesheetWeek when Submit button clicked', async () => {
    mockedSubmitTimesheetWeek.mockResolvedValue(SUBMITTED_WEEK);
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId('timesheet-page');

    await user.click(screen.getByRole('button', { name: 'Submit for Approval' }));

    await waitFor(() => {
      expect(mockedSubmitTimesheetWeek).toHaveBeenCalledTimes(1);
    });
  });

  it('triggers auto-save (upsertTimesheetEntry) after cell blur with debounce', async () => {
    renderPage();
    // Wait for page to load with real timers
    await screen.findByTestId('timesheet-page');

    // Switch to fake timers after page is loaded
    vi.useFakeTimers();

    const cellInput = screen.getByTestId('cell-PRJ-001-2026-03-30');
    fireEvent.change(cellInput, { target: { value: '6' } });
    fireEvent.blur(cellInput);

    // Debounce has not fired yet
    expect(mockedUpsertTimesheetEntry).not.toHaveBeenCalled();

    // Advance past the 500ms debounce
    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(mockedUpsertTimesheetEntry).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'PRJ-001', date: '2026-03-30' }),
    );

    vi.useRealTimers();
  });
});

function renderPage(): void {
  render(
    <MemoryRouter initialEntries={['/timesheets?weekStart=2026-03-30']}>
      <Routes>
        <Route element={<TimesheetPage />} path="/timesheets" />
      </Routes>
    </MemoryRouter>,
  );
}
