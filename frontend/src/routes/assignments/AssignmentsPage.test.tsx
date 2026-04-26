import { screen, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { fetchStaffingDesk } from '@/lib/api/staffing-desk';
import type { StaffingDeskRow, StaffingDeskResponse } from '@/lib/api/staffing-desk';
import { renderRoute } from '@test/render-route';
import { AssignmentsPage } from './AssignmentsPage';

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    principal: { personId: 'person-1', roles: ['project_manager'] },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('@/lib/api/staffing-desk', () => ({
  fetchStaffingDesk: vi.fn(),
}));

const mockedFetch = vi.mocked(fetchStaffingDesk);

function buildRow(overrides: Partial<StaffingDeskRow>): StaffingDeskRow {
  return {
    id: 'row-1',
    kind: 'assignment',
    projectId: 'proj-1',
    projectName: 'Atlas ERP',
    role: 'Lead Engineer',
    allocationPercent: 100,
    startDate: '2025-04-01T00:00:00.000Z',
    endDate: null,
    status: 'ASSIGNED',
    statusGroup: 'active',
    createdAt: '2025-03-10T00:00:00.000Z',
    priority: null,
    personId: 'person-1',
    personName: 'Ethan Brooks',
    assignmentCode: 'ASN-001',
    personAssignments: [],
    personGrade: null,
    personRole: null,
    personEmail: null,
    personOrgUnit: null,
    personManager: null,
    personPool: null,
    personSkills: [],
    personEmploymentStatus: 'ACTIVE',
    headcountRequired: null,
    headcountFulfilled: null,
    skills: [],
    requestedByName: null,
    summary: null,
    ...overrides,
  };
}

function buildResponse(items: StaffingDeskRow[]): StaffingDeskResponse {
  return {
    items,
    page: 1,
    pageSize: 50,
    totalCount: items.length,
    kpis: { activeAssignments: 0, openRequests: 0, avgAllocationPercent: 0, overallocatedPeople: 0 },
    supplyDemand: { totalPeople: 0, availableFte: 0, benchCount: 0, totalHeadcountRequired: 0, headcountFulfilled: 0, headcountOpen: 0, gapHc: 0, fillRatePercent: 100, avgDaysToFulfil: 0 },
  };
}

describe('AssignmentsPage', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    window.localStorage.clear();
  });

  it('renders both tabs with correct counts', async () => {
    mockedFetch.mockResolvedValue(buildResponse([
      buildRow({ id: 'a1', kind: 'assignment', status: 'ASSIGNED' }),
      buildRow({ id: 'a2', kind: 'assignment', status: 'PROPOSED' }),
      buildRow({ id: 'r1', kind: 'request', status: 'OPEN', personId: null, personName: null }),
    ]));

    renderWithRouter();

    const assignmentsTab = await screen.findByTestId('tab-assignments');
    expect(assignmentsTab).toHaveTextContent('Assignments (2)');

    const positionsTab = screen.getByTestId('tab-positions');
    expect(positionsTab).toHaveTextContent('Positions (1)');
  });

  it('shows Next Step column for assignments', async () => {
    mockedFetch.mockResolvedValue(buildResponse([
      buildRow({ id: 'a1', status: 'PROPOSED' }),
      buildRow({ id: 'a2', status: 'ASSIGNED' }),
    ]));

    renderWithRouter();

    expect(await screen.findByText(/Pending approval/)).toBeInTheDocument();
    expect(screen.getByText(/In progress/)).toBeInTheDocument();
  });

  it('shows Next Step column for positions', async () => {
    mockedFetch.mockResolvedValue(buildResponse([
      buildRow({ id: 'r1', kind: 'request', status: 'OPEN', personId: null, personName: null }),
      buildRow({ id: 'r2', kind: 'request', status: 'IN_REVIEW', personId: null, personName: null }),
    ]));

    renderWithRouter('/assignments?tab=positions');

    expect(await screen.findByText(/Review candidates/)).toBeInTheDocument();
    expect(screen.getByText(/Assign person/)).toBeInTheDocument();
  });

  it('navigates to assignment detail on row click', async () => {
    mockedFetch.mockResolvedValue(buildResponse([
      buildRow({ id: 'assignment-123', status: 'ASSIGNED', personName: 'Ethan Brooks' }),
    ]));

    const { user } = renderWithRouter();

    await screen.findByText('Ethan Brooks');
    const table = screen.getByTestId('workflow-table');
    const row = within(table).getByText('Ethan Brooks').closest('tr')!;
    await user.click(row);

    expect(await screen.findByText('Assignment Detail View')).toBeInTheDocument();
  });

  it('shows empty state when no data', async () => {
    mockedFetch.mockResolvedValue(buildResponse([]));

    renderWithRouter();

    expect(await screen.findByText('Nothing here yet')).toBeInTheDocument();
  });

  it('shows error state on API failure', async () => {
    mockedFetch.mockRejectedValue(new Error('Network error'));

    renderWithRouter();

    expect(await screen.findByText('Network error')).toBeInTheDocument();
  });
});

function renderWithRouter(initialPath = '/assignments') {
  return renderRoute(
    <Routes>
      <Route element={<AssignmentsPage />} path="/assignments" />
      <Route element={<div>Assignment Detail View</div>} path="/assignments/:id" />
      <Route element={<div>Position Detail View</div>} path="/staffing-requests/:id" />
    </Routes>,
    {
      initialEntries: [initialPath],
    },
  );
}
