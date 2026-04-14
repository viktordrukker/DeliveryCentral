import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { fetchDirectorDashboard } from '@/lib/api/dashboard-director';
import { fetchCapitalisationReport } from '@/lib/api/capitalisation';
import { fetchProjectDirectory } from '@/lib/api/project-registry';
import { fetchProjectHealth } from '@/lib/api/project-health';
import { fetchWorkloadMatrix } from '@/lib/api/workload';
import { renderRoute } from '@test/render-route';
import { DirectorDashboardPage } from './DirectorDashboardPage';

vi.mock('@/lib/api/dashboard-director', () => ({
  fetchDirectorDashboard: vi.fn(),
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

const mockedFetchDirectorDashboard = vi.mocked(fetchDirectorDashboard);
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
    evidenceCoverageRate: 85,
    staffedPersonCount: 30,
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
    { activeProjectCount: 12, evidenceCoverageRate: 85, staffedPersonCount: 30, weekStarting: '2026-03-30' },
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
  });

  it('renders KPI summary cards with drilldown links', async () => {
    mockedFetchDirectorDashboard.mockResolvedValue(DASHBOARD_DATA);

    renderWithRouter();

    expect(await screen.findByText('Active Projects')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Active Assignments')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();

    // KPI cards wrapped in links (StatCard renders label text inside a Link)
    expect(screen.getByText('Staffed People')).toBeInTheDocument();
  });

  it('renders weekly trend section on staffing tab', async () => {
    mockedFetchDirectorDashboard.mockResolvedValue(DASHBOARD_DATA);

    renderWithRouter('/dashboard/director#staffing');

    expect(await screen.findByText('8-Week Staffing Trend')).toBeInTheDocument();
  });

  it('renders unit utilisation on overview tab', async () => {
    mockedFetchDirectorDashboard.mockResolvedValue(DASHBOARD_DATA);

    renderWithRouter('/dashboard/director');

    expect(await screen.findByText('Unit Utilisation')).toBeInTheDocument();
    expect(screen.getByText('Engineering')).toBeInTheDocument();
  });

  it('renders FTE trend chart section', async () => {
    mockedFetchDirectorDashboard.mockResolvedValue(DASHBOARD_DATA);

    renderWithRouter('/dashboard/director#trends');

    expect(await screen.findByText('Total FTE by Month (12-month trend)')).toBeInTheDocument();
  });

  it('renders portfolio summary table when projects exist', async () => {
    mockedFetchDirectorDashboard.mockResolvedValue(DASHBOARD_DATA);
    mockedFetchProjectDirectory.mockResolvedValue({
      items: [
        {
          assignmentCount: 5,
          externalLinksCount: 0,
          externalLinksSummary: [],
          id: 'project-alpha',
          name: 'Alpha Initiative',
          projectCode: 'PRJ-001',
          status: 'ACTIVE',
        },
      ],
    });
    mockedFetchProjectHealth.mockResolvedValue({
      evidenceScore: 80,
      grade: 'green',
      projectId: 'project-alpha',
      score: 85,
      staffingScore: 90,
      timelineScore: 80,
    });

    renderWithRouter();

    expect(await screen.findByText('Portfolio Summary')).toBeInTheDocument();
    expect(await screen.findByText('Alpha Initiative')).toBeInTheDocument();
  });

  it('renders cost distribution section when capitalisation data available', async () => {
    mockedFetchDirectorDashboard.mockResolvedValue(DASHBOARD_DATA);
    mockedFetchCapitalisationReport.mockResolvedValue({
      byProject: [
        {
          alert: false,
          capexHours: 100,
          capexPercent: 50,
          opexHours: 100,
          projectId: 'project-alpha',
          projectName: 'Alpha Initiative',
          totalHours: 200,
        },
      ],
      period: { from: '2026-01-01', to: '2026-04-05' },
      periodTrend: [],
      totals: { capexHours: 100, capexPercent: 50, opexHours: 100, totalHours: 200 },
    });

    renderWithRouter();

    expect(await screen.findByText('Cost Distribution by Project')).toBeInTheDocument();
  });

  it('renders utilisation gauge when workload matrix has data', async () => {
    mockedFetchDirectorDashboard.mockResolvedValue(DASHBOARD_DATA);
    mockedFetchWorkloadMatrix.mockResolvedValue({
      people: [
        {
          allocations: [{ allocationPercent: 80, projectId: 'p1', projectName: 'Alpha' }],
          displayName: 'Alice',
          id: 'person-1',
        },
      ],
      projects: [{ id: 'p1', name: 'Alpha', projectCode: 'PRJ-001' }],
    });

    renderWithRouter();

    expect(await screen.findByText('Org-Wide Average Utilisation')).toBeInTheDocument();
  });

  it('shows error state when dashboard fetch fails', async () => {
    mockedFetchDirectorDashboard.mockRejectedValue(new Error('Server error'));

    renderWithRouter();

    expect(await screen.findByText('Server error')).toBeInTheDocument();
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
