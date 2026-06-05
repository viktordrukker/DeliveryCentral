import { screen, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { fetchDirectorDashboard, fetchDirectorOrgHealth } from '@/lib/api/dashboard-director';
import { fetchCapitalisationReport } from '@/lib/api/capitalisation';
import { fetchDirectorSlaSummary } from '@/lib/api/dashboard-exec-sla';
import { fetchPendingActions } from '@/lib/api/dashboard-pending-actions';
import { fetchProjectDirectory } from '@/lib/api/project-registry';
import { fetchProjectHealth } from '@/lib/api/project-health';
import { fetchWorkloadMatrix } from '@/lib/api/workload';
import { renderRoute } from '@test/render-route';
import { DirectorDashboardPage } from './DirectorDashboardPage';

vi.mock('@/lib/api/dashboard-director', () => ({
  fetchDirectorDashboard: vi.fn(),
  fetchDirectorOrgHealth: vi.fn().mockResolvedValue({
    asOf: '2026-04-05T00:00:00.000Z',
    totalHeadcount: 0,
    totalBenchSize: 0,
    portfolioUnfillRatePct: 0,
    units: [],
  }),
}));

vi.mock('@/lib/api/capitalisation', () => ({
  fetchCapitalisationReport: vi.fn(),
}));

vi.mock('@/lib/api/project-registry', () => ({
  fetchProjectDirectory: vi.fn(),
}));

vi.mock('@/lib/api/project-health', () => ({
  fetchProjectHealth: vi.fn(),
}));

vi.mock('@/lib/api/workload', () => ({
  fetchWorkloadMatrix: vi.fn(),
}));

vi.mock('@/lib/api/dashboard-pending-actions', () => ({
  fetchPendingActions: vi.fn().mockResolvedValue({ items: [], totalCount: 0 }),
}));

vi.mock('@/lib/api/dashboard-exec-sla', () => ({
  fetchDirectorSlaSummary: vi.fn().mockResolvedValue({ slaBreaches24h: 0, timeToFillSeries: [0, 0, 0, 0], timeToFillMedianDays: null, timeToFillSampleSize: 0 }),
}));

const mockedFetchDirectorDashboard = vi.mocked(fetchDirectorDashboard);
const mockedFetchDirectorOrgHealth = vi.mocked(fetchDirectorOrgHealth);
const mockedFetchDirectorSlaSummary = vi.mocked(fetchDirectorSlaSummary);
const mockedFetchPendingActions = vi.mocked(fetchPendingActions);
const mockedFetchCapitalisationReport = vi.mocked(fetchCapitalisationReport);
const mockedFetchProjectDirectory = vi.mocked(fetchProjectDirectory);
const mockedFetchProjectHealth = vi.mocked(fetchProjectHealth);
const mockedFetchWorkloadMatrix = vi.mocked(fetchWorkloadMatrix);

const DASHBOARD_DATA = {
  asOf: '2026-04-05T00:00:00.000Z',
  dataSources: ['assignments', 'projects'],
  summary: {
    activeAssignmentCount: 45,
    activeProjectCount: 12,
    staffedPersonCount: 30,
    staffingUtilisationRate: 90,
    unstaffedActivePersonCount: 3,
  },
  unitUtilisation: [
    {
      memberCount: 10,
      orgUnitId: 'unit-1',
      orgUnitName: 'Engineering',
      staffedCount: 8,
      utilisation: 80,
    },
  ],
  weeklyTrend: [
    { activeProjectCount: 12, staffingUtilisationRate: 90, staffedPersonCount: 30, weekStarting: '2026-03-30' },
  ],
};

describe('DirectorDashboardPage', () => {
  beforeEach(() => {
    mockedFetchDirectorDashboard.mockReset();
    mockedFetchCapitalisationReport.mockReset();
    mockedFetchProjectDirectory.mockReset();
    mockedFetchProjectHealth.mockReset();
    mockedFetchWorkloadMatrix.mockReset();

    // Default: return empty data for side calls
    mockedFetchCapitalisationReport.mockRejectedValue(new Error('not enabled'));
    mockedFetchProjectDirectory.mockResolvedValue({ items: [] });
    mockedFetchWorkloadMatrix.mockResolvedValue({ people: [], projects: [] });
    mockedFetchDirectorSlaSummary.mockResolvedValue({
      slaBreaches24h: 0,
      timeToFillSeries: [0, 0, 0, 0],
      timeToFillMedianDays: null,
      timeToFillSampleSize: 0,
    });
    mockedFetchPendingActions.mockResolvedValue({ items: [], totalCount: 0 });
    mockedFetchDirectorOrgHealth.mockResolvedValue({
      asOf: '2026-04-05T00:00:00.000Z',
      totalHeadcount: 0,
      totalBenchSize: 0,
      portfolioUnfillRatePct: 0,
      units: [],
    });
  });

  it('renders KPI summary cards with drilldown links', async () => {
    mockedFetchDirectorDashboard.mockResolvedValue(DASHBOARD_DATA);

    renderWithRouter();

    // KPI strip labels reflect the redesigned director dashboard:
    // Active Projects / Utilisation / On Bench / Open Gaps / Fill Rate / G·A·R
    expect(await screen.findByText('Active Projects')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Utilisation')).toBeInTheDocument();
    expect(screen.getByText('On Bench')).toBeInTheDocument();
  });

  // DirectorDashboard was redesigned: "8-Week Staffing Trend" and "Total FTE by Month"
  // sections no longer exist. The page now shows KPI strip + Unit Utilisation + various
  // panels; the specific chart sections these tests asserted against were removed.
  // TODO: refresh coverage against the new section titles.
  it.skip('renders weekly trend section on staffing tab (section removed in redesign)', async () => {});

  it('renders unit utilisation on overview tab', async () => {
    mockedFetchDirectorDashboard.mockResolvedValue(DASHBOARD_DATA);

    renderWithRouter('/dashboard/director');

    expect(await screen.findByText('Unit Utilisation')).toBeInTheDocument();
  });

  it.skip('renders FTE trend chart section (section removed in redesign)', async () => {});

  it.skip('renders portfolio summary table when projects exist (section removed in redesign)', async () => {});

  it.skip('renders cost distribution + utilisation gauge sections (removed in redesign)', async () => {});

  it('shows error state when dashboard fetch fails', async () => {
    mockedFetchDirectorDashboard.mockRejectedValue(new Error('Server error'));

    renderWithRouter();

    expect(await screen.findByText('Server error')).toBeInTheDocument();
  });

  it('renders the Org Health section header with portfolio totals', async () => {
    // LEAN-P4-missing-5
    mockedFetchDirectorDashboard.mockResolvedValue(DASHBOARD_DATA);
    mockedFetchDirectorOrgHealth.mockResolvedValue({
      asOf: '2026-06-05T00:00:00.000Z',
      totalHeadcount: 42,
      totalBenchSize: 7,
      portfolioUnfillRatePct: 16.7,
      units: [
        { orgUnitId: 'u-1', orgUnitCode: 'ENG', orgUnitName: 'Engineering', headcount: 30, staffedCount: 25, benchSize: 5, unfillRatePct: 16.7 },
        { orgUnitId: 'u-2', orgUnitCode: 'OPS', orgUnitName: 'Operations', headcount: 12, staffedCount: 10, benchSize: 2, unfillRatePct: 16.7 },
      ],
    });

    renderWithRouter();

    // Section title includes portfolio totals.
    expect(await screen.findByText(/Org Health by Unit · 42 HC · 7 bench \(16\.7%\)/)).toBeInTheDocument();
    const section = await screen.findByTestId('director-org-health-section');
    // Per-unit rows render inside the Org Health section (Engineering also
    // appears in Unit Utilisation — scope with `within`).
    expect(within(section).getByText('Engineering')).toBeInTheDocument();
    expect(within(section).getByText('Operations')).toBeInTheDocument();
    expect(within(section).getByText('ENG')).toBeInTheDocument();
    expect(within(section).getByText('OPS')).toBeInTheDocument();
  });

  it('renders empty state when no org units exist', async () => {
    mockedFetchDirectorDashboard.mockResolvedValue(DASHBOARD_DATA);
    mockedFetchDirectorOrgHealth.mockResolvedValue({
      asOf: '2026-06-05T00:00:00.000Z',
      totalHeadcount: 0,
      totalBenchSize: 0,
      portfolioUnfillRatePct: 0,
      units: [],
    });

    renderWithRouter();

    expect(await screen.findByText('No org units')).toBeInTheDocument();
  });
});

function renderWithRouter(path = '/dashboard/director') {
  return renderRoute(
    <Routes>
      <Route element={<DirectorDashboardPage />} path="/dashboard/director" />
    </Routes>,
    { initialEntries: [path] },
  );
}
