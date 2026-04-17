import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { fetchProjectDashboard } from '@/lib/api/project-dashboard';
import { fetchProjectById } from '@/lib/api/project-registry';
import { ProjectDashboardPage } from './ProjectDashboardPage';

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    principal: { personId: 'test-pm', roles: ['project_manager'] },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('@/lib/api/project-registry', () => ({
  fetchProjectById: vi.fn(),
}));

vi.mock('@/lib/api/project-dashboard', () => ({
  fetchProjectDashboard: vi.fn(),
}));

const mockedFetchProjectById = vi.mocked(fetchProjectById);
const mockedFetchProjectDashboard = vi.mocked(fetchProjectDashboard);

describe('ProjectDashboardPage', () => {
  beforeEach(() => {
    mockedFetchProjectById.mockReset();
    mockedFetchProjectDashboard.mockReset();
  });

  it('renders aggregated project dashboard data', async () => {
    mockResponses();

    renderWithRouter('/projects/prj-1/dashboard');

    expect((await screen.findAllByText('Atlas ERP Rollout')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Assigned People').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ethan Brooks').length).toBeGreaterThan(0);
    expect(screen.getByText('Activity by Week (12 wk)')).toBeInTheDocument();
    expect(screen.getByText('8h')).toBeInTheDocument();
  });

  it('shows empty project sections clearly', async () => {
    mockResponses({
      dashboard: {
        allocationByPerson: [],
        asOf: '2026-03-30T00:00:00.000Z',
        assignments: [],
        evidenceByWeek: [],
        project: {
          description: null,
          endsOn: null,
          id: 'prj-1',
          name: 'Atlas ERP Rollout',
          projectCode: 'PRJ-102',
          projectManagerId: null,
          startsOn: null,
          status: 'ACTIVE',
        },
        staffingSummary: { activeAssignmentCount: 0, totalAssignments: 0, totalEvidenceHoursLast30d: 0 },
      },
    });

    renderWithRouter('/projects/prj-1/dashboard');

    expect(await screen.findByText('No assignments')).toBeInTheDocument();
    expect(screen.getByText('No activity data')).toBeInTheDocument();
    expect(screen.getByText('No allocations')).toBeInTheDocument();
  });

  it('keeps the project dashboard focused on staffing and activity', async () => {
    mockResponses();

    renderWithRouter('/projects/prj-1/dashboard');

    expect(await screen.findByText('Allocation by Person')).toBeInTheDocument();
    expect(screen.queryByText('Observed Work Summary')).not.toBeInTheDocument();
    expect(screen.queryByText('Anomalies')).not.toBeInTheDocument();
  });
});

const defaultDashboard: Awaited<ReturnType<typeof fetchProjectDashboard>> = {
  allocationByPerson: [
    { allocationPercent: 100, displayName: 'Ethan Brooks', personId: 'person-1' },
  ],
  asOf: '2026-03-30T00:00:00.000Z',
  assignments: [
    {
      allocationPercent: 100,
      id: 'asn-1',
      personDisplayName: 'Ethan Brooks',
      personId: 'person-1',
      staffingRole: 'Lead Engineer',
      status: 'APPROVED',
      validFrom: '2026-03-01',
      validTo: null,
    },
  ],
  evidenceByWeek: [
    { totalHours: 8, weekStarting: '2026-03-16' },
  ],
  project: {
    description: 'Jira-linked ERP rollout program.',
    endsOn: null,
    id: 'prj-1',
    name: 'Atlas ERP Rollout',
    projectCode: 'PRJ-102',
    projectManagerId: null,
    startsOn: '2026-03-01',
    status: 'ACTIVE',
  },
  staffingSummary: { activeAssignmentCount: 1, totalAssignments: 1, totalEvidenceHoursLast30d: 24 },
};

function mockResponses(
  overrides: {
    dashboard?: Awaited<ReturnType<typeof fetchProjectDashboard>>;
    project?: Awaited<ReturnType<typeof fetchProjectById>>;
  } = {},
): void {
  mockedFetchProjectById.mockResolvedValue(
    overrides.project ?? {
      assignmentCount: 1,
      description: 'Jira-linked ERP rollout program.',
      externalLinks: [],
      externalLinksCount: 0,
      externalLinksSummary: [],
      id: 'prj-1',
      name: 'Atlas ERP Rollout',
      plannedEndDate: null,
      projectCode: 'PRJ-102',
      projectManagerId: null,
      projectManagerDisplayName: null,
      startDate: null,
      status: 'ACTIVE',
    },
  );
  mockedFetchProjectDashboard.mockResolvedValue(overrides.dashboard ?? defaultDashboard);
}

function renderWithRouter(initialEntry: string): void {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<ProjectDashboardPage />} path="/projects/:id/dashboard" />
      </Routes>
    </MemoryRouter>,
  );
}
