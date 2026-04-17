import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { fetchHrManagerDashboard } from '@/lib/api/dashboard-hr-manager';
import { fetchPersonDirectory } from '@/lib/api/person-directory';
import { fetchMoodHeatmap } from '@/lib/api/pulse';
import { fetchResourcePools } from '@/lib/api/resource-pools';
import { renderRoute } from '@test/render-route';
import { HrDashboardPage } from './HrDashboardPage';

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    principal: { personId: '11111111-1111-1111-1111-111111111005', roles: ['hr_manager'] },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('@/lib/api/dashboard-hr-manager', () => ({
  fetchHrManagerDashboard: vi.fn(),
}));

vi.mock('@/lib/api/person-directory', () => ({
  fetchPersonDirectory: vi.fn(),
}));

vi.mock('@/lib/api/pulse', () => ({
  fetchMoodHeatmap: vi.fn(),
  fetchPulseHistory: vi.fn(),
  submitPulse: vi.fn(),
  fetchPerson360: vi.fn(),
}));

vi.mock('@/lib/api/resource-pools', () => ({
  fetchResourcePools: vi.fn(),
}));

vi.mock('@/lib/api/cases', () => ({
  fetchCases: vi.fn().mockResolvedValue({ items: [] }),
}));

const mockedFetchHrManagerDashboard = vi.mocked(fetchHrManagerDashboard);
const mockedFetchPersonDirectory = vi.mocked(fetchPersonDirectory);
const mockedFetchMoodHeatmap = vi.mocked(fetchMoodHeatmap);
const mockedFetchResourcePools = vi.mocked(fetchResourcePools);

describe('HrDashboardPage', () => {
  beforeEach(() => {
    mockedFetchHrManagerDashboard.mockReset();
    mockedFetchPersonDirectory.mockReset();
    mockedFetchMoodHeatmap.mockReset();
    mockedFetchResourcePools.mockReset();

    mockedFetchMoodHeatmap.mockResolvedValue({
      people: [
        {
          id: 'p-1',
          displayName: 'Ethan Brooks',
          weeklyMoods: [{ weekStart: '2026-03-30', mood: 4 }],
        },
      ],
      weeks: ['2026-03-30'],
      teamAverages: [{ weekStart: '2026-03-30', average: 4 }],
    });
    mockedFetchResourcePools.mockResolvedValue({ items: [] });
  });

  it('renders HR dashboard data', async () => {
    const user = userEvent.setup();

    mockedFetchPersonDirectory.mockResolvedValue({
      items: [
        {
          currentAssignmentCount: 0,
          currentLineManager: null,
          currentOrgUnit: { code: 'DEP-HR', id: 'org-hr', name: 'People Operations' },
          displayName: 'Harper Ali',
          dottedLineManagers: [],
          grade: null,
          id: '11111111-1111-1111-1111-111111111005',
          primaryEmail: 'harper@example.com',
          lifecycleStatus: 'ACTIVE',
          resourcePoolIds: [],
          resourcePools: [],
          role: null, hiredAt: null, terminatedAt: null,
        },
      ],
      page: 1,
      pageSize: 100,
      total: 1,
    });

    mockedFetchHrManagerDashboard.mockResolvedValue({
      asOf: '2025-03-15T00:00:00.000Z',
      dataSources: ['people', 'org_directory', 'business_audit'],
      employeesWithoutManager: [
        {
          displayName: 'Mia Lopez',
          personId: 'person-2',
          primaryEmail: 'mia@example.com',
          reason: 'No current solid-line manager',
        },
      ],
      employeesWithoutOrgUnit: [],
      gradeDistribution: [
        {
          count: 3,
          key: 'g7',
          label: 'G7',
        },
      ],
      headcountSummary: {
        activeHeadcount: 8,
        inactiveHeadcount: 1,
        totalHeadcount: 9,
      },
      orgDistribution: [
        {
          count: 4,
          key: 'app-eng',
          label: 'Application Engineering',
        },
      ],
      person: {
        displayName: 'Harper Ali',
        id: '11111111-1111-1111-1111-111111111005',
        primaryEmail: 'harper@example.com',
      },
      recentDeactivationActivity: [
        {
          activityType: 'EMPLOYEE_DEACTIVATED',
          displayName: 'Zoe Turner',
          occurredAt: '2025-03-10T00:00:00.000Z',
          personId: 'person-9',
        },
      ],
      recentJoinerActivity: [
        {
          activityType: 'EMPLOYEE_CREATED',
          displayName: 'Nadia Park',
          occurredAt: '2025-03-12T00:00:00.000Z',
          personId: 'person-10',
        },
      ],
      roleDistribution: [
        {
          count: 2,
          key: 'engineering-manager',
          label: 'Engineering Manager',
        },
      ],
      atRiskEmployees: [],
    });

    renderWithRouter();

    // Heading and headcount KPI are visible in Headcount tab (default)
    expect(
      await screen.findByRole('heading', { name: 'Harper Ali' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('9').length).toBeGreaterThan(0);

    // Organization tab: Application Engineering
    await user.click(screen.getByRole('tab', { name: 'Organization' }));
    expect(screen.getByText('Application Engineering')).toBeInTheDocument();

    // Roles tab: role and grade distribution
    await user.click(screen.getByRole('tab', { name: 'Roles' }));
    expect(screen.getByText('Engineering Manager')).toBeInTheDocument();
    expect(screen.getByText('G7')).toBeInTheDocument();

    // Wellbeing tab: mood heatmap
    await user.click(screen.getByRole('tab', { name: 'Wellbeing' }));
    expect(await screen.findByTestId('mood-heatmap')).toBeInTheDocument();
  });
});

function renderWithRouter() {
  return renderRoute(
    <Routes>
      <Route element={<HrDashboardPage />} path="/dashboard/hr" />
    </Routes>,
    {
      initialEntries: ['/dashboard/hr'],
    },
  );
}
