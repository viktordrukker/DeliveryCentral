import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { fetchPersonDirectory } from '@/lib/api/person-directory';
import { fetchResourcePools } from '@/lib/api/resource-pools';
import { createPendingPromise } from '@test/api-mocks';
import { buildPersonDirectoryItem, buildPersonDirectoryResponse } from '@test/fixtures/person-directory';
import { renderRoute } from '@test/render-route';
import { EmployeeDirectoryPage } from './EmployeeDirectoryPage';

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    principal: { personId: 'user-1', roles: ['hr_manager'] },
    isAuthenticated: true,
  }),
}));

vi.mock('@/lib/api/person-directory', () => ({
  fetchPersonDirectory: vi.fn(),
}));

vi.mock('@/lib/api/resource-pools', () => ({
  fetchResourcePools: vi.fn(),
}));

const mockedFetchPersonDirectory = vi.mocked(fetchPersonDirectory);
const mockedFetchResourcePools = vi.mocked(fetchResourcePools);

describe('EmployeeDirectoryPage', () => {
  beforeEach(() => {
    mockedFetchPersonDirectory.mockReset();
    mockedFetchResourcePools.mockReset();
    mockedFetchResourcePools.mockResolvedValue({ items: [] });
  });

  it('shows loading state', () => {
    mockedFetchPersonDirectory.mockReturnValue(createPendingPromise());

    renderWithRouter();

    expect(screen.getByTestId('skeleton-table')).toBeInTheDocument();
  });

  it('shows empty state', async () => {
    mockedFetchPersonDirectory.mockResolvedValue(buildPersonDirectoryResponse({ items: [], total: 0 }));

    renderWithRouter();

    expect(await screen.findByText('No employees available')).toBeInTheDocument();
  });

  it('renders data rows', async () => {
    mockedFetchPersonDirectory.mockResolvedValue(
      buildPersonDirectoryResponse({
        items: [
          buildPersonDirectoryItem({
            currentLineManager: { displayName: 'Sophia Kim', id: 'm1' },
            dottedLineManagers: [{ displayName: 'Lucas Reed', id: 'm2' }],
            id: 'p1',
          }),
        ],
      }),
    );

    renderWithRouter();

    expect(await screen.findByText('Ethan Brooks')).toBeInTheDocument();
    expect(screen.getByText('Application Engineering')).toBeInTheDocument();
    expect(screen.getByText('Sophia Kim')).toBeInTheDocument();
    expect(screen.getByText('Lucas Reed')).toBeInTheDocument();
  });

  it('shows API error state', async () => {
    mockedFetchPersonDirectory.mockRejectedValue(new Error('Directory unavailable'));

    renderWithRouter();

    expect(await screen.findByText('Directory unavailable')).toBeInTheDocument();
  });

  it('navigates to employee details placeholder on row click', async () => {
    mockedFetchPersonDirectory.mockResolvedValue(
      buildPersonDirectoryResponse({
        items: [
          buildPersonDirectoryItem({
            currentAssignmentCount: 1,
            dottedLineManagers: [],
            id: 'p1',
          }),
        ],
      }),
    );

    const { user } = renderWithRouter();

    await user.click(await screen.findByText('Ethan Brooks'));

    await waitFor(() => {
      expect(screen.getByText('Employee Details')).toBeInTheDocument();
    });
  });
});

function renderWithRouter() {
  return renderRoute(
    <Routes>
      <Route element={<EmployeeDirectoryPage />} path="/people" />
      <Route
        element={<div>Employee Details</div>}
        path="/people/:id"
      />
    </Routes>,
    {
      initialEntries: ['/people'],
    },
  );
}
