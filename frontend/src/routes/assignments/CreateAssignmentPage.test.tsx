import { screen, waitFor, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { ApiError } from '@/lib/api/http-client';
import { fetchPersonDirectory } from '@/lib/api/person-directory';
import { fetchProjectDirectory } from '@/lib/api/project-registry';
import {
  createProjectPosition,
  transitionProjectPositionFill,
  type ProjectPosition,
} from '@/lib/api/project-positions';
import {
  buildCreateAssignmentOptionsFixture,
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

// LEAN-P2-6: create flow now runs createProjectPosition + transition. Mock
// both paths; the helper below builds a default ProjectPosition response.
// Legacy createAssignment / createAssignmentOverride / fetchAssignments mocks
// were retired here — the hook no longer touches them.
vi.mock('@/lib/api/project-positions', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/project-positions')>(
    '@/lib/api/project-positions',
  );
  return {
    ...actual,
    createProjectPosition: vi.fn(),
    transitionProjectPositionFill: vi.fn(),
  };
});

function buildPosition(overrides: Partial<ProjectPosition> = {}): ProjectPosition {
  return {
    id: 'pos-1',
    projectId: 'project-1',
    role: 'Lead Engineer',
    requiredAllocationPercent: 100,
    fillStatus: 'BOOKED',
    activePersonId: 'person-1',
    activeAllocationPercent: 100,
    version: 1,
    ...overrides,
  };
}

vi.mock('@/lib/api/skills', () => ({
  fetchSkills: vi.fn().mockResolvedValue([]),
  fetchSkillMatch: vi.fn().mockResolvedValue([]),
  fetchPersonSkills: vi.fn().mockResolvedValue([]),
  upsertPersonSkills: vi.fn().mockResolvedValue([]),
}));

const mockedFetchPersonDirectory = vi.mocked(fetchPersonDirectory);
const mockedFetchProjectDirectory = vi.mocked(fetchProjectDirectory);
const mockedCreateProjectPosition = vi.mocked(createProjectPosition);
const mockedTransitionProjectPositionFill = vi.mocked(transitionProjectPositionFill);

describe('CreateAssignmentPage', () => {
  beforeEach(() => {
    mockedFetchPersonDirectory.mockReset();
    mockedFetchProjectDirectory.mockReset();
    mockedCreateProjectPosition.mockReset();
    mockedTransitionProjectPositionFill.mockReset();
    // Default success behaviour — happy-path tests can rely on these
    // resolving without re-stating the mock.
    mockedCreateProjectPosition.mockResolvedValue(buildPosition());
    mockedTransitionProjectPositionFill.mockResolvedValue(buildPosition());
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
    // LEAN-P2-2: create flow runs createProjectPosition then a transition
    // to BOOKED. Defaults from beforeEach already cover both paths.
    const { user } = renderWithRouter();

    await screen.findByText('Assignment Details');
    await user.selectOptions(screen.getByLabelText('Person'), 'person-1');
    await user.selectOptions(screen.getByLabelText('Project'), 'project-1');
    await user.selectOptions(screen.getByLabelText('Staffing Role'), 'Lead Engineer');
    await user.type(screen.getByLabelText('Start Date'), '2025-04-01');
    await user.type(screen.getByLabelText('Note'), 'Primary engineering assignment.');
    await user.click(screen.getByRole('button', { name: 'Create & Request' }));

    await waitFor(() => {
      expect(mockedCreateProjectPosition).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'project-1',
          role: 'Lead Engineer',
          requiredAllocationPercent: 100,
          startDate: '2025-04-01',
          openImmediately: true,
        }),
      );
    });
    expect(mockedTransitionProjectPositionFill).toHaveBeenCalledWith(
      'pos-1',
      expect.objectContaining({
        toStatus: 'BOOKED',
        personId: 'person-1',
        allocationPercent: 100,
      }),
    );

    expect(await screen.findByText('Assignment Detail')).toBeInTheDocument();
  });

  it('routes to returnTo on success when an in-app returnTo is provided (Law 3)', async () => {
    const { user } = renderWithRouter({
      initialEntries: ['/assignments/new?returnTo=/people/bench'],
    });

    await screen.findByText('Assignment Details');
    await user.selectOptions(screen.getByLabelText('Person'), 'person-1');
    await user.selectOptions(screen.getByLabelText('Project'), 'project-1');
    await user.selectOptions(screen.getByLabelText('Staffing Role'), 'Lead Engineer');
    await user.type(screen.getByLabelText('Start Date'), '2025-04-01');
    await user.click(screen.getByRole('button', { name: 'Create & Request' }));

    // Lands back on /people/bench, NOT the assignment detail page.
    expect(await screen.findByText('Bench Page')).toBeInTheDocument();
  });

  it('ignores returnTo when value is not an in-app path (open-redirect guard)', async () => {
    const { user } = renderWithRouter({
      initialEntries: ['/assignments/new?returnTo=//evil.example.com/phish'],
    });

    await screen.findByText('Assignment Details');
    await user.selectOptions(screen.getByLabelText('Person'), 'person-1');
    await user.selectOptions(screen.getByLabelText('Project'), 'project-1');
    await user.selectOptions(screen.getByLabelText('Staffing Role'), 'Lead Engineer');
    await user.type(screen.getByLabelText('Start Date'), '2025-04-01');
    await user.click(screen.getByRole('button', { name: 'Create & Request' }));

    // Falls back to default assignment-detail destination.
    expect(await screen.findByText('Assignment Detail')).toBeInTheDocument();
  });

  it('renders server error handling', async () => {
    mockedCreateProjectPosition.mockRejectedValue(new Error('Project does not exist.'));

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
    // First create call (via createProjectPosition or its follow-up
    // transition) hits the overlap conflict. The override flow re-runs the
    // create-then-transition with the reason text attached.
    mockedCreateProjectPosition.mockRejectedValueOnce(
      new ApiError('Overlapping assignment for the same person and project already exists.', 409),
    );
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
      // LEAN-P2-2: override re-runs the create-then-BOOK flow with the
      // reason carried through the transition body.
      expect(mockedTransitionProjectPositionFill).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          toStatus: 'BOOKED',
          personId: 'person-1',
          allocationPercent: 100,
          reason: 'Urgent controlled staffing overlap.',
        }),
      );
    });

    expect(await screen.findByText('Assignment Detail')).toBeInTheDocument();
  });

  it('requires a reason before submitting assignment override', async () => {
    mockedCreateProjectPosition.mockRejectedValueOnce(
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
    // Override flow stays on the form; the BOOKED transition (the lean
    // override step) must not have fired without a reason being captured.
    expect(mockedTransitionProjectPositionFill).not.toHaveBeenCalled();
  });

  it('keeps assignment override hidden for non-governance roles', async () => {
    mockedCreateProjectPosition.mockRejectedValueOnce(
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
    // LEAN-P2-2: draft skips the BOOKED transition — only the
    // createProjectPosition call fires, and `openImmediately` is false.
    mockedCreateProjectPosition.mockResolvedValue(buildPosition({ fillStatus: 'DRAFT' }));

    const { user } = renderWithRouter();

    await screen.findByText('Assignment Details');
    await user.selectOptions(screen.getByLabelText('Person'), 'person-1');
    await user.selectOptions(screen.getByLabelText('Project'), 'project-1');
    await user.selectOptions(screen.getByLabelText('Staffing Role'), 'Lead Engineer');
    await user.type(screen.getByLabelText('Start Date'), '2025-04-01');
    await user.click(screen.getByRole('button', { name: 'Save Draft' }));

    await waitFor(() => {
      expect(mockedCreateProjectPosition).toHaveBeenCalledWith(
        expect.objectContaining({ openImmediately: false }),
      );
    });
    expect(mockedTransitionProjectPositionFill).not.toHaveBeenCalled();
  });
});

function renderWithRouter(opts: { initialEntries?: string[] } = {}) {
  return renderRoute(
    <Routes>
      <Route element={<CreateAssignmentPage />} path="/assignments/new" />
      <Route element={<div>Assignment Detail</div>} path="/assignments/:id" />
      <Route element={<div>Bench Page</div>} path="/people/bench" />
      <Route element={<div>HR Case</div>} path="/cases/new" />
    </Routes>,
    {
      initialEntries: opts.initialEntries ?? ['/assignments/new'],
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
