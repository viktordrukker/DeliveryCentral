/**
 * TimeTab dsRefresh-gated weekly grid (read-only v1).
 *
 * Verifies that when `dsRefresh` is ON, /me?tab=time renders the new
 * project×day weekly grid (table data-testid="me-time-weekly-grid") with
 * daily totals + week status, sourced from the same MonthlyTimesheetResponse
 * the legacy Timeline strip uses. When OFF, the legacy Timeline path
 * renders instead (no grid).
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const fetchMonthlyTimesheetMock = vi.fn();
const isFeatureEnabledMock = vi.fn();

vi.mock('@/lib/api/my-time', () => ({
  fetchMonthlyTimesheet: (...args: unknown[]) => fetchMonthlyTimesheetMock(...args),
}));

vi.mock('@/lib/feature-flags', () => ({
  isFeatureEnabled: (flag: string) => isFeatureEnabledMock(flag),
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

function buildResponse() {
  const ws = weekStartForToday();
  return {
    personId: 'p1',
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    weeks: [
      { id: 'w1', weekStart: ws, status: 'DRAFT', totalHours: 16, overtimeHours: 0 },
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

    // Legacy MyTimePage still mounts below either path.
    expect(screen.getByTestId('legacy-my-time-page')).toBeInTheDocument();
  });
});
