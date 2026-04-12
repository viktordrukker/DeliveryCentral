import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { createAssignment, createAssignmentOverride } from '@/lib/api/assignments';
import { ApiError } from '@/lib/api/http-client';
import { fetchPersonDirectory } from '@/lib/api/person-directory';
import { fetchProjectDirectory } from '@/lib/api/project-registry';
import {
  buildCreateAssignmentOptionsFixture,
  buildCreateAssignmentRequest,
  buildCreateAssignmentResponse,
} from '@test/fixtures/assignments';
import { buildPersonDirectoryResponse } from '@test/fixtures/person-directory';
import { buildProjectDirectoryResponse } from '@test/fixtures/project-registry';
import { renderRoute } from '@test/render-route';
import { CreateAssignmentPage } from './CreateAssignmentPage';

vi.mock('@/lib/api/person-directory', () => ({
  fetchPersonDirectory: vi.fn(),
}));

vi.mock('@/lib/api/project-registry', () => ({
  fetchProjectDirectory: vi.fn(),
}));

vi.mock('@/lib/api/assignments', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/assignments')>('@/lib/api/assignments');

  return {
    ...actual,
    createAssignment: vi.fn(),
    createAssignmentOverride: vi.fn(),
  };
});

vi.mock('@/lib/api/skills', () => ({
  fetchSkills: vi.fn().mockResolvedValue([]),
  fetchSkillMatch: vi.fn().mockResolvedValue([]),
  fetchPersonSkills: vi.fn().mockResolvedValue([]),
  upsertPersonSkills: vi.fn().mockResolvedValue([]),
}));

const mockedFetchPersonDirectory = vi.mocked(fetchPersonDirectory);
const mockedFetchProjectDirectory = vi.mocked(fetchProjectDirectory);
const mockedCreateAssignment = vi.mocked(createAssignment);
const mockedCreateAssignmentOverride = vi.mocked(createAssignmentOverride);

describe('CreateAssignmentPage', () => {
  beforeEach(() => {
    mockedFetchPersonDirectory.mockReset();
    mockedFetchProjectDirectory.mockReset();
    mockedCreateAssignment.mockReset();
    mockedCreateAssignmentOverride.mockReset();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    window.localStorage.clear();
    window.sessionStorage.clear();

    const fixture = buildCreateAssignmentOptionsFixture();

    mockedFetchPersonDirectory.mockResolvedValue(
      buildPersonDirectoryResponse({
        items: fixture.people,
        pageSize: 100,
        total: fixture.people.length,
      }),
    );

    mockedFetchProjectDirectory.mockResolvedValue(
      buildProjectDirectoryResponse({
        items: fixture.projects,
      }),
    );
  });

  it('renders the form with API-backed selectors', async () => {
    renderWithRouter();

    expect(await screen.findByText('Assignment Request')).toBeInTheDocument();
    expect(screen.getByLabelText('Requested By')).toBeInTheDocument();
    expect(screen.getByLabelText('Person')).toBeInTheDocument();
    expect(screen.getByLabelText('Project')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Assignment' })).toBeInTheDocument();
  });

  it('shows inline validation errors', async () => {
    const { user } = renderWithRouter();

    await screen.findByText('Assignment Request');
    await user.click(screen.getByRole('button', { name: 'Create Assignment' }));

    expect(screen.getByText('Requester is required.')).toBeInTheDocument();
    expect(screen.getByText('Person is required.')).toBeInTheDocument();
    expect(screen.getByText('Project is required.')).toBeInTheDocument();
    expect(screen.getByText('Staffing role is required.')).toBeInTheDocument();
    expect(screen.getByText('Allocation percent is required.')).toBeInTheDocument();
    expect(screen.getByText('Start date is required.')).toBeInTheDocument();
  });

  it('submits successfully', async () => {
    mockedCreateAssignment.mockResolvedValue(buildCreateAssignmentResponse());

    const { user } = renderWithRouter();

    await screen.findByText('Assignment Request');
    await user.selectOptions(screen.getByLabelText('Requested By'), 'person-2');
    await user.selectOptions(screen.getByLabelText('Person'), 'person-1');
    await user.selectOptions(screen.getByLabelText('Project'), 'project-1');
    await user.type(screen.getByLabelText('Staffing Role'), 'Lead Engineer');
    await user.type(screen.getByLabelText('Allocation Percent'), '50');
    await user.type(screen.getByLabelText('Start Date'), '2025-04-01');
    await user.type(screen.getByLabelText('Note'), 'Primary engineering assignment.');
    await user.click(screen.getByRole('button', { name: 'Create Assignment' }));

    await waitFor(() => {
      expect(mockedCreateAssignment).toHaveBeenCalledWith(buildCreateAssignmentRequest());
    });

    expect(await screen.findByText('Assignment Detail')).toBeInTheDocument();
  });

  it('renders server error handling', async () => {
    mockedCreateAssignment.mockRejectedValue(new Error('Project does not exist.'));

    const { user } = renderWithRouter();

    await screen.findByText('Assignment Request');
    await user.selectOptions(screen.getByLabelText('Requested By'), 'person-2');
    await user.selectOptions(screen.getByLabelText('Person'), 'person-1');
    await user.selectOptions(screen.getByLabelText('Project'), 'project-1');
    await user.type(screen.getByLabelText('Staffing Role'), 'Lead Engineer');
    await user.type(screen.getByLabelText('Allocation Percent'), '50');
    await user.type(screen.getByLabelText('Start Date'), '2025-04-01');
    await user.click(screen.getByRole('button', { name: 'Create Assignment' }));

    expect(await screen.findByText('Project does not exist.')).toBeInTheDocument();
  });

  it('renders assignment override flow for authorized users after overlap conflict', async () => {
    mockedCreateAssignment.mockRejectedValue(
      new ApiError('Overlapping assignment for the same person and project already exists.', 409),
    );
    mockedCreateAssignmentOverride.mockResolvedValue(buildCreateAssignmentResponse());
    window.localStorage.setItem('deliverycentral.authToken', buildToken(['director']));

    const { user } = renderWithRouter();

    await screen.findByText('Assignment Request');
    await user.selectOptions(screen.getByLabelText('Requested By'), 'person-2');
    await user.selectOptions(screen.getByLabelText('Person'), 'person-1');
    await user.selectOptions(screen.getByLabelText('Project'), 'project-1');
    await user.type(screen.getByLabelText('Staffing Role'), 'Lead Engineer');
    await user.type(screen.getByLabelText('Allocation Percent'), '50');
    await user.type(screen.getByLabelText('Start Date'), '2025-04-01');
    await user.type(screen.getByLabelText('Note'), 'Primary engineering assignment.');
    await user.click(screen.getByRole('button', { name: 'Create Assignment' }));

    expect(await screen.findByText('Assignment Overlap Override')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Override reason'), 'Urgent controlled staffing overlap.');
    await user.click(screen.getByRole('button', { name: 'Create assignment with override' }));

    // ConfirmDialog now shows — click Apply override
    expect(await screen.findByText('Assignment Override')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Apply override' }));

    await waitFor(() => {
      expect(mockedCreateAssignmentOverride).toHaveBeenCalledWith({
        allocationPercent: 50,
        note: 'Primary engineering assignment.',
        personId: 'person-1',
        projectId: 'project-1',
        reason: 'Urgent controlled staffing overlap.',
        staffingRole: 'Lead Engineer',
        startDate: '2025-04-01',
      });
    });

    expect(await screen.findByText('Assignment Detail')).toBeInTheDocument();
  });

  it('requires a reason before submitting assignment override', async () => {
    mockedCreateAssignment.mockRejectedValue(
      new ApiError('Overlapping assignment for the same person and project already exists.', 409),
    );
    window.localStorage.setItem('deliverycentral.authToken', buildToken(['admin']));

    const { user } = renderWithRouter();

    await screen.findByText('Assignment Request');
    await user.selectOptions(screen.getByLabelText('Requested By'), 'person-2');
    await user.selectOptions(screen.getByLabelText('Person'), 'person-1');
    await user.selectOptions(screen.getByLabelText('Project'), 'project-1');
    await user.type(screen.getByLabelText('Staffing Role'), 'Lead Engineer');
    await user.type(screen.getByLabelText('Allocation Percent'), '50');
    await user.type(screen.getByLabelText('Start Date'), '2025-04-01');
    await user.click(screen.getByRole('button', { name: 'Create Assignment' }));

    await screen.findByText('Assignment Overlap Override');
    await user.click(screen.getByRole('button', { name: 'Create assignment with override' }));

    expect(screen.getByText('Override reason is required.')).toBeInTheDocument();
    expect(mockedCreateAssignmentOverride).not.toHaveBeenCalled();
  });

  it('keeps assignment override hidden for non-governance roles', async () => {
    mockedCreateAssignment.mockRejectedValue(
      new ApiError('Overlapping assignment for the same person and project already exists.', 409),
    );
    window.localStorage.setItem('deliverycentral.authToken', buildToken(['resource_manager']));

    const { user } = renderWithRouter();

    await screen.findByText('Assignment Request');
    await user.selectOptions(screen.getByLabelText('Requested By'), 'person-2');
    await user.selectOptions(screen.getByLabelText('Person'), 'person-1');
    await user.selectOptions(screen.getByLabelText('Project'), 'project-1');
    await user.type(screen.getByLabelText('Staffing Role'), 'Lead Engineer');
    await user.type(screen.getByLabelText('Allocation Percent'), '50');
    await user.type(screen.getByLabelText('Start Date'), '2025-04-01');
    await user.click(screen.getByRole('button', { name: 'Create Assignment' }));

    expect(await screen.findByText('Assignment override unavailable')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create assignment with override' })).not.toBeInTheDocument();
  });
});

function renderWithRouter() {
  return renderRoute(
    <Routes>
      <Route element={<CreateAssignmentPage />} path="/assignments/new" />
      <Route element={<div>Assignment Detail</div>} path="/assignments/:id" />
    </Routes>,
    {
      initialEntries: ['/assignments/new'],
    },
  );
}

function buildToken(roles: string[]): string {
  const payload = {
    roles,
    sub: 'user-1',
  };

  return `header.${toBase64Url(JSON.stringify(payload))}.signature`;
}

function toBase64Url(value: string): string {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}
