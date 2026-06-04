import { fireEvent, screen, waitFor } from '@testing-library/react';
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

// `vi.restoreAllMocks()` in src/test/setup.ts wipes inline `mockResolvedValue`
// between tests, so declare the fn refs outside the factory and set defaults
// in beforeEach (see ProjectManagerDashboardPage.test pattern).
const fetchStaffingRequestsMock = vi.fn();
const createProjectPositionMock = vi.fn();
const transitionProjectPositionFillMock = vi.fn();
const fetchPendingActionsMock = vi.fn();

vi.mock('@/lib/api/staffing-requests', () => ({
  fetchStaffingRequests: (...args: unknown[]) => fetchStaffingRequestsMock(...args),
}));

// LEAN-P2-4: quick-assign now uses the canonical /project-positions flow
// (createProjectPosition + transitionProjectPositionFill to BOOKED).
vi.mock('@/lib/api/project-positions', () => ({
  createProjectPosition: (...args: unknown[]) => createProjectPositionMock(...args),
  transitionProjectPositionFill: (...args: unknown[]) => transitionProjectPositionFillMock(...args),
}));

vi.mock('@/lib/api/dashboard-pending-actions', () => ({
  fetchPendingActions: (...args: unknown[]) => fetchPendingActionsMock(...args),
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
    fetchStaffingRequestsMock.mockReset();
    fetchStaffingRequestsMock.mockResolvedValue([]);
    createProjectPositionMock.mockReset();
    transitionProjectPositionFillMock.mockReset();
    fetchPendingActionsMock.mockReset();
    fetchPendingActionsMock.mockResolvedValue({ items: [], totalCount: 0 });
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
          role: null, hiredAt: null, terminatedAt: null,
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

  // LEAN-P2-4: assert the dashboard quick-assign now writes through the
  // canonical project-positions endpoints rather than the legacy
  // /assignments POST.
  it('quick-assign submits via createProjectPosition + transitionProjectPositionFill(BOOKED)', async () => {
    mockedFetchPersonDirectory.mockResolvedValue({ items: [], page: 1, pageSize: 100, total: 0 });
    mockedFetchProjectDirectory.mockResolvedValue({
      items: [
        {
          id: 'project-7',
          name: 'Quick Assign Test',
          projectCode: 'PRJ-007',
          status: 'ACTIVE',
        } as never,
      ],
    });
    mockedFetchResourceManagerDashboard.mockResolvedValue({
      allocationIndicators: [],
      asOf: '2026-05-31T00:00:00.000Z',
      dataSources: ['teams'],
      futureAssignmentPipeline: [],
      pendingAssignmentApprovals: [],
      peopleWithoutAssignments: [],
      person: { displayName: 'Olivia Chen', id: 'rm-person-1', primaryEmail: 'olivia@example.com' },
      summary: {
        futureAssignmentPipelineCount: 0,
        managedTeamCount: 0,
        pendingAssignmentApprovalCount: 0,
        peopleWithoutAssignmentsCount: 0,
        totalManagedPeopleCount: 0,
      },
      teamCapacitySummary: [],
      teamsInMultipleActiveProjects: [],
      incomingRequests: [],
    });

    createProjectPositionMock.mockResolvedValue({
      id: 'pos-quick-1',
      projectId: 'project-7',
      role: 'Lead Engineer',
      requiredAllocationPercent: 50,
      fillStatus: 'OPEN',
      version: 1,
    });
    transitionProjectPositionFillMock.mockResolvedValue({
      id: 'pos-quick-1',
      projectId: 'project-7',
      role: 'Lead Engineer',
      requiredAllocationPercent: 50,
      fillStatus: 'BOOKED',
      activePersonId: 'person-99',
      activeAllocationPercent: 50,
      version: 2,
    });

    renderWithRouter();

    fireEvent.click(await screen.findByRole('button', { name: /quick assignment/i }));

    fireEvent.change(await screen.findByPlaceholderText('Person UUID'), {
      target: { value: 'person-99' },
    });
    const projectSelect = await screen.findByDisplayValue('Select project...');
    fireEvent.change(projectSelect, { target: { value: 'project-7' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Lead Engineer'), {
      target: { value: 'Lead Engineer' },
    });
    fireEvent.change(screen.getByLabelText(/start date/i), {
      target: { value: '2026-06-10' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create assignment/i }));

    await waitFor(() => {
      expect(createProjectPositionMock).toHaveBeenCalledTimes(1);
    });
    expect(createProjectPositionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project-7',
        role: 'Lead Engineer',
        requiredAllocationPercent: 100,
        startDate: '2026-06-10T00:00:00.000Z',
        endDate: '2026-06-10T00:00:00.000Z',
        openImmediately: true,
        requestedByPersonId: 'rm-person-1',
      }),
    );

    await waitFor(() => {
      expect(transitionProjectPositionFillMock).toHaveBeenCalledTimes(1);
    });
    expect(transitionProjectPositionFillMock).toHaveBeenCalledWith(
      'pos-quick-1',
      expect.objectContaining({
        toStatus: 'BOOKED',
        personId: 'person-99',
        allocationPercent: 100,
        validFrom: '2026-06-10T00:00:00.000Z',
      }),
    );
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
