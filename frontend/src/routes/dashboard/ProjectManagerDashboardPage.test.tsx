import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { fetchProjectManagerDashboard } from '@/lib/api/dashboard-project-manager';
import { fetchPendingActions } from '@/lib/api/dashboard-pending-actions';
import { fetchPersonDirectory } from '@/lib/api/person-directory';
import { fetchStaffingRequests } from '@/lib/api/staffing-requests';
import { fetchWorkloadMatrix } from '@/lib/api/workload';
import { renderRoute } from '@test/render-route';
import { ProjectManagerDashboardPage } from './ProjectManagerDashboardPage';

// `vi.restoreAllMocks()` in src/test/setup.ts wipes inline `mockResolvedValue`
// between tests, so declare the fn refs outside the factory and set defaults
// in beforeEach (see memory `feedback-...` — same pattern as EmployeeDirectory).
const fetchProjectManagerDashboardMock = vi.fn();
const fetchPersonDirectoryMock = vi.fn();
const fetchStaffingRequestsMock = vi.fn();
const fetchWorkloadMatrixMock = vi.fn();
const fetchPendingActionsMock = vi.fn();

vi.mock('@/lib/api/dashboard-project-manager', () => ({
  fetchProjectManagerDashboard: (...args: unknown[]) => fetchProjectManagerDashboardMock(...args),
}));
vi.mock('@/lib/api/person-directory', () => ({
  fetchPersonDirectory: (...args: unknown[]) => fetchPersonDirectoryMock(...args),
}));
vi.mock('@/lib/api/staffing-requests', () => ({
  fetchStaffingRequests: (...args: unknown[]) => fetchStaffingRequestsMock(...args),
}));
vi.mock('@/lib/api/workload', () => ({
  fetchWorkloadMatrix: (...args: unknown[]) => fetchWorkloadMatrixMock(...args),
}));
vi.mock('@/lib/api/dashboard-pending-actions', () => ({
  fetchPendingActions: (...args: unknown[]) => fetchPendingActionsMock(...args),
}));

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    principal: { personId: 'pm-person-1', roles: ['project_manager'] },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

// Backwards-compatible aliases so existing test body keeps working.
const mockedFetchProjectManagerDashboard = fetchProjectManagerDashboardMock;
const mockedFetchPersonDirectory = fetchPersonDirectoryMock;
const mockedFetchPendingActions = fetchPendingActionsMock;
// Silence unused-var lints for re-exported names (tests don't reference them
// directly — the factory funnels through to the mock refs above).
void fetchProjectManagerDashboard;
void fetchPersonDirectory;
void fetchPendingActions;
void fetchStaffingRequests;
void fetchWorkloadMatrix;

describe('ProjectManagerDashboardPage', () => {
  beforeEach(() => {
    fetchProjectManagerDashboardMock.mockReset();
    fetchPersonDirectoryMock.mockReset();
    fetchStaffingRequestsMock.mockReset();
    fetchWorkloadMatrixMock.mockReset();
    fetchPendingActionsMock.mockReset();
    fetchStaffingRequestsMock.mockResolvedValue([]);
    fetchWorkloadMatrixMock.mockResolvedValue({ people: [] });
    fetchPendingActionsMock.mockResolvedValue({ items: [], totalCount: 0 });
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
          grade: null,
          id: '11111111-1111-1111-1111-111111111006',
          primaryEmail: 'sophia@example.com',
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
          approvedHours: 32,
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
      projectsWithTimeVariance: [
        {
          detail: 'Approved time exists without an approved staffing match.',
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
        projectsWithTimeVarianceCount: 1,
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

  // BV-B.2 — Timesheet-tile drilldown checkpoint. PM must reach /timesheets/approval
  // in one click from /dashboard/project-manager (Law 1: 3-click rule).
  it('renders the Timesheet Approvals KPI tile pointing at /timesheets/approval with the pending count', async () => {
    mockedFetchPersonDirectory.mockResolvedValue({ items: [], page: 1, pageSize: 100, total: 0 });
    mockedFetchProjectManagerDashboard.mockResolvedValue({
      asOf: '2026-05-31T00:00:00.000Z',
      attentionProjects: [],
      dataSources: ['projects'],
      managedProjects: [],
      person: { displayName: 'Sophia Kim', id: 'pm-person-1', primaryEmail: 'sophia@example.com' },
      projectsWithTimeVariance: [],
      projectsWithStaffingGaps: [],
      recentlyChangedAssignments: [],
      staffingSummary: {
        activeAssignmentCount: 0,
        managedProjectCount: 0,
        projectsWithTimeVarianceCount: 0,
        projectsWithStaffingGapsCount: 0,
      },
      openRequestCount: 0,
      openRequests: [],
    });
    mockedFetchPendingActions.mockResolvedValue({
      items: [
        { kind: 'TIMESHEET', id: 'ts-1', publicId: null, title: 'Week 22', contextLabel: null, ageHours: 3, severity: 'MEDIUM', ctaUrl: '/timesheets/approval' },
        { kind: 'TIMESHEET', id: 'ts-2', publicId: null, title: 'Week 22', contextLabel: null, ageHours: 5, severity: 'LOW', ctaUrl: '/timesheets/approval' },
        { kind: 'STAFFING_REQUEST', id: 'sr-1', publicId: null, title: 'PRJ', contextLabel: null, ageHours: 1, severity: 'LOW', ctaUrl: '/staffing-requests' },
      ],
      totalCount: 3,
    });

    renderWithRouter();

    const tile = await screen.findByTestId('pm-kpi-timesheet-approvals');
    expect(tile).toHaveAttribute('href', '/timesheets/approval');
    // The pending count derives from TIMESHEET-kind items only (2 of 3).
    expect(tile).toHaveTextContent('2');
    expect(tile).toHaveTextContent('Timesheet Approvals');
    expect(tile).toHaveTextContent('pending review');
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
