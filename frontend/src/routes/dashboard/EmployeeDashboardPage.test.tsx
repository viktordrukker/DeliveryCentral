import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { fetchEmployeeDashboard } from '@/lib/api/dashboard-employee';
import { fetchPersonDirectory } from '@/lib/api/person-directory';
import { fetchPulseHistory } from '@/lib/api/pulse';
import { renderRoute } from '@test/render-route';
import { EmployeeDashboardPage } from './EmployeeDashboardPage';

vi.mock('@/lib/api/dashboard-employee', () => ({
  fetchEmployeeDashboard: vi.fn(),
}));

vi.mock('@/lib/api/person-directory', () => ({
  fetchPersonDirectory: vi.fn(),
}));

vi.mock('@/lib/api/pulse', () => ({
  fetchPulseHistory: vi.fn(),
  submitPulse: vi.fn(),
  fetchPerson360: vi.fn(),
  fetchMoodHeatmap: vi.fn(),
}));

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    principal: { personId: '11111111-1111-1111-1111-111111111008', roles: ['employee'] },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

const mockedFetchEmployeeDashboard = vi.mocked(fetchEmployeeDashboard);
const mockedFetchPersonDirectory = vi.mocked(fetchPersonDirectory);
const mockedFetchPulseHistory = vi.mocked(fetchPulseHistory);

describe('EmployeeDashboardPage', () => {
  beforeEach(() => {
    mockedFetchEmployeeDashboard.mockReset();
    mockedFetchPersonDirectory.mockReset();
    mockedFetchPulseHistory.mockReset();
    mockedFetchPulseHistory.mockResolvedValue({ entries: [], frequency: 'weekly' });
  });

  it('renders employee dashboard data', async () => {
    mockedFetchPersonDirectory.mockResolvedValue({
      items: [
        {
          currentAssignmentCount: 1,
          currentLineManager: { displayName: 'Sophia Kim', id: 'mgr-1' },
          currentOrgUnit: { code: 'DEP-APP', id: 'org-1', name: 'Application Engineering' },
          displayName: 'Ethan Brooks',
          dottedLineManagers: [],
          grade: null,
          id: '11111111-1111-1111-1111-111111111008',
          primaryEmail: 'ethan@example.com',
          lifecycleStatus: 'ACTIVE',
          resourcePoolIds: ['pool-1'],
          resourcePools: [],
          role: null,
        },
      ],
      page: 1,
      pageSize: 100,
      total: 1,
    });

    mockedFetchEmployeeDashboard.mockResolvedValue({
      asOf: '2025-03-15T00:00:00.000Z',
      currentAssignments: [
        {
          allocationPercent: 50,
          approvalState: 'APPROVED',
          endDate: '2025-04-30T23:59:59.999Z',
          id: 'asn-1',
          person: { displayName: 'Ethan Brooks', id: '11111111-1111-1111-1111-111111111008' },
          project: { displayName: 'Atlas ERP Rollout', id: 'project-1' },
          staffingRole: 'Lead Engineer',
          startDate: '2025-02-01T00:00:00.000Z',
        },
      ],
      currentWorkloadSummary: {
        activeAssignmentCount: 1,
        futureAssignmentCount: 1,
        isOverallocated: false,
        pendingSelfWorkflowItemCount: 0,
        totalAllocationPercent: 50,
      },
      dataSources: ['person_directory', 'assignments', 'work_evidence'],
      futureAssignments: [
        {
          allocationPercent: 25,
          approvalState: 'REQUESTED',
          endDate: null,
          id: 'asn-2',
          person: { displayName: 'Ethan Brooks', id: '11111111-1111-1111-1111-111111111008' },
          project: { displayName: 'Internal Bench Planning', id: 'project-2' },
          staffingRole: 'Advisor',
          startDate: '2025-05-01T00:00:00.000Z',
        },
      ],
      notificationsSummary: {
        note: 'Employee notification inbox summary is not enabled yet.',
        pendingCount: 0,
        status: 'PLACEHOLDER',
      },
      pendingWorkflowItems: {
        itemCount: 0,
        items: [],
      },
      person: {
        currentLineManager: { displayName: 'Sophia Kim', id: 'mgr-1' },
        currentOrgUnit: { code: 'DEP-APP', id: 'org-1', name: 'Application Engineering' },
        displayName: 'Ethan Brooks',
        id: '11111111-1111-1111-1111-111111111008',
        primaryEmail: 'ethan@example.com',
      },
      recentWorkEvidenceSummary: {
        lastActivityDate: '2025-03-10T18:00:00.000Z',
        recentEntryCount: 1,
        recentItems: [
          {
            activityDate: '2025-03-10T00:00:00.000Z',
            effortHours: 3,
            id: 'we-1',
            personId: '11111111-1111-1111-1111-111111111008',
            projectId: 'project-1',
            recordedAt: '2025-03-10T18:00:00.000Z',
            sourceRecordKey: 'TS-1',
            sourceType: 'TIMESHEET',
            summary: 'Incident support work.',
          },
        ],
        sourceTypes: ['TIMESHEET'],
        totalEffortHours: 3,
      },
    });

    renderWithRouter();

    expect(await screen.findByRole('heading', { name: 'Ethan Brooks' })).toBeInTheDocument();
    expect(screen.getByText('Atlas ERP Rollout')).toBeInTheDocument();
    expect(screen.getByText('Internal Bench Planning')).toBeInTheDocument();
    expect(screen.getAllByText('50%').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Incident support work.')).toBeInTheDocument();
    // Pulse widget is embedded
    expect(await screen.findByTestId('pulse-widget')).toBeInTheDocument();
  });
});

function renderWithRouter() {
  return renderRoute(
    <Routes>
      <Route element={<EmployeeDashboardPage />} path="/dashboard/employee" />
    </Routes>,
    {
      initialEntries: ['/dashboard/employee'],
    },
  );
}
