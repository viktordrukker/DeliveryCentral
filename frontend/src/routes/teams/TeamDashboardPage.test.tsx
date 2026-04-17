import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { ApiError } from '@/lib/api/http-client';
import { fetchTeamDashboard } from '@/lib/api/teams';
import { TeamDashboardPage } from './TeamDashboardPage';

vi.mock('@/lib/api/teams', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/teams')>('@/lib/api/teams');

  return {
    ...actual,
    fetchTeamDashboard: vi.fn(),
  };
});

const mockedFetchTeamDashboard = vi.mocked(fetchTeamDashboard);

describe('TeamDashboardPage', () => {
  beforeEach(() => {
    mockedFetchTeamDashboard.mockReset();
  });

  it('renders dashboard data', async () => {
    mockedFetchTeamDashboard.mockResolvedValue({
      activeAssignmentsCount: 5,
      anomalySummary: {
        assignmentWithoutEvidenceCount: 2,
        evidenceAfterAssignmentEndCount: 0,
        evidenceWithoutAssignmentCount: 1,
        openExceptionCount: 3,
        projectClosureConflictCount: 0,
        staleApprovalCount: 0,
      },
      crossProjectSpread: {
        maxProjectsPerMember: 2,
        membersOnMultipleProjects: [
          {
            activeProjectCount: 2,
            displayName: 'Ava Rowe',
            id: 'person-1',
          },
        ],
        membersOnMultipleProjectsCount: 1,
      },
      peopleWithEvidenceAlignmentGaps: [
        {
          currentAssignmentCount: 1,
          currentOrgUnitName: 'Delivery Operations',
          displayName: 'Ava Rowe',
          id: 'person-1',
          primaryEmail: 'ava.rowe@example.com',
        },
      ],
      peopleWithNoAssignments: [
        {
          currentAssignmentCount: 0,
          currentOrgUnitName: 'Delivery Operations',
          displayName: 'Mia Lopez',
          id: 'person-2',
          primaryEmail: 'mia.lopez@example.com',
        },
      ],
      projectCount: 1,
      projectsInvolved: [
        {
          id: 'prj-1',
          name: 'Atlas ERP Rollout',
        },
      ],
      team: {
        code: 'TEAM-DELIVERY',
        description: 'Cross-functional delivery team.',
        id: 'team-1',
        memberCount: 6,
        name: 'Platform Delivery Team',
        orgUnit: {
          code: 'DEL-OPS',
          id: 'org-1',
          name: 'Delivery Operations',
        },
      },
      teamMemberCount: 6,
    });

    renderWithRouter('/teams/team-1/dashboard');

    expect(
      await screen.findByRole('heading', { name: 'Platform Delivery Team' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Atlas ERP Rollout')).toBeInTheDocument();
    expect(screen.getByText('Mia Lopez')).toBeInTheDocument();
    expect(screen.getAllByText('Ava Rowe')).toHaveLength(1);
    expect(screen.getByText('Open exceptions')).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('Cross-Project Members'))).toBeInTheDocument();
    const goLinks = screen.getAllByRole('link', { name: 'Go' });
    expect(goLinks.length).toBeGreaterThanOrEqual(1);
    expect(goLinks[0]).toHaveAttribute('href', '/projects/prj-1');
  });

  it('shows empty state sections clearly', async () => {
    mockedFetchTeamDashboard.mockResolvedValue({
      activeAssignmentsCount: 0,
      anomalySummary: {
        assignmentWithoutEvidenceCount: 0,
        evidenceAfterAssignmentEndCount: 0,
        evidenceWithoutAssignmentCount: 0,
        openExceptionCount: 0,
        projectClosureConflictCount: 0,
        staleApprovalCount: 0,
      },
      crossProjectSpread: {
        maxProjectsPerMember: 0,
        membersOnMultipleProjects: [],
        membersOnMultipleProjectsCount: 0,
      },
      peopleWithEvidenceAlignmentGaps: [],
      peopleWithNoAssignments: [],
      projectCount: 0,
      projectsInvolved: [],
      team: {
        code: 'TEAM-DELIVERY',
        description: null,
        id: 'team-1',
        memberCount: 0,
        name: 'Platform Delivery Team',
        orgUnit: null,
      },
      teamMemberCount: 0,
    });

    renderWithRouter('/teams/team-1/dashboard');

    expect(await screen.findByText('No projects')).toBeInTheDocument();
    expect(screen.getByText('No unassigned people')).toBeInTheDocument();
    expect(screen.getByText('No cross-project spread')).toBeInTheDocument();
  });

  it('shows missing team state', async () => {
    mockedFetchTeamDashboard.mockRejectedValue(
      new ApiError('Request failed for /teams/team-404/dashboard', 404),
    );

    renderWithRouter('/teams/team-404/dashboard');

    expect(await screen.findByText('Team not found')).toBeInTheDocument();
  });

  it('shows error state', async () => {
    mockedFetchTeamDashboard.mockRejectedValue(new Error('Team dashboard unavailable'));

    renderWithRouter('/teams/team-1/dashboard');

    expect(await screen.findByText('Team dashboard unavailable')).toBeInTheDocument();
  });
});

function renderWithRouter(initialEntry: string): void {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<TeamDashboardPage />} path="/teams/:id/dashboard" />
      </Routes>
    </MemoryRouter>,
  );
}
