import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { fetchManagerScope } from '@/lib/api/manager-scope';
import { fetchPersonDirectoryById } from '@/lib/api/person-directory';
import { ApiError } from '@/lib/api/http-client';
import { ManagerScopePage } from './ManagerScopePage';

vi.mock('@/lib/api/manager-scope', () => ({
  fetchManagerScope: vi.fn(),
}));

vi.mock('@/lib/api/person-directory', () => ({
  fetchPersonDirectoryById: vi.fn(),
}));

const mockedFetchManagerScope = vi.mocked(fetchManagerScope);
const mockedFetchPersonDirectoryById = vi.mocked(fetchPersonDirectoryById);

describe('ManagerScopePage', () => {
  beforeEach(() => {
    mockedFetchManagerScope.mockReset();
    mockedFetchPersonDirectoryById.mockReset();
  });

  it('renders manager scope data', async () => {
    mockedFetchPersonDirectoryById.mockResolvedValue({
      currentAssignmentCount: 1,
      currentLineManager: { displayName: 'Ava Rowe', id: 'mgr-top' },
      currentOrgUnit: { code: 'DEP-APP', id: 'org-1', name: 'Application Engineering' },
      displayName: 'Sophia Kim',
      dottedLineManagers: [],
      grade: null,
      id: 'mgr-1',
      primaryEmail: 'sophia@example.com',
      lifecycleStatus: 'ACTIVE',
      resourcePoolIds: ['pool-1'],
      resourcePools: [],
      role: null, hiredAt: null, terminatedAt: null,
    });

    mockedFetchManagerScope.mockResolvedValue({
      directReports: [
        {
          currentAssignmentCount: 2,
          currentLineManager: { displayName: 'Sophia Kim', id: 'mgr-1' },
          currentOrgUnit: { code: 'DEP-APP', id: 'org-1', name: 'Application Engineering' },
          displayName: 'Ethan Brooks',
          dottedLineManagers: [{ displayName: 'Lucas Reed', id: 'mgr-2' }],
          grade: null,
          id: 'person-1',
          primaryEmail: 'ethan@example.com',
          lifecycleStatus: 'ACTIVE',
          resourcePoolIds: ['pool-1'],
          resourcePools: [],
          role: null, hiredAt: null, terminatedAt: null,
        },
      ],
      dottedLinePeople: [
        {
          currentAssignmentCount: 1,
          currentLineManager: { displayName: 'Noah Bennett', id: 'mgr-3' },
          currentOrgUnit: { code: 'DEP-PMO', id: 'org-2', name: 'Program Management Office' },
          displayName: 'Lucas Reed',
          dottedLineManagers: [{ displayName: 'Sophia Kim', id: 'mgr-1' }],
          grade: null,
          id: 'person-2',
          primaryEmail: 'lucas@example.com',
          lifecycleStatus: 'ACTIVE',
          resourcePoolIds: ['pool-2'],
          resourcePools: [],
          role: null, hiredAt: null, terminatedAt: null,
        },
      ],
      managerId: 'mgr-1',
      page: 1,
      pageSize: 25,
      totalDirectReports: 1,
      totalDottedLinePeople: 1,
    });

    renderWithRouter('/org/managers/mgr-1/scope');

    expect(await screen.findByText('Sophia Kim Scope')).toBeInTheDocument();
    expect(screen.getAllByText('Direct Reports').length).toBeGreaterThan(0);
    expect(screen.getByText('Dotted-Line Visibility')).toBeInTheDocument();
    expect(screen.getAllByText('Ethan Brooks').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Lucas Reed').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Application Engineering').length).toBeGreaterThan(0);
  });

  it('shows missing manager state', async () => {
    mockedFetchManagerScope.mockRejectedValue(
      new ApiError('Request failed for /org/managers/missing/scope', 404),
    );
    mockedFetchPersonDirectoryById.mockRejectedValue(
      new ApiError('Request failed for /org/people/missing', 404),
    );

    renderWithRouter('/org/managers/missing/scope');

    expect(await screen.findByText('Manager scope not found')).toBeInTheDocument();
  });

  it('shows error state', async () => {
    mockedFetchManagerScope.mockRejectedValue(new Error('Manager scope unavailable'));
    mockedFetchPersonDirectoryById.mockResolvedValue({
      currentAssignmentCount: 1,
      currentLineManager: null,
      currentOrgUnit: { code: 'DEP-APP', id: 'org-1', name: 'Application Engineering' },
      displayName: 'Sophia Kim',
      dottedLineManagers: [],
      grade: null,
      id: 'mgr-1',
      primaryEmail: 'sophia@example.com',
      lifecycleStatus: 'ACTIVE',
      resourcePoolIds: ['pool-1'],
      resourcePools: [],
      role: null, hiredAt: null, terminatedAt: null,
    });

    renderWithRouter('/org/managers/mgr-1/scope');

    expect(await screen.findByText('Manager scope unavailable')).toBeInTheDocument();
  });
});

function renderWithRouter(initialEntry: string): void {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<ManagerScopePage />} path="/org/managers/:id/scope" />
      </Routes>
    </MemoryRouter>,
  );
}
