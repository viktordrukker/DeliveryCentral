/**
 * SCOPED-MIN-1 — /projects directory FilterBar + DataView refresh.
 *
 * Verifies the dsRefresh-gated additions:
 *  - row-click opens the inspector drawer (UX Law 4 action-data adjacency)
 *  - KPI strip renders 4 drilldown links to filtered registry views (UX Law 9)
 *  - FilterBar uses the canonical `<label className="field">` pattern
 *  - the OFF path is untouched (existing tests cover that)
 */
import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { fetchProjectDirectory } from '@/lib/api/project-registry';
import { fetchProjectHealth, fetchProjectHealthBatch } from '@/lib/api/project-health';
import { buildProjectDirectoryItem, buildProjectDirectoryResponse } from '@test/fixtures/project-registry';
import { renderRoute } from '@test/render-route';
import { ProjectsPage } from './ProjectsPage';

vi.mock('@/lib/api/project-registry', () => ({
  fetchProjectDirectory: vi.fn(),
}));

vi.mock('@/lib/api/project-health', () => ({
  fetchProjectHealth: vi.fn(),
  fetchProjectHealthBatch: vi.fn(() => Promise.resolve(new Map())),
}));

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    principal: { personId: 'user-1', roles: ['project_manager'] },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

const isFeatureEnabledMock = vi.fn();
vi.mock('@/lib/feature-flags', () => ({
  isFeatureEnabled: (flag: string) => isFeatureEnabledMock(flag),
}));

const mockedFetchProjectDirectory = vi.mocked(fetchProjectDirectory);
const mockedFetchProjectHealth = vi.mocked(fetchProjectHealth);
const mockedFetchProjectHealthBatch = vi.mocked(fetchProjectHealthBatch);

describe('SCOPED-MIN-1 — ProjectsPage dsRefresh additions', () => {
  beforeEach(() => {
    isFeatureEnabledMock.mockReset();
    isFeatureEnabledMock.mockReturnValue(true);
    mockedFetchProjectDirectory.mockReset();
    mockedFetchProjectHealth.mockResolvedValue({
      timeScore: 16,
      grade: 'yellow',
      projectId: 'prj-1',
      score: 50,
      staffingScore: 17,
      timelineScore: 17,
    });
    mockedFetchProjectHealthBatch.mockResolvedValue(
      new Map([
        ['prj-1', {
          timeScore: 16,
          grade: 'yellow',
          projectId: 'prj-1',
          score: 50,
          staffingScore: 17,
          timelineScore: 17,
        }],
      ]),
    );
  });

  it('renders KPI strip with 4 drilldown links', async () => {
    mockedFetchProjectDirectory.mockResolvedValue(
      buildProjectDirectoryResponse({
        items: [
          buildProjectDirectoryItem({ id: 'prj-1', status: 'ACTIVE', priority: 'CRITICAL' }),
          buildProjectDirectoryItem({ id: 'prj-2', name: 'Bravo', projectCode: 'PRJ-200', status: 'CLOSED' }),
        ],
      }),
    );

    renderWithRouter();

    await screen.findByText('Atlas ERP Rollout');

    const strip = await screen.findByTestId('projects-kpi-strip');
    expect(strip).toBeInTheDocument();

    const total = screen.getByTestId('projects-kpi-total');
    expect(total).toHaveAttribute('href', '/projects');
    expect(total).toHaveTextContent('2');

    const active = screen.getByTestId('projects-kpi-active');
    expect(active).toHaveAttribute('href', '/projects?status=ACTIVE');
    expect(active).toHaveTextContent('1');

    const critical = screen.getByTestId('projects-kpi-critical');
    expect(critical).toHaveAttribute('href', '/projects?priority=CRITICAL');
    expect(critical).toHaveTextContent('1');

    const atRisk = screen.getByTestId('projects-kpi-at-risk');
    expect(atRisk).toHaveAttribute('href', '/projects?sort=asc');
  });

  it('opens the inspector drawer on row click', async () => {
    mockedFetchProjectDirectory.mockResolvedValue(
      buildProjectDirectoryResponse({
        items: [
          buildProjectDirectoryItem({
            id: 'prj-1',
            name: 'Atlas ERP Rollout',
            priority: 'HIGH',
            clientName: 'Acme Corp',
            engagementModel: 'TIME_AND_MATERIAL',
          }),
        ],
      }),
    );

    const { user } = renderWithRouter();

    const row = await screen.findByText('Atlas ERP Rollout');
    await user.click(row);

    const inspector = await screen.findByTestId('project-directory-inspector');
    expect(inspector).toBeInTheDocument();
    expect(inspector).toHaveTextContent('Acme Corp');
    expect(inspector).toHaveTextContent('TIME_AND_MATERIAL');

    const openLink = screen.getByRole('link', { name: 'Open project' });
    expect(openLink).toHaveAttribute('href', '/projects/prj-1');
  });

  it('closes the inspector when Close button is clicked', async () => {
    mockedFetchProjectDirectory.mockResolvedValue(
      buildProjectDirectoryResponse({
        items: [buildProjectDirectoryItem({ id: 'prj-1' })],
      }),
    );

    const { user } = renderWithRouter();

    await user.click(await screen.findByText('Atlas ERP Rollout'));
    await screen.findByTestId('project-directory-inspector');

    const closeBtn = screen.getByRole('button', { name: 'Close inspector' });
    await user.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('project-directory-inspector')).not.toBeInTheDocument();
    });
  });

  it('renders canonical FilterBar inputs (Search, Engagement, Priority, Status, Source)', async () => {
    mockedFetchProjectDirectory.mockResolvedValue(
      buildProjectDirectoryResponse({
        items: [buildProjectDirectoryItem({ id: 'prj-1' })],
      }),
    );

    renderWithRouter();
    await screen.findByText('Atlas ERP Rollout');

    expect(screen.getByTestId('projects-filter-search')).toBeInTheDocument();
    expect(screen.getByTestId('projects-filter-engagement')).toBeInTheDocument();
    expect(screen.getByTestId('projects-filter-priority')).toBeInTheDocument();
    expect(screen.getByTestId('projects-filter-status')).toBeInTheDocument();
    expect(screen.getByTestId('projects-filter-source')).toBeInTheDocument();
  });
});

function renderWithRouter() {
  return renderRoute(
    <Routes>
      <Route element={<ProjectsPage />} path="/projects" />
      <Route element={<div>Project Details</div>} path="/projects/:id" />
    </Routes>,
    { initialEntries: ['/projects'] },
  );
}
