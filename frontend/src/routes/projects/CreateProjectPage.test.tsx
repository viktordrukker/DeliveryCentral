import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { fetchPersonDirectory } from '@/lib/api/person-directory';
import { createProject } from '@/lib/api/project-registry';
import { renderRoute } from '@test/render-route';
import { CreateProjectPage } from './CreateProjectPage';

vi.mock('@/lib/api/person-directory', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/person-directory')>(
    '@/lib/api/person-directory',
  );

  return {
    ...actual,
    fetchPersonDirectory: vi.fn(),
  };
});

vi.mock('@/lib/api/project-registry', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/project-registry')>(
    '@/lib/api/project-registry',
  );

  return {
    ...actual,
    createProject: vi.fn(),
  };
});

const mockedFetchPersonDirectory = vi.mocked(fetchPersonDirectory);
const mockedCreateProject = vi.mocked(createProject);

describe('CreateProjectPage', () => {
  beforeEach(() => {
    mockedFetchPersonDirectory.mockReset();
    mockedCreateProject.mockReset();
    window.localStorage.clear();

    mockedFetchPersonDirectory.mockResolvedValue({
      items: [
        {
          currentAssignmentCount: 1,
          currentLineManager: null,
          currentOrgUnit: { code: 'ORG-APP', id: 'org-1', name: 'Application Engineering' },
          displayName: 'Priya Shah',
          dottedLineManagers: [],
          grade: null,
          id: 'pm-1',
          primaryEmail: 'priya.shah@example.com',
          lifecycleStatus: 'ACTIVE',
          resourcePoolIds: [],
          resourcePools: [],
          role: null,
        },
      ],
      page: 1,
      pageSize: 100,
      total: 1,
    });
  });

  it('renders and submits the create project flow', async () => {
    mockedCreateProject.mockResolvedValue({
      id: 'prj-1',
      name: 'Northstar Modernization',
      plannedEndDate: '2026-12-31T00:00:00.000Z',
      projectCode: 'PRJ-900',
      projectManagerId: 'pm-1',
      startDate: '2026-07-01T00:00:00.000Z',
      status: 'DRAFT',
    });

    const { user } = renderWithRouter();

    expect(await screen.findByText('Create Project')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Project Name'), 'Northstar Modernization');
    await user.selectOptions(screen.getByLabelText('Project Manager'), 'pm-1');
    await user.type(screen.getByLabelText('Start Date'), '2026-07-01');
    await user.type(screen.getByLabelText('Planned End Date'), '2026-12-31');
    await user.type(screen.getByLabelText('Description'), 'Core delivery transformation.');
    await user.click(screen.getByRole('button', { name: 'Create project' }));

    await waitFor(() => {
      expect(mockedCreateProject).toHaveBeenCalledWith({
        description: 'Core delivery transformation.',
        name: 'Northstar Modernization',
        plannedEndDate: '2026-12-31T00:00:00.000Z',
        projectManagerId: 'pm-1',
        startDate: '2026-07-01T00:00:00.000Z',
      });
    });

    expect(
      await screen.findByText('Created project Northstar Modernization in DRAFT.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open project details' })).toHaveAttribute(
      'href',
      '/projects/prj-1',
    );
  });

  it('shows validation errors', async () => {
    const { user } = renderWithRouter();

    await screen.findByText('Create Project');
    await user.click(screen.getByRole('button', { name: 'Create project' }));

    expect(screen.getByText('Project name is required.')).toBeInTheDocument();
    expect(screen.getByText('Project manager is required.')).toBeInTheDocument();
    expect(screen.getByText('Start date is required.')).toBeInTheDocument();
  });
});

function renderWithRouter() {
  return renderRoute(
    <Routes>
      <Route element={<CreateProjectPage />} path="/projects/new" />
      <Route element={<div>Project Details</div>} path="/projects/:id" />
    </Routes>,
    {
      initialEntries: ['/projects/new'],
    },
  );
}
