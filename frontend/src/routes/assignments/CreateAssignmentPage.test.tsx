import { screen, waitFor, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { createAssignment, createAssignmentOverride, fetchAssignments } from '@/lib/api/assignments';
import { ApiError } from '@/lib/api/http-client';
import { fetchPersonDirectory } from '@/lib/api/person-directory';
import { fetchProjectDirectory } from '@/lib/api/project-registry';
import {
  buildCreateAssignmentOptionsFixture,
  buildCreateAssignmentResponse,
} from '@test/fixtures/assignments';
import { buildPersonDirectoryResponse } from '@test/fixtures/person-directory';
import { buildProjectDirectoryResponse } from '@test/fixtures/project-registry';
import { renderRoute } from '@test/render-route';
import { CreateAssignmentPage } from './CreateAssignmentPage';

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    principal: { personId: 'person-2', roles: ['project_manager'] },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

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
    fetchAssignments: vi.fn().mockResolvedValue({ items: [], totalCount: 0 }),
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
    vi.mocked(fetchAssignments).mockResolvedValue({ items: [], totalCount: 0 } as never);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    window.localStorage.clear();
    window.sessionStorage.clear();

    const fixture = buildCreateAssignmentOptionsFixture();

    mockedFetchPersonDirectory.mockResolvedValue(
      buildPersonDirectoryResponse({
        items: fixture.people,
        pageSize: 200,
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

    expect(await screen.findByText('Assignment Details')).toBeInTheDocument();
    expect(screen.getByLabelText('Requested By')).toBeInTheDocument();
    expect(screen.getByLabelText('Person')).toBeInTheDocument();
    expect(screen.getByLabelText('Project')).toBeInTheDocument();
    expect(screen.getByLabelText('Staffing Role')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create & Request' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Draft' })).toBeInTheDocument();
  });

  it('auto-fills requester from principal', async () => {
    renderWithRouter();

    await screen.findByText('Assignment Details');
    const requesterSelect = screen.getByLabelText('Requested By') as HTMLSelectElement;
    expect(requesterSelect.value).toBe('person-2');
  });

  it('shows staffing role as dropdown with standard roles', async () => {
    renderWithRouter();

    await screen.findByText('Assignment Details');
    const roleSelect = screen.getByLabelText('Staffing Role') as HTMLSelectElement;
    expect(roleSelect.tagName).toBe('SELECT');

    const options = Array.from(roleSelect.options).map((o) => o.value);
    expect(options).toContain('Software Engineer');
    expect(options).toContain('Lead Engineer');
    expect(options).toContain('__custom__');
  });

  it('shows inline validation errors', async () => {
    const { user } = renderWithRouter();

    await screen.findByText('Assignment Details');
    await user.selectOptions(screen.getByLabelText('Requested By'), '');
    await user.clear(screen.getByLabelText('Allocation Percent'));
    await user.click(screen.getByRole('button', { name: 'Create & Request' }));

    expect(screen.getByText('Requester is required.')).toBeInTheDocument();
    expect(screen.getByText('Person is required.')).toBeInTheDocument();
    expect(screen.getByText('Project is required.')).toBeInTheDocument();
    expect(screen.getByText('Staffing role is required.')).toBeInTheDocument();
    expect(screen.getByText('Allocation percent is required.')).toBeInTheDocument();
    expect(screen.getByText('Start date is required.')).toBeInTheDocument();
  });

  it('submits successfully with default allocation', async () => {
    mockedCreateAssignment.mockResolvedValue(buildCreateAssignmentResponse({ allocationPercent: 100 }));

    const { user } = renderWithRouter();

    await screen.findByText('Assignment Details');
    await user.selectOptions(screen.getByLabelText('Person'), 'person-1');
    await user.selectOptions(screen.getByLabelText('Project'), 'project-1');
    await user.selectOptions(screen.getByLabelText('Staffing Role'), 'Lead Engineer');
    await user.type(screen.getByLabelText('Start Date'), '2025-04-01');
    await user.type(screen.getByLabelText('Note'), 'Primary engineering assignment.');
    await user.click(screen.getByRole('button', { name: 'Create & Request' }));

    await waitFor(() => {
      expect(mockedCreateAssignment).toHaveBeenCalledWith({
        actorId: 'person-2',
        allocationPercent: 100,
        note: 'Primary engineering assignment.',
        personId: 'person-1',
        projectId: 'project-1',
        staffingRole: 'Lead Engineer',
        startDate: '2025-04-01',
      });
    });

    expect(await screen.findByText('Assignment Detail')).toBeInTheDocument();
  });

  it('renders server error handling', async () => {
    mockedCreateAssignment.mockRejectedValue(new Error('Project does not exist.'));

    const { user } = renderWithRouter();

    await screen.findByText('Assignment Details');
    await user.selectOptions(screen.getByLabelText('Person'), 'person-1');
    await user.selectOptions(screen.getByLabelText('Project'), 'project-1');
    await user.selectOptions(screen.getByLabelText('Staffing Role'), 'Lead Engineer');
    await user.type(screen.getByLabelText('Start Date'), '2025-04-01');
    await user.click(screen.getByRole('button', { name: 'Create & Request' }));

    expect(await screen.findByText('Project does not exist.')).toBeInTheDocument();
  });

  it('renders assignment override flow for authorized users after overlap conflict', async () => {
    mockedCreateAssignment.mockRejectedValue(
      new ApiError('Overlapping assignment for the same person and project already exists.', 409),
    );
    mockedCreateAssignmentOverride.mockResolvedValue(buildCreateAssignmentResponse());
    window.localStorage.setItem('deliverycentral.authToken', buildToken(['director']));

    const { user } = renderWithRouter();

    await screen.findByText('Assignment Details');
    await user.selectOptions(screen.getByLabelText('Person'), 'person-1');
    await user.selectOptions(screen.getByLabelText('Project'), 'project-1');
    await user.selectOptions(screen.getByLabelText('Staffing Role'), 'Lead Engineer');
    await user.type(screen.getByLabelText('Start Date'), '2025-04-01');
    await user.type(screen.getByLabelText('Note'), 'Primary engineering assignment.');
    await user.click(screen.getByRole('button', { name: 'Create & Request' }));

    expect(await screen.findByText('Assignment Overlap Override')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Override reason'), 'Urgent controlled staffing overlap.');
    await user.click(screen.getByRole('button', { name: 'Create assignment with override' }));

    expect(await screen.findByText('Assignment Override')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Apply override' }));

    await waitFor(() => {
      expect(mockedCreateAssignmentOverride).toHaveBeenCalledWith({
        allocationPercent: 100,
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

    await screen.findByText('Assignment Details');
    await user.selectOptions(screen.getByLabelText('Person'), 'person-1');
    await user.selectOptions(screen.getByLabelText('Project'), 'project-1');
    await user.selectOptions(screen.getByLabelText('Staffing Role'), 'Lead Engineer');
    await user.type(screen.getByLabelText('Start Date'), '2025-04-01');
    await user.click(screen.getByRole('button', { name: 'Create & Request' }));

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

    await screen.findByText('Assignment Details');
    await user.selectOptions(screen.getByLabelText('Person'), 'person-1');
    await user.selectOptions(screen.getByLabelText('Project'), 'project-1');
    await user.selectOptions(screen.getByLabelText('Staffing Role'), 'Lead Engineer');
    await user.type(screen.getByLabelText('Start Date'), '2025-04-01');
    await user.click(screen.getByRole('button', { name: 'Create & Request' }));

    expect(await screen.findByText('Assignment override unavailable')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create assignment with override' })).not.toBeInTheDocument();
  });

  it('shows person context panel when person is selected', async () => {
    const { user } = renderWithRouter();

    await screen.findByText('Assignment Details');
    await user.selectOptions(screen.getByLabelText('Person'), 'person-1');

    const contextPanel = await screen.findByText('Person Context');
    const panelSection = contextPanel.closest('.section-card')!;
    expect(within(panelSection as HTMLElement).getByText('Ethan Brooks')).toBeInTheDocument();
  });

  it('shows project context panel when project is selected', async () => {
    const { user } = renderWithRouter();

    await screen.findByText('Assignment Details');
    await user.selectOptions(screen.getByLabelText('Project'), 'project-1');

    expect(await screen.findByText('Project Context')).toBeInTheDocument();
    expect(screen.getByText('PRJ-102')).toBeInTheDocument();
  });

  it('shows context placeholder when no person or project selected', async () => {
    renderWithRouter();

    await screen.findByText('Assignment Details');
    expect(screen.getByText(/Select a person and project/)).toBeInTheDocument();
  });

  it('submits as draft when Save Draft is clicked', async () => {
    mockedCreateAssignment.mockResolvedValue(buildCreateAssignmentResponse({ status: 'DRAFT' }));

    const { user } = renderWithRouter();

    await screen.findByText('Assignment Details');
    await user.selectOptions(screen.getByLabelText('Person'), 'person-1');
    await user.selectOptions(screen.getByLabelText('Project'), 'project-1');
    await user.selectOptions(screen.getByLabelText('Staffing Role'), 'Lead Engineer');
    await user.type(screen.getByLabelText('Start Date'), '2025-04-01');
    await user.click(screen.getByRole('button', { name: 'Save Draft' }));

    await waitFor(() => {
      expect(mockedCreateAssignment).toHaveBeenCalledWith(
        expect.objectContaining({ draft: true }),
      );
    });
  });
});

function renderWithRouter() {
  return renderRoute(
    <Routes>
      <Route element={<CreateAssignmentPage />} path="/assignments/new" />
      <Route element={<div>Assignment Detail</div>} path="/assignments/:id" />
      <Route element={<div>HR Case</div>} path="/cases/new" />
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
