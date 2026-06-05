/**
 * TimeTab dsRefresh-gated weekly grid (editable cells + submit-week).
 *
 * Verifies:
 *   - When `dsRefresh` is ON, /me?tab=time renders the new project×day
 *     weekly grid (table data-testid="me-time-weekly-grid") with daily
 *     totals + week status, sourced from MonthlyTimesheetResponse.
 *   - Cells are click-to-edit; commit fires `upsertTimesheetEntry` and the
 *     UI optimistically reflects the new value (verified by the recomputed
 *     Daily-total cell).
 *   - On upsert failure the cell value reverts to its server-truth value.
 *   - The Submit-week button calls `submitTimesheetWeek` and is disabled when
 *     the selected week is not DRAFT/REJECTED.
 *   - When `dsRefresh` is OFF, the legacy Timeline strip renders (no grid,
 *     no Submit-week button).
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const fetchMonthlyTimesheetMock = vi.fn();
const isFeatureEnabledMock = vi.fn();
const upsertTimesheetEntryMock = vi.fn();
const submitTimesheetWeekMock = vi.fn();
const toastErrorMock = vi.fn();
const toastSuccessMock = vi.fn();

vi.mock('@/lib/api/my-time', () => ({
  fetchMonthlyTimesheet: (...args: unknown[]) => fetchMonthlyTimesheetMock(...args),
}));

vi.mock('@/lib/api/timesheets', () => ({
  upsertTimesheetEntry: (...args: unknown[]) => upsertTimesheetEntryMock(...args),
  submitTimesheetWeek: (...args: unknown[]) => submitTimesheetWeekMock(...args),
}));

vi.mock('@/lib/feature-flags', () => ({
  isFeatureEnabled: (flag: string) => isFeatureEnabledMock(flag),
}));

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    success: (...args: unknown[]) => toastSuccessMock(...args),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('@/routes/my-time/MyTimePage', () => ({
  MyTimePage: () => <div data-testid="legacy-my-time-page" />,
}));

import { TimeTab } from './TimeTab';

const today = new Date();

function weekStartForToday(): string {
  // Mon-based week start matching the component's own logic.
  const d = new Date(today);
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + mondayOffset);
  return d.toISOString().slice(0, 10);
}

function isoDayInThisWeek(offset: number): string {
  const d = new Date(weekStartForToday());
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function buildResponse(weekStatus: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' = 'DRAFT') {
  const ws = weekStartForToday();
  return {
    personId: 'p1',
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    weeks: [
      { id: 'w1', weekStart: ws, status: weekStatus, totalHours: 16, overtimeHours: 0 },
    ],
    entries: [
      { id: 'e1', date: isoDayInThisWeek(0), hours: 5, projectId: 'pj1', projectCode: 'ALPHA', projectName: 'Alpha Project', assignmentId: 'a1', benchCategory: '', workLabel: '', workItemId: null, capex: false, description: null },
      { id: 'e2', date: isoDayInThisWeek(1), hours: 3, projectId: 'pj1', projectCode: 'ALPHA', projectName: 'Alpha Project', assignmentId: 'a1', benchCategory: '', workLabel: '', workItemId: null, capex: false, description: null },
      { id: 'e3', date: isoDayInThisWeek(1), hours: 7, projectId: 'pj2', projectCode: 'BETA', projectName: 'Beta Project', assignmentId: 'a2', benchCategory: '', workLabel: '', workItemId: null, capex: false, description: null },
    ],
    assignmentRows: [
      { assignmentId: 'a1', projectId: 'pj1', projectCode: 'ALPHA', projectName: 'Alpha Project', allocationPercent: 80, isBench: false, benchCategory: null },
      { assignmentId: 'a2', projectId: 'pj2', projectCode: 'BETA', projectName: 'Beta Project', allocationPercent: 20, isBench: false, benchCategory: null },
    ],
    leaveDays: [],
    holidays: [],
    gaps: [],
    summary: {
      workingDays: 5,
      expectedHours: 40,
      reportedHours: 16,
      standardHours: 16,
      overtimeHours: 0,
      leaveHours: 0,
      benchHours: 0,
      gapHours: 24,
      gapDays: 3,
      utilizationPercent: 40,
      byProject: [],
    },
  };
}

describe('TimeTab weekly grid (dsRefresh)', () => {
  beforeEach(() => {
    fetchMonthlyTimesheetMock.mockReset();
    upsertTimesheetEntryMock.mockReset();
    submitTimesheetWeekMock.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
    isFeatureEnabledMock.mockReset();
    fetchMonthlyTimesheetMock.mockResolvedValue(buildResponse());
  });

  it('renders the project×day grid + daily totals when dsRefresh is ON', async () => {
    isFeatureEnabledMock.mockImplementation((flag: string) => flag === 'dsRefresh');
    render(<TimeTab />);

    const grid = await screen.findByTestId('me-time-weekly-grid');
    expect(grid).toBeInTheDocument();

    // Project rows (sorted by code: ALPHA, then BETA).
    const alphaRow = await screen.findByText('Alpha Project');
    const betaRow = await screen.findByText('Beta Project');
    expect(alphaRow).toBeInTheDocument();
    expect(betaRow).toBeInTheDocument();

    // Daily total row label + the unique aggregated value: day 1 = 3.0 + 7.0 = 10.0
    // (no individual cell carries 10.0, so this exercises the aggregation path).
    expect(screen.getByText('Daily total')).toBeInTheDocument();
    expect(screen.getByText('10.0')).toBeInTheDocument();

    // Status badge rendered (DRAFT for our fixture).
    expect(screen.getByText('DRAFT')).toBeInTheDocument();
  });

  it('renders the legacy Timeline strip (no grid) when dsRefresh is OFF', async () => {
    isFeatureEnabledMock.mockReturnValue(false);
    render(<TimeTab />);

    // Wait for data to load — the "This week ·" SectionCard title pattern.
    await screen.findByText(/This week ·/);
    expect(screen.queryByTestId('me-time-weekly-grid')).toBeNull();
    expect(screen.queryByTestId('me-time-submit-week')).toBeNull();

    // Legacy MyTimePage still mounts below either path.
    expect(screen.getByTestId('legacy-my-time-page')).toBeInTheDocument();
  });

  it('edits a cell + optimistically updates the Daily-total when commit succeeds', async () => {
    isFeatureEnabledMock.mockImplementation((flag: string) => flag === 'dsRefresh');
    upsertTimesheetEntryMock.mockResolvedValue({});
    const user = userEvent.setup();
    const { container } = render(<TimeTab />);

    await screen.findByTestId('me-time-weekly-grid');

    // EditableCell buttons carry the `ds-editable-cell` class. Find the
    // first button rendering "5.0" — that's the Alpha-day-0 cell. (The
    // Daily-total day-0 cell also reads "5.0" but is rendered as a plain
    // span on the total row.)
    const editButtons = Array.from(container.querySelectorAll<HTMLButtonElement>('button.ds-editable-cell'));
    const alphaDay0 = editButtons.find((b) => b.textContent?.trim() === '5.0');
    expect(alphaDay0).toBeDefined();
    await user.click(alphaDay0!);

    // An <input type="number"> mounts. Update to 8 and blur to commit.
    const input = await screen.findByDisplayValue('5');
    expect(input).toHaveAttribute('type', 'number');
    fireEvent.change(input, { target: { value: '8' } });
    fireEvent.blur(input);

    await waitFor(() => expect(upsertTimesheetEntryMock).toHaveBeenCalledTimes(1));
    expect(upsertTimesheetEntryMock).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'pj1', hours: 8 }),
    );

    // After optimistic update the Alpha row + Daily-total day-0 both read 8.0.
    await waitFor(() => {
      expect(screen.getAllByText('8.0').length).toBeGreaterThan(0);
    });
  });

  it('reverts the cell value when upsertTimesheetEntry rejects', async () => {
    isFeatureEnabledMock.mockImplementation((flag: string) => flag === 'dsRefresh');
    upsertTimesheetEntryMock.mockRejectedValue(new Error('boom'));
    const user = userEvent.setup();
    const { container } = render(<TimeTab />);

    await screen.findByTestId('me-time-weekly-grid');

    const editButtons = Array.from(container.querySelectorAll<HTMLButtonElement>('button.ds-editable-cell'));
    const alphaDay0 = editButtons.find((b) => b.textContent?.trim() === '5.0');
    await user.click(alphaDay0!);

    const input = await screen.findByDisplayValue('5');
    fireEvent.change(input, { target: { value: '9' } });
    fireEvent.blur(input);

    await waitFor(() => expect(upsertTimesheetEntryMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(toastErrorMock).toHaveBeenCalled());

    // Editor stays open on failure to allow retry. Cancel it (Escape) — and
    // the cell snaps back to the server-truth value 5.0.
    fireEvent.keyDown(input, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByDisplayValue('9')).toBeNull());
    // Daily-total day-0 remains 5.0 (no optimistic survived).
    expect(screen.getAllByText('5.0').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('9.0')).toBeNull();
  });

  it('Submit-week calls submitTimesheetWeek and shows success toast', async () => {
    isFeatureEnabledMock.mockImplementation((flag: string) => flag === 'dsRefresh');
    submitTimesheetWeekMock.mockResolvedValue({});
    const user = userEvent.setup();
    render(<TimeTab />);

    const submit = await screen.findByTestId('me-time-submit-week');
    expect(submit).toBeEnabled();

    await user.click(submit);

    await waitFor(() => expect(submitTimesheetWeekMock).toHaveBeenCalledTimes(1));
    expect(submitTimesheetWeekMock).toHaveBeenCalledWith(weekStartForToday());
    await waitFor(() => expect(toastSuccessMock).toHaveBeenCalled());
  });

  it('disables Submit-week + cell edits when the selected week is SUBMITTED', async () => {
    isFeatureEnabledMock.mockImplementation((flag: string) => flag === 'dsRefresh');
    fetchMonthlyTimesheetMock.mockResolvedValue(buildResponse('SUBMITTED'));
    const { container } = render(<TimeTab />);

    const submit = await screen.findByTestId('me-time-submit-week');
    expect(submit).toBeDisabled();

    // No EditableCell buttons render when the week is locked.
    expect(container.querySelectorAll('button.ds-editable-cell').length).toBe(0);
  });

  it('shows SUBMITTED status badge alongside the Submit button', async () => {
    isFeatureEnabledMock.mockImplementation((flag: string) => flag === 'dsRefresh');
    fetchMonthlyTimesheetMock.mockResolvedValue(buildResponse('SUBMITTED'));
    render(<TimeTab />);

    await screen.findByTestId('me-time-weekly-grid');
    // StatusBadge for the week renders the status label as text.
    expect(screen.getByText('SUBMITTED')).toBeInTheDocument();
  });

  it('blocks a cell commit + shows an inline error when hours exceed 24/day', async () => {
    isFeatureEnabledMock.mockImplementation((flag: string) => flag === 'dsRefresh');
    const user = userEvent.setup();
    const { container } = render(<TimeTab />);

    await screen.findByTestId('me-time-weekly-grid');

    const editButtons = Array.from(container.querySelectorAll<HTMLButtonElement>('button.ds-editable-cell'));
    const alphaDay0 = editButtons.find((b) => b.textContent?.trim() === '5.0');
    expect(alphaDay0).toBeDefined();
    await user.click(alphaDay0!);

    const input = await screen.findByDisplayValue('5');
    fireEvent.change(input, { target: { value: '25' } });
    fireEvent.blur(input);

    // Inline error renders via role="alert"; commit must NOT have been called.
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Max 24h per day/);
    });
    expect(upsertTimesheetEntryMock).not.toHaveBeenCalled();
  });
});

