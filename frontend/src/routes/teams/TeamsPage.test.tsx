import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { fetchPersonDirectory } from '@/lib/api/person-directory';
import {
  createTeam,
  fetchTeamMembers,
  fetchTeams,
  updateTeamMember,
} from '@/lib/api/teams';
import { TeamsPage } from './TeamsPage';

vi.mock('@/lib/api/teams', () => ({
  createTeam: vi.fn(),
  fetchTeamById: vi.fn(),
  fetchTeamMembers: vi.fn(),
  fetchTeams: vi.fn(),
  updateTeamMember: vi.fn(),
}));

vi.mock('@/lib/api/person-directory', () => ({
  fetchPersonDirectory: vi.fn(),
}));

const mockedCreateTeam = vi.mocked(createTeam);
const mockedFetchPersonDirectory = vi.mocked(fetchPersonDirectory);
const mockedFetchTeamMembers = vi.mocked(fetchTeamMembers);
const mockedFetchTeams = vi.mocked(fetchTeams);
const mockedUpdateTeamMember = vi.mocked(updateTeamMember);

describe('TeamsPage', () => {
  beforeEach(() => {
    mockedCreateTeam.mockReset();
    mockedFetchPersonDirectory.mockReset();
    mockedFetchTeamMembers.mockReset();
    mockedFetchTeams.mockReset();
    mockedUpdateTeamMember.mockReset();
  });

  it('creates a team through the management page', async () => {
    mockInitialLoad();
    mockedCreateTeam.mockResolvedValue({
      code: 'TEAM-QA',
      description: 'Quality engineering squad',
      id: 'team-qa',
      memberCount: 0,
      name: 'Quality Engineering Squad',
      orgUnit: null,
    });
    mockedFetchTeams
      .mockResolvedValueOnce(buildTeamsResponse())
      .mockResolvedValueOnce({
        items: [
          ...buildTeamsResponse().items,
          {
            code: 'TEAM-QA',
            description: 'Quality engineering squad',
            id: 'team-qa',
            memberCount: 0,
            name: 'Quality Engineering Squad',
            orgUnit: null,
          },
        ],
      });
    mockedFetchTeamMembers
      .mockResolvedValueOnce(buildMembersResponse())
      .mockResolvedValueOnce({ items: [] });

    const user = userEvent.setup();
    renderWithRouter();

    await screen.findByRole('button', { name: /Platform Delivery Team/i });

    await user.type(screen.getByLabelText('Team Name'), 'Quality Engineering Squad');
    await user.type(screen.getByLabelText('Team Code'), 'TEAM-QA');
    await user.type(screen.getByLabelText('Description'), 'Quality engineering squad');
    await user.click(screen.getByRole('button', { name: 'Create team' }));

    await waitFor(() => {
      expect(mockedCreateTeam).toHaveBeenCalledWith({
        code: 'TEAM-QA',
        description: 'Quality engineering squad',
        name: 'Quality Engineering Squad',
      });
    });

    expect(await screen.findByText('Created team Quality Engineering Squad.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Quality Engineering Squad/i })).toBeInTheDocument();
  });

  it('adds a member to the selected team', async () => {
    mockInitialLoad();
    mockedUpdateTeamMember.mockResolvedValue({
      items: [
        ...buildMembersResponse().items,
        {
          currentAssignmentCount: 0,
          currentOrgUnitName: 'Delivery Operations',
          displayName: 'Mia Lopez',
          id: 'person-2',
          primaryEmail: 'mia.lopez@example.com',
          lifecycleStatus: 'ACTIVE',
        },
      ],
    });
    mockedFetchTeams
      .mockResolvedValueOnce(buildTeamsResponse())
      .mockResolvedValueOnce({
        items: [
          {
            ...buildTeamsResponse().items[0],
            memberCount: 2,
          },
        ],
      });
    mockedFetchTeamMembers.mockResolvedValue(buildMembersResponse());

    const user = userEvent.setup();
    renderWithRouter();

    await screen.findByRole('button', { name: /Platform Delivery Team/i });

    await user.click(screen.getByRole('button', { name: 'Add member' }));

    await waitFor(() => {
      expect(mockedUpdateTeamMember).toHaveBeenCalledWith('team-1', {
        action: 'add',
        personId: 'person-2',
      });
    });

    expect(await screen.findByText('Added Mia Lopez to Platform Delivery Team.')).toBeInTheDocument();
    expect(screen.getByText('Mia Lopez')).toBeInTheDocument();
  });

  it('shows a clear empty state when no teams exist', async () => {
    mockedFetchTeams.mockResolvedValue({ items: [] });
    mockedFetchPersonDirectory.mockResolvedValue({
      items: buildPeopleResponse(),
      page: 1,
      pageSize: 100,
      total: 2,
    });

    renderWithRouter();

    expect(await screen.findByText('No teams')).toBeInTheDocument();
    expect(screen.getByText('No team selected')).toBeInTheDocument();
  });
});

function mockInitialLoad(): void {
  mockedFetchTeams.mockResolvedValue(buildTeamsResponse());
  mockedFetchTeamMembers.mockResolvedValue(buildMembersResponse());
  mockedFetchPersonDirectory.mockResolvedValue({
    items: buildPeopleResponse(),
    page: 1,
    pageSize: 100,
    total: 2,
  });
}

function buildTeamsResponse() {
  return {
    items: [
      {
        code: 'TEAM-DELIVERY',
        description: 'Cross-functional delivery team.',
        id: 'team-1',
        memberCount: 1,
        name: 'Platform Delivery Team',
        orgUnit: {
          code: 'DEL-OPS',
          id: 'org-1',
          name: 'Delivery Operations',
        },
      },
    ],
  };
}

function buildMembersResponse() {
  return {
    items: [
      {
        currentAssignmentCount: 1,
        currentOrgUnitName: 'Delivery Operations',
        displayName: 'Ethan Brooks',
        id: 'person-1',
        primaryEmail: 'ethan.brooks@example.com',
        lifecycleStatus: 'ACTIVE',
      },
    ],
  };
}

function buildPeopleResponse() {
  return [
    {
      currentAssignmentCount: 1,
      currentLineManager: null,
      currentOrgUnit: {
        code: 'DEL-OPS',
        id: 'org-1',
        name: 'Delivery Operations',
      },
      displayName: 'Ethan Brooks',
      dottedLineManagers: [],
      grade: null,
      id: 'person-1',
      primaryEmail: 'ethan.brooks@example.com',
      lifecycleStatus: 'ACTIVE',
      resourcePoolIds: ['team-1'],
      resourcePools: [],
      role: null,
    },
    {
      currentAssignmentCount: 0,
      currentLineManager: null,
      currentOrgUnit: {
        code: 'DEL-OPS',
        id: 'org-1',
        name: 'Delivery Operations',
      },
      displayName: 'Mia Lopez',
      dottedLineManagers: [],
      grade: null,
      id: 'person-2',
      primaryEmail: 'mia.lopez@example.com',
      lifecycleStatus: 'ACTIVE',
      resourcePoolIds: [],
      resourcePools: [],
      role: null,
    },
  ];
}

function renderWithRouter(): void {
  render(
    <MemoryRouter initialEntries={['/teams']}>
      <Routes>
        <Route element={<TeamsPage />} path="/teams" />
      </Routes>
    </MemoryRouter>,
  );
}
