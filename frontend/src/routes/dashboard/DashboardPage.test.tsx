import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { fetchWorkloadDashboardSummary, fetchWorkloadTrend } from '@/lib/api/workload-dashboard';
import { buildWorkloadDashboardSummary } from '@test/fixtures/dashboard';
import { renderRoute } from '@test/render-route';
import { DashboardPage } from './DashboardPage';

vi.mock('@/lib/api/workload-dashboard', () => ({
  fetchWorkloadDashboardSummary: vi.fn(),
  fetchWorkloadTrend: vi.fn(),
}));

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    principal: { personId: 'person-1', roles: ['admin'] },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

const mockedFetchWorkloadDashboardSummary = vi.mocked(fetchWorkloadDashboardSummary);
const mockedFetchWorkloadTrend = vi.mocked(fetchWorkloadTrend);

describe('DashboardPage', () => {
  beforeEach(() => {
    mockedFetchWorkloadDashboardSummary.mockReset();
    mockedFetchWorkloadTrend.mockReset();
    mockedFetchWorkloadTrend.mockResolvedValue([]);
  });

  it('renders dashboard data and links', async () => {
    mockedFetchWorkloadDashboardSummary.mockResolvedValue(buildWorkloadDashboardSummary());

    renderWithRouter();

    expect(await screen.findByText('Active Projects')).toBeInTheDocument();
    expect(screen.getAllByText('Internal Bench Planning').length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty supporting states', async () => {
    mockedFetchWorkloadDashboardSummary.mockResolvedValue(
      buildWorkloadDashboardSummary({
        peopleWithNoActiveAssignments: [],
        peopleWithNoActiveAssignmentsCount: 0,
        projectsWithEvidenceButNoApprovedAssignment: [],
        projectsWithEvidenceButNoApprovedAssignmentCount: 0,
        projectsWithNoStaff: [],
        projectsWithNoStaffCount: 0,
        totalActiveAssignments: 0,
        totalActiveProjects: 0,
        unassignedActivePeopleCount: 0,
      }),
    );

    renderWithRouter();

    expect(await screen.findByText('System healthy')).toBeInTheDocument();
  });

  it('shows error state', async () => {
    mockedFetchWorkloadDashboardSummary.mockRejectedValue(new Error('Dashboard unavailable'));

    renderWithRouter();

    expect(await screen.findByText('Dashboard unavailable')).toBeInTheDocument();
  });
});

function renderWithRouter() {
  return renderRoute(
    <Routes>
      <Route element={<DashboardPage />} path="/" />
    </Routes>,
  );
}
