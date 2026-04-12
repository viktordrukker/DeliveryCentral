import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { fetchProjectManagerDashboard } from '@/lib/api/dashboard-project-manager';
import { fetchPersonDirectory } from '@/lib/api/person-directory';
import { renderRoute } from '@test/render-route';
import { ProjectManagerDashboardPage } from './ProjectManagerDashboardPage';

vi.mock('@/lib/api/dashboard-project-manager', () => ({
  fetchProjectManagerDashboard: vi.fn(),
}));

vi.mock('@/lib/api/person-directory', () => ({
  fetchPersonDirectory: vi.fn(),
}));

vi.mock('@/lib/api/staffing-requests', () => ({
  fetchStaffingRequests: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/api/workload', () => ({
  fetchWorkloadMatrix: vi.fn().mockResolvedValue({ people: [] }),
}));

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    principal: { personId: 'pm-person-1', roles: ['project_manager'] },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

const mockedFetchProjectManagerDashboard = vi.mocked(fetchProjectManagerDashboard);
const mockedFetchPersonDirectory = vi.mocked(fetchPersonDirectory);

describe('ProjectManagerDashboardPage', () => {
  beforeEach(() => {
    mockedFetchProjectManagerDashboard.mockReset();
    mockedFetchPersonDirectory.mockReset();
  });

  it('renders project manager dashboard data', async () => {
    mockedFetchPersonDirectory.mockResolvedValue({
      items: [
        {
          currentAssignmentCount: 0,
          currentLineManager: null,
          currentOrgUnit: { code: 'DEP-ENG', id: 'org-1', name: 'Engineering' },
          displayName: 'Sophia Kim',
          dottedLineManagers: [],
          id: '11111111-1111-1111-1111-111111111006',
          primaryEmail: 'sophia@example.com',
          lifecycleStatus: 'ACTIVE',
          resourcePoolIds: [],
          resourcePools: [],
        },
      ],
      page: 1,
      pageSize: 100,
      total: 1,
    });

    mockedFetchProjectManagerDashboard.mockResolvedValue({
      asOf: '2025-03-15T00:00:00.000Z',
      attentionProjects: [
        {
          detail: 'Project is within 30 days of planned closure.',
          projectCode: 'PRJ-103',
          projectId: 'project-3',
          projectName: 'Core API Modernization',
          reason: 'NEARING_CLOSURE',
        },
      ],
      dataSources: ['projects', 'assignments', 'planned_vs_actual'],
      managedProjects: [
        {
          evidenceCount: 4,
          id: 'project-1',
          name: 'Atlas ERP Rollout',
          plannedEndDate: '2025-05-31T00:00:00.000Z',
          plannedStartDate: '2025-01-01T00:00:00.000Z',
          projectCode: 'PRJ-102',
          staffingCount: 2,
          status: 'ACTIVE',
        },
      ],
      person: {
        displayName: 'Sophia Kim',
        id: '11111111-1111-1111-1111-111111111006',
        primaryEmail: 'sophia@example.com',
      },
      projectsWithEvidenceAnomalies: [
        {
          detail: 'Observed work exists without an approved staffing match.',
          projectCode: 'PRJ-105',
          projectId: 'project-5',
          projectName: 'Shared Services Upgrade',
          reason: 'EVIDENCE_WITHOUT_APPROVED_ASSIGNMENT',
        },
      ],
      projectsWithStaffingGaps: [
        {
          detail: 'No active staffing coverage found.',
          projectCode: 'PRJ-104',
          projectId: 'project-4',
          projectName: 'Internal Bench Planning',
          reason: 'NO_ACTIVE_STAFFING',
        },
      ],
      recentlyChangedAssignments: [
        {
          assignmentId: 'asn-1',
          changeType: 'APPROVED',
          changedAt: '2025-03-14T00:00:00.000Z',
          personDisplayName: 'Ethan Brooks',
          personId: 'person-1',
          projectId: 'project-1',
          projectName: 'Atlas ERP Rollout',
        },
      ],
      staffingSummary: {
        activeAssignmentCount: 3,
        managedProjectCount: 1,
        projectsWithEvidenceAnomaliesCount: 1,
        projectsWithStaffingGapsCount: 1,
      },
      openRequestCount: 0,
      openRequests: [],
    });

    renderWithRouter();

    expect(
      await screen.findByRole('heading', { name: 'Sophia Kim' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Atlas ERP Rollout').length).toBeGreaterThan(0);
  });
});

function renderWithRouter() {
  return renderRoute(
    <Routes>
      <Route element={<ProjectManagerDashboardPage />} path="/dashboard/project-manager" />
    </Routes>,
    {
      initialEntries: ['/dashboard/project-manager'],
    },
  );
}
