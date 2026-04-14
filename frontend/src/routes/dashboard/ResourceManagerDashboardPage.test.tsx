import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { fetchPersonDirectory } from '@/lib/api/person-directory';
import { fetchResourceManagerDashboard } from '@/lib/api/dashboard-resource-manager';
import { fetchProjectDirectory } from '@/lib/api/project-registry';
import { renderRoute } from '@test/render-route';
import { ResourceManagerDashboardPage } from './ResourceManagerDashboardPage';

vi.mock('@/lib/api/person-directory', () => ({
  fetchPersonDirectory: vi.fn(),
}));

vi.mock('@/lib/api/dashboard-resource-manager', () => ({
  fetchResourceManagerDashboard: vi.fn(),
}));

vi.mock('@/lib/api/project-registry', () => ({
  fetchProjectDirectory: vi.fn(),
}));

vi.mock('@/lib/api/staffing-requests', () => ({
  fetchStaffingRequests: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/api/assignments', () => ({
  createAssignment: vi.fn(),
}));

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    principal: { personId: 'rm-person-1', roles: ['resource_manager'] },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

const mockedFetchPersonDirectory = vi.mocked(fetchPersonDirectory);
const mockedFetchResourceManagerDashboard = vi.mocked(fetchResourceManagerDashboard);
const mockedFetchProjectDirectory = vi.mocked(fetchProjectDirectory);

describe('ResourceManagerDashboardPage', () => {
  beforeEach(() => {
    mockedFetchPersonDirectory.mockReset();
    mockedFetchResourceManagerDashboard.mockReset();
    mockedFetchProjectDirectory.mockReset();
    mockedFetchProjectDirectory.mockResolvedValue({ items: [] });
  });

  it('renders resource manager dashboard data', async () => {
    mockedFetchPersonDirectory.mockResolvedValue({
      items: [
        {
          currentAssignmentCount: 0,
          currentLineManager: null,
          currentOrgUnit: { code: 'DEP-ENG', id: 'org-1', name: 'Engineering' },
          displayName: 'Olivia Chen',
          dottedLineManagers: [],
          grade: null,
          id: '11111111-1111-1111-1111-111111111003',
          primaryEmail: 'olivia@example.com',
          lifecycleStatus: 'ACTIVE',
          resourcePoolIds: ['pool-1'],
          resourcePools: [{ id: 'pool-1', name: 'Engineering Pool' }],
          role: null,
        },
      ],
      page: 1,
      pageSize: 100,
      total: 1,
    });

    mockedFetchResourceManagerDashboard.mockResolvedValue({
      allocationIndicators: [
        {
          displayName: 'Ethan Brooks',
          indicator: 'UNDERALLOCATED',
          personId: 'person-1',
          teamId: 'team-1',
          teamName: 'Engineering Pool',
          totalAllocationPercent: 50,
        },
      ],
      asOf: '2025-03-15T00:00:00.000Z',
      dataSources: ['teams', 'assignments'],
      futureAssignmentPipeline: [
        {
          approvalState: 'REQUESTED',
          assignmentId: 'asn-2',
          personDisplayName: 'Mia Lopez',
          personId: 'person-2',
          projectId: 'project-2',
          projectName: 'Atlas ERP Rollout',
          startDate: '2025-05-01T00:00:00.000Z',
        },
      ],
      pendingAssignmentApprovals: [],
      peopleWithoutAssignments: [
        {
          displayName: 'Sophia Kim',
          indicator: 'UNASSIGNED',
          personId: 'person-3',
          teamId: 'team-1',
          teamName: 'Engineering Pool',
          totalAllocationPercent: 0,
        },
      ],
      person: {
        displayName: 'Olivia Chen',
        id: '11111111-1111-1111-1111-111111111003',
        primaryEmail: 'olivia@example.com',
      },
      summary: {
        futureAssignmentPipelineCount: 1,
        managedTeamCount: 1,
        pendingAssignmentApprovalCount: 0,
        peopleWithoutAssignmentsCount: 1,
        totalManagedPeopleCount: 4,
      },
      teamCapacitySummary: [
        {
          activeAssignmentCount: 3,
          activeProjectCount: 2,
          memberCount: 4,
          overallocatedPeopleCount: 0,
          teamId: 'team-1',
          teamName: 'Engineering Pool',
          unassignedPeopleCount: 1,
          underallocatedPeopleCount: 1,
        },
      ],
      teamsInMultipleActiveProjects: [
        {
          activeProjectCount: 2,
          projectNames: ['Atlas ERP Rollout', 'Shared Services Upgrade'],
          teamId: 'team-1',
          teamName: 'Engineering Pool',
        },
      ],
      incomingRequests: [],
    });

    renderWithRouter();

    expect(
      await screen.findByRole('heading', { name: 'Olivia Chen' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Engineering Pool').length).toBeGreaterThan(0);
    expect(screen.getByText('Sophia Kim')).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes('Mia Lopez')),
    ).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes('UNDERALLOCATED')),
    ).toBeInTheDocument();
  });
});

function renderWithRouter() {
  return renderRoute(
    <Routes>
      <Route element={<ResourceManagerDashboardPage />} path="/dashboard/resource-manager" />
    </Routes>,
    {
      initialEntries: ['/dashboard/resource-manager'],
    },
  );
}
