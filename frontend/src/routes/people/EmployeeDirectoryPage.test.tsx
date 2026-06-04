import { screen, waitFor, within } from '@testing-library/react';
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

// V2-B.18 — gated chrome. Default falsy keeps the existing tests on the legacy
// (flag-off) path. The bench effect only fires under dsRefresh; stub it.
const isFeatureEnabledMock = vi.fn();
const fetchEnrichedBenchMock = vi.fn();
const fetchSidebarCountsMock = vi.fn();
vi.mock('@/lib/feature-flags', () => ({
  isFeatureEnabled: (flag: string) => isFeatureEnabledMock(flag),
}));
vi.mock('@/lib/api/people-bench', () => ({
  fetchEnrichedBench: (...args: unknown[]) => fetchEnrichedBenchMock(...args),
}));
vi.mock('@/lib/api/sidebar-counts', () => ({
  fetchSidebarCounts: (...args: unknown[]) => fetchSidebarCountsMock(...args),
}));

const mockedFetchPersonDirectory = vi.mocked(fetchPersonDirectory);
const mockedFetchResourcePools = vi.mocked(fetchResourcePools);

describe('EmployeeDirectoryPage', () => {
  beforeEach(() => {
    mockedFetchPersonDirectory.mockReset();
    mockedFetchResourcePools.mockReset();
    mockedFetchResourcePools.mockResolvedValue({ items: [] });
    isFeatureEnabledMock.mockReturnValue(false);
    fetchEnrichedBenchMock.mockResolvedValue([]);
    fetchSidebarCountsMock.mockResolvedValue({ projects: 0, approvals: 0, bench: 0, hrQueue: 0 });
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
  it('B18: shows role/grade/group-by/layout controls when dsRefresh is on', async () => {
    isFeatureEnabledMock.mockReturnValue(true);
    mockedFetchPersonDirectory.mockResolvedValue(
      buildPersonDirectoryResponse({
        items: [
          buildPersonDirectoryItem({ id: 'p1', displayName: 'Ada', role: 'Engineer', grade: 'L5' }),
          buildPersonDirectoryItem({ id: 'p2', displayName: 'Grace', role: 'Architect', grade: 'L7' }),
        ],
        total: 2,
      }),
    );
    renderWithRouter();
    expect(await screen.findByTestId('directory-role-filter')).toBeInTheDocument();
    expect(screen.getByTestId('directory-grade-filter')).toBeInTheDocument();
    expect(screen.getByTestId('directory-groupby')).toBeInTheDocument();
    expect(screen.getByTestId('directory-layout-toggle')).toBeInTheDocument();
  });

  it('B17: HR-Queue tab carries a live count badge from sidebar-counts (no bench-tab duplicate)', async () => {
    isFeatureEnabledMock.mockReturnValue(true);
    fetchSidebarCountsMock.mockResolvedValue({ projects: 0, approvals: 0, bench: 0, hrQueue: 5 });
    mockedFetchPersonDirectory.mockResolvedValue(
      buildPersonDirectoryResponse({ items: [], total: 0 }),
    );
    renderWithRouter();
    // HR Queue tab gets a "(5)" count; the bench tab does NOT (header carries it).
    await waitFor(() => expect(screen.getByTestId('tab-cases').textContent).toMatch(/HR Queue.*\(5\)/));
    expect(screen.getByTestId('tab-bench').textContent).not.toMatch(/\(\d+\)/);
  });

  it('B18: hides the new filter controls when dsRefresh is off (legacy unchanged)', async () => {
    isFeatureEnabledMock.mockReturnValue(false);
    mockedFetchPersonDirectory.mockResolvedValue(
      buildPersonDirectoryResponse({
        items: [buildPersonDirectoryItem({ id: 'p1', displayName: 'Ada', role: 'Engineer', grade: 'L5' })],
        total: 1,
      }),
    );
    renderWithRouter();
    await waitFor(() => expect(screen.getByText('Ada')).toBeInTheDocument());
    expect(screen.queryByTestId('directory-role-filter')).not.toBeInTheDocument();
    expect(screen.queryByTestId('directory-layout-toggle')).not.toBeInTheDocument();
  });

  it('V2 issue 179: opens the inspector drawer on row click under dsRefresh (flat+list)', async () => {
    isFeatureEnabledMock.mockReturnValue(true);
    mockedFetchPersonDirectory.mockResolvedValue(
      buildPersonDirectoryResponse({
        items: [
          buildPersonDirectoryItem({ id: 'p1', displayName: 'Ada Lovelace', role: 'Engineer', grade: 'L5' }),
          buildPersonDirectoryItem({ id: 'p2', displayName: 'Grace Hopper', role: 'Architect', grade: 'L7' }),
        ],
        total: 2,
      }),
    );
    const { user } = renderWithRouter();

    // List-detail container only mounts under dsRefresh + flat groupBy + list layout.
    await screen.findByTestId('directory-list-detail');
    // Inspector starts closed.
    expect(screen.queryByTestId('person-directory-inspector')).not.toBeInTheDocument();

    await user.click(screen.getByText('Ada Lovelace'));

    // Row click opens the inspector pane instead of navigating away.
    expect(await screen.findByTestId('person-directory-inspector')).toBeInTheDocument();
    expect(screen.queryByText('Employee Details')).not.toBeInTheDocument();
    // Stepper shows position 1 of 2.
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('SCOPED-MIN-3: inspector selection persists via `?selected=` URL param (deep-link restores drawer)', async () => {
    isFeatureEnabledMock.mockReturnValue(true);
    mockedFetchPersonDirectory.mockResolvedValue(
      buildPersonDirectoryResponse({
        items: [
          buildPersonDirectoryItem({ id: 'p1', displayName: 'Ada Lovelace', role: 'Engineer' }),
          buildPersonDirectoryItem({ id: 'p2', displayName: 'Grace Hopper', role: 'Architect' }),
        ],
        total: 2,
      }),
    );
    renderRoute(
      <Routes>
        <Route element={<EmployeeDirectoryPage />} path="/people" />
        <Route element={<div>Employee Details</div>} path="/people/:id" />
      </Routes>,
      { initialEntries: ['/people?selected=p2'] },
    );

    // Deep-link with `?selected=p2` opens the inspector on Grace Hopper directly,
    // without any user interaction. Validates UX Law 5 + Law 10 (URL persistence).
    const inspector = await screen.findByTestId('person-directory-inspector');
    expect(inspector).toBeInTheDocument();
    // Inspector header shows the targeted person.
    expect(within(inspector).getByText('Grace Hopper')).toBeInTheDocument();
    // Stepper reports position 2 of 2 (Grace is the second row).
    expect(within(inspector).getByText('2 / 2')).toBeInTheDocument();
  });

  it('V2 issue 179: inspector close button hides the drawer and keeps the user on the directory', async () => {
    isFeatureEnabledMock.mockReturnValue(true);
    mockedFetchPersonDirectory.mockResolvedValue(
      buildPersonDirectoryResponse({
        items: [buildPersonDirectoryItem({ id: 'p1', displayName: 'Ada Lovelace', role: 'Engineer' })],
        total: 1,
      }),
    );
    const { user } = renderWithRouter();

    await user.click(await screen.findByText('Ada Lovelace'));
    expect(await screen.findByTestId('person-directory-inspector')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /close inspector/i }));
    await waitFor(() =>
      expect(screen.queryByTestId('person-directory-inspector')).not.toBeInTheDocument(),
    );
    // Still on the directory page — not the details route.
    expect(screen.queryByText('Employee Details')).not.toBeInTheDocument();
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
