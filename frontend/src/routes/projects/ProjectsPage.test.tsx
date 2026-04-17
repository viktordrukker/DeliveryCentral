import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { fetchProjectDirectory } from '@/lib/api/project-registry';
import { fetchProjectHealth } from '@/lib/api/project-health';
import { createPendingPromise } from '@test/api-mocks';
import { buildProjectDirectoryItem, buildProjectDirectoryResponse } from '@test/fixtures/project-registry';
import { renderRoute } from '@test/render-route';
import { ProjectsPage } from './ProjectsPage';

vi.mock('@/lib/api/project-registry', () => ({
  fetchProjectDirectory: vi.fn(),
}));

vi.mock('@/lib/api/project-health', () => ({
  fetchProjectHealth: vi.fn(),
}));

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    principal: { personId: 'user-1', roles: ['project_manager'] },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

const mockedFetchProjectDirectory = vi.mocked(fetchProjectDirectory);
const mockedFetchProjectHealth = vi.mocked(fetchProjectHealth);

describe('ProjectsPage', () => {
  beforeEach(() => {
    mockedFetchProjectDirectory.mockReset();
    mockedFetchProjectHealth.mockResolvedValue({
      timeScore: 16,
      grade: 'yellow',
      projectId: 'prj-1',
      score: 50,
      staffingScore: 17,
      timelineScore: 17,
    });
  });

  it('shows loading state', () => {
    mockedFetchProjectDirectory.mockReturnValue(createPendingPromise());

    renderWithRouter();

    expect(screen.getByTestId('skeleton-table')).toBeInTheDocument();
  });

  it('shows empty state', async () => {
    mockedFetchProjectDirectory.mockResolvedValue(buildProjectDirectoryResponse({ items: [] }));

    renderWithRouter();

    expect(await screen.findByText('No projects yet')).toBeInTheDocument();
  });

  it('renders project data with external links as secondary information', async () => {
    mockedFetchProjectDirectory.mockResolvedValue(
      buildProjectDirectoryResponse({
        items: [
          buildProjectDirectoryItem({
            id: 'prj-1',
          }),
        ],
      }),
    );

    renderWithRouter();

    expect(await screen.findByText('Atlas ERP Rollout')).toBeInTheDocument();
    expect(screen.getByText('PRJ-102')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('JIRA (1)')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create project' })).toHaveAttribute(
      'href',
      '/projects/new',
    );
  });

  it('shows API error state', async () => {
    mockedFetchProjectDirectory.mockRejectedValue(new Error('Project registry unavailable'));

    renderWithRouter();

    expect(await screen.findByText('Project registry unavailable')).toBeInTheDocument();
  });

  it('navigates to project details placeholder on row click', async () => {
    mockedFetchProjectDirectory.mockResolvedValue(
      buildProjectDirectoryResponse({
        items: [
          buildProjectDirectoryItem({
            id: 'prj-1',
          }),
        ],
      }),
    );

    const { user } = renderWithRouter();

    await user.click(await screen.findByText('Atlas ERP Rollout'));

    await waitFor(() => {
      expect(screen.getByText('Project Details')).toBeInTheDocument();
    });
  });

  it('renders health badge column', async () => {
    mockedFetchProjectDirectory.mockResolvedValue(
      buildProjectDirectoryResponse({
        items: [
          buildProjectDirectoryItem({ id: 'prj-1' }),
        ],
      }),
    );
    mockedFetchProjectHealth.mockResolvedValue({
      timeScore: 33,
      grade: 'green',
      projectId: 'prj-1',
      score: 84,
      staffingScore: 33,
      timelineScore: 18,
    });

    renderWithRouter();

    // Health column header present
    expect(await screen.findByText(/Health/)).toBeInTheDocument();
    // Health badge rendered after data loads
    expect(await screen.findByLabelText('Health: 84 (green)')).toBeInTheDocument();
  });
});

function renderWithRouter() {
  return renderRoute(
    <Routes>
      <Route element={<ProjectsPage />} path="/projects" />
      <Route
        element={<div>Project Details</div>}
        path="/projects/:id"
      />
    </Routes>,
    {
      initialEntries: ['/projects'],
    },
  );
}
