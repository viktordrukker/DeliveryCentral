import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { ApiError } from '@/lib/api/http-client';
import {
  activateProject,
  assignTeamToProject,
  closeProject,
  closeProjectOverride,
  fetchProjectById,
} from '@/lib/api/project-registry';
import { fetchTeams } from '@/lib/api/teams';
import { fetchPersonDirectory } from '@/lib/api/person-directory';
import { fetchAssignments } from '@/lib/api/assignments';
import { fetchWorkEvidence } from '@/lib/api/work-evidence';
import { fetchProjectHealth } from '@/lib/api/project-health';
import { fetchProjectBudgetDashboard } from '@/lib/api/project-budget';
import { fetchBusinessAudit } from '@/lib/api/business-audit';
import { ProjectDetailsPlaceholderPage } from './ProjectDetailsPlaceholderPage';

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    principal: { personId: 'pm-1', roles: ['project_manager'] },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('@/lib/api/person-directory', () => ({
  fetchPersonDirectory: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 200, total: 0 }),
}));

vi.mock('@/lib/api/project-registry', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/project-registry')>(
    '@/lib/api/project-registry',
  );

  return {
    ...actual,
    activateProject: vi.fn(),
    assignTeamToProject: vi.fn(),
    closeProject: vi.fn(),
    closeProjectOverride: vi.fn(),
    fetchProjectById: vi.fn(),
  };
});

vi.mock('@/lib/api/teams', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/teams')>('@/lib/api/teams');

  return {
    ...actual,
    fetchTeams: vi.fn(),
  };
});

vi.mock('@/lib/api/assignments', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/assignments')>(
    '@/lib/api/assignments',
  );
  return { ...actual, fetchAssignments: vi.fn() };
});

vi.mock('@/lib/api/work-evidence', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/work-evidence')>(
    '@/lib/api/work-evidence',
  );
  return { ...actual, fetchWorkEvidence: vi.fn() };
});

vi.mock('@/lib/api/project-health', () => ({
  fetchProjectHealth: vi.fn(),
}));

vi.mock('@/lib/api/project-budget', () => ({
  fetchProjectBudgetDashboard: vi.fn(),
  upsertProjectBudget: vi.fn(),
}));

vi.mock('@/lib/api/business-audit', () => ({
  fetchBusinessAudit: vi.fn().mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 100 }),
}));

const mockedFetchProjectById = vi.mocked(fetchProjectById);
const mockedActivateProject = vi.mocked(activateProject);
const mockedCloseProject = vi.mocked(closeProject);
const mockedCloseProjectOverride = vi.mocked(closeProjectOverride);
const mockedAssignTeamToProject = vi.mocked(assignTeamToProject);
const mockedFetchTeams = vi.mocked(fetchTeams);
const mockedFetchPersonDirectory = vi.mocked(fetchPersonDirectory);
const mockedFetchAssignments = vi.mocked(fetchAssignments);
const mockedFetchWorkEvidence = vi.mocked(fetchWorkEvidence);
const mockedFetchProjectHealth = vi.mocked(fetchProjectHealth);
const mockedFetchProjectBudgetDashboard = vi.mocked(fetchProjectBudgetDashboard);
const mockedFetchBusinessAudit = vi.mocked(fetchBusinessAudit);

describe('ProjectDetailsPage', () => {
  beforeEach(() => {
    mockedFetchBusinessAudit.mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 100 });
    mockedFetchProjectById.mockReset();
    mockedActivateProject.mockReset();
    mockedCloseProject.mockReset();
    mockedCloseProjectOverride.mockReset();
    mockedAssignTeamToProject.mockReset();
    mockedFetchTeams.mockReset();
    mockedFetchAssignments.mockResolvedValue({ items: [], totalCount: 0 });
    mockedFetchWorkEvidence.mockResolvedValue({ items: [] });
    mockedFetchProjectHealth.mockResolvedValue({
      evidenceScore: 0,
      grade: 'red',
      projectId: 'prj-1',
      score: 17,
      staffingScore: 0,
      timelineScore: 17,
    });
    mockedFetchProjectBudgetDashboard.mockResolvedValue({
      budget: null,
      burnDown: [],
      forecast: { projectedTotalCost: 0, remainingBudget: 0, onTrack: true },
      byRole: [],
      healthColor: 'green',
    });
    mockedFetchPersonDirectory.mockResolvedValue({
      items: [
        { currentAssignmentCount: 0, currentLineManager: null, currentOrgUnit: null, displayName: 'Resource Manager One', dottedLineManagers: [], id: 'resource-manager-1', lifecycleStatus: 'ACTIVE', primaryEmail: null, resourcePoolIds: [], resourcePools: [] },
      ],
      page: 1,
      pageSize: 200,
      total: 1,
    });
    window.localStorage.clear();

    mockedFetchTeams.mockResolvedValue({
      items: [
        {
          code: 'TM-ALPHA',
          description: 'Delivery pod',
          id: 'team-1',
          memberCount: 4,
          name: 'Alpha Squad',
          orgUnit: {
            code: 'ORG-APP',
            id: 'org-1',
            name: 'Application Engineering',
          },
        },
      ],
    });
  });

  it('renders project data', async () => {
    mockedFetchProjectById.mockResolvedValue({
      assignmentCount: 3,
      description: 'Jira-linked ERP rollout program.',
      externalLinks: [
        {
          archived: false,
          externalProjectKey: 'ATLAS',
          externalProjectName: 'Atlas ERP Rollout',
          externalUrl: 'https://jira.example.com/projects/ATLAS',
          provider: 'JIRA',
          providerEnvironment: 'cloud',
        },
      ],
      externalLinksCount: 1,
      externalLinksSummary: [{ count: 1, provider: 'JIRA' }],
      id: 'prj-1',
      name: 'Atlas ERP Rollout',
      plannedEndDate: '2026-09-30T00:00:00.000Z',
      projectManagerId: 'pm-1',
      projectManagerDisplayName: null,
      projectCode: 'PRJ-102',
      startDate: '2026-04-01T00:00:00.000Z',
      status: 'ACTIVE',
    });

    renderWithRouter('/projects/prj-1');

    expect(await screen.findByRole('heading', { name: 'Atlas ERP Rollout' })).toBeInTheDocument();
    expect(screen.getAllByText('PRJ-102').length).toBeGreaterThan(0);
    expect(screen.getByText('Jira-linked ERP rollout program.')).toBeInTheDocument();
    expect(screen.getByText('Open external link')).toBeInTheDocument();
    expect(screen.getByText('Apr 1, 2026')).toBeInTheDocument();
    expect(screen.getByText('Sep 30, 2026')).toBeInTheDocument();
    // Assign Team To Project is on the Team tab
    expect(screen.queryByText('Assign Team To Project')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Team' })).toBeInTheDocument();
  });

  it('shows missing project state', async () => {
    mockedFetchProjectById.mockRejectedValue(
      new ApiError('Request failed for /projects/missing', 404),
    );

    renderWithRouter('/projects/missing');

    expect(await screen.findByText('Project not found')).toBeInTheDocument();
  });

  it('shows error state', async () => {
    mockedFetchProjectById.mockRejectedValue(new Error('Project details unavailable'));

    renderWithRouter('/projects/prj-1');

    expect(await screen.findByText('Project details unavailable')).toBeInTheDocument();
  });

  it('activates a draft project', async () => {
    mockedFetchProjectById
      .mockResolvedValueOnce({
        assignmentCount: 0,
        description: 'Draft delivery initiative.',
        externalLinks: [],
        externalLinksCount: 0,
        externalLinksSummary: [],
        id: 'prj-1',
        name: 'Northstar Modernization',
        plannedEndDate: '2026-12-31T00:00:00.000Z',
        projectManagerId: 'pm-1',
        projectManagerDisplayName: null,
        projectCode: 'PRJ-900',
        startDate: '2026-07-01T00:00:00.000Z',
        status: 'DRAFT',
      })
      .mockResolvedValueOnce({
        assignmentCount: 0,
        description: 'Draft delivery initiative.',
        externalLinks: [],
        externalLinksCount: 0,
        externalLinksSummary: [],
        id: 'prj-1',
        name: 'Northstar Modernization',
        plannedEndDate: '2026-12-31T00:00:00.000Z',
        projectManagerId: 'pm-1',
        projectManagerDisplayName: null,
        projectCode: 'PRJ-900',
        startDate: '2026-07-01T00:00:00.000Z',
        status: 'ACTIVE',
      });
    mockedActivateProject.mockResolvedValue({
      id: 'prj-1',
      name: 'Northstar Modernization',
      plannedEndDate: '2026-12-31T00:00:00.000Z',
      projectCode: 'PRJ-900',
      projectManagerId: 'pm-1',
      startDate: '2026-07-01T00:00:00.000Z',
      status: 'ACTIVE',
    });

    const user = userEvent.setup();
    renderWithRouter('/projects/prj-1');

    await screen.findByRole('heading', { name: 'Northstar Modernization' });
    await user.click(screen.getByRole('button', { name: 'Activate project' }));

    await waitFor(() => {
      expect(mockedActivateProject).toHaveBeenCalledWith('prj-1');
    });

    expect(
      await screen.findByText('Project Northstar Modernization is now Active.'),
    ).toBeInTheDocument();
  });

  it('closes an active project and shows workspend summary', async () => {
    mockedFetchProjectById
      .mockResolvedValueOnce(buildActiveProject())
      .mockResolvedValueOnce({
        ...buildActiveProject(),
        status: 'CLOSED',
      });
    mockedCloseProject.mockResolvedValue({
      id: 'prj-1',
      name: 'Atlas ERP Rollout',
      projectCode: 'PRJ-102',
      status: 'CLOSED',
      workspend: {
        byRole: [{ key: 'Lead Engineer', mandays: 4.5 }],
        bySkillset: [{ key: 'Platform Delivery', mandays: 2.25 }],
        totalMandays: 4.5,
      },
    });

    const user = userEvent.setup();

    renderWithRouter('/projects/prj-1');

    await screen.findByRole('heading', { name: 'Atlas ERP Rollout' });
    await user.click(screen.getByRole('button', { name: 'Close project' }));

    // ConfirmDialog now shows — click the dialog's confirm button
    expect(await screen.findByText('Close Project')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirm close' }));

    await waitFor(() => {
      expect(mockedCloseProject).toHaveBeenCalledWith('prj-1');
    });

    expect(await screen.findByTestId('project-closure-summary')).toBeInTheDocument();
    expect(screen.getByText('Total mandays: 4.50')).toBeInTheDocument();
    expect(screen.getByText('Lead Engineer')).toBeInTheDocument();
  });

  it('renders project closure override for authorized users after conflict', async () => {
    mockedFetchProjectById
      .mockResolvedValueOnce({
        ...buildActiveProject(),
        version: 7,
      })
      .mockResolvedValueOnce({
        ...buildActiveProject(),
        status: 'CLOSED',
        version: 8,
      });
    mockedCloseProject.mockRejectedValue(
      new ApiError(
        'Project closure is blocked because active assignments still exist. Use the explicit override flow with a reason to close anyway.',
        409,
      ),
    );
    mockedCloseProjectOverride.mockResolvedValue({
      id: 'prj-1',
      name: 'Atlas ERP Rollout',
      projectCode: 'PRJ-102',
      status: 'CLOSED',
      version: 8,
      workspend: {
        byRole: [{ key: 'Lead Engineer', mandays: 4.5 }],
        bySkillset: [{ key: 'Platform Delivery', mandays: 2.25 }],
        totalMandays: 4.5,
      },
    });
    window.localStorage.setItem('deliverycentral.authToken', buildToken(['director']));

    const user = userEvent.setup();

    renderWithRouter('/projects/prj-1');

    await screen.findByRole('heading', { name: 'Atlas ERP Rollout' });
    await user.click(screen.getByRole('button', { name: 'Close project' }));

    // Click confirm in the ConfirmDialog first
    expect(await screen.findByText('Close Project')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirm close' }));

    // After the 409 conflict, Project Closure Override panel shows
    expect(await screen.findByText('Project Closure Override')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Override reason'), 'Approved emergency closure despite remaining staffing.');
    await user.click(screen.getByRole('button', { name: 'Close project with override' }));

    // ConfirmDialog for the override now shows
    expect(await screen.findByText('Confirm Closure Override')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Apply override' }));

    await waitFor(() => {
      expect(mockedCloseProjectOverride).toHaveBeenCalledWith('prj-1', {
        expectedProjectVersion: 7,
        reason: 'Approved emergency closure despite remaining staffing.',
      });
    });

    expect(
      await screen.findByText(
        'Project Atlas ERP Rollout closed by authorized override with 4.50 mandays captured from work evidence.',
      ),
    ).toBeInTheDocument();
  });

  it('requires a reason before submitting project closure override', async () => {
    mockedFetchProjectById
      .mockResolvedValueOnce({
        ...buildActiveProject(),
        version: 7,
      })
      .mockResolvedValueOnce({
        ...buildActiveProject(),
        version: 7,
      });
    mockedCloseProject.mockRejectedValue(
      new ApiError(
        'Project closure is blocked because active assignments still exist. Use the explicit override flow with a reason to close anyway.',
        409,
      ),
    );
    window.localStorage.setItem('deliverycentral.authToken', buildToken(['director']));

    const user = userEvent.setup();
    renderWithRouter('/projects/prj-1');

    await screen.findByRole('heading', { name: 'Atlas ERP Rollout' });
    await user.click(screen.getByRole('button', { name: 'Close project' }));

    // Click confirm in the ConfirmDialog
    expect(await screen.findByText('Close Project')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirm close' }));

    await waitFor(() => {
      expect(mockedCloseProject).toHaveBeenCalledWith('prj-1');
    });
    await screen.findByText('Project Closure Override');
    await user.click(screen.getByRole('button', { name: 'Close project with override' }));

    expect(screen.getByText('Override reason is required.')).toBeInTheDocument();
    expect(mockedCloseProjectOverride).not.toHaveBeenCalled();
  });

  it('does not expose project closure override before a governed conflict is raised', async () => {
    mockedFetchProjectById.mockResolvedValue(buildActiveProject());
    window.localStorage.setItem('deliverycentral.authToken', buildToken(['project_manager']));

    renderWithRouter('/projects/prj-1');

    await screen.findByRole('heading', { name: 'Atlas ERP Rollout' });
    expect(screen.queryByText('Project Closure Override')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Close project with override' }),
    ).not.toBeInTheDocument();
  });

  it('assigns a team to the project', async () => {
    mockedFetchProjectById
      .mockResolvedValueOnce(buildActiveProject())
      .mockResolvedValueOnce({
        ...buildActiveProject(),
        assignmentCount: 5,
      });
    mockedAssignTeamToProject.mockResolvedValue({
      allocationPercent: 80,
      createdAssignments: [
        {
          assignmentId: 'asn-1',
          personId: 'p-1',
          personName: 'Ethan Brooks',
        },
      ],
      createdCount: 1,
      projectId: 'prj-1',
      skippedDuplicateCount: 1,
      skippedDuplicates: [
        {
          personId: 'p-2',
          personName: 'Sophia Kim',
          reason: 'ASSIGNMENT_CONFLICT',
        },
      ],
      staffingRole: 'Delivery Lead',
      startDate: '2026-04-01T00:00:00.000Z',
      teamName: 'Alpha Squad',
      teamOrgUnitId: 'org-1',
    });

    const user = userEvent.setup();
    renderWithRouter('/projects/prj-1');

    await screen.findByRole('heading', { name: 'Atlas ERP Rollout' });
    await user.click(screen.getByRole('tab', { name: 'Team' }));

    await screen.findByText('Assign Team To Project');
    await user.selectOptions(await screen.findByLabelText('Workflow Actor'), 'resource-manager-1');
    await user.selectOptions(screen.getByLabelText('Team'), 'team-1');
    await user.type(screen.getByLabelText('Staffing Role'), 'Delivery Lead');
    await user.clear(screen.getByLabelText('Allocation Percent'));
    await user.type(screen.getByLabelText('Allocation Percent'), '80');
    await user.type(screen.getByLabelText('Start Date'), '2026-04-01');
    await user.click(screen.getByRole('button', { name: 'Assign team' }));

    await waitFor(() => {
      expect(mockedAssignTeamToProject).toHaveBeenCalledWith('prj-1', {
        actorId: 'resource-manager-1',
        allocationPercent: 80,
        staffingRole: 'Delivery Lead',
        startDate: '2026-04-01T00:00:00.000Z',
        teamOrgUnitId: 'org-1',
      });
    });

    expect(await screen.findByTestId('assign-team-result')).toBeInTheDocument();
    expect(screen.getByText('Ethan Brooks (asn-1)')).toBeInTheDocument();
    expect(screen.getByText('Sophia Kim: ASSIGNMENT_CONFLICT')).toBeInTheDocument();
  });

  it('shows assign-team validation errors', async () => {
    mockedFetchProjectById.mockResolvedValue(buildActiveProject());

    const user = userEvent.setup();
    renderWithRouter('/projects/prj-1');

    // Navigate to team tab first
    await screen.findByRole('heading', { name: 'Atlas ERP Rollout' });
    await user.click(screen.getByRole('tab', { name: 'Team' }));

    await screen.findByText('Assign Team To Project');
    await user.click(screen.getByRole('button', { name: 'Assign team' }));

    expect(screen.getByText('Workflow actor is required.')).toBeInTheDocument();
    expect(screen.getByText('Team selection is required.')).toBeInTheDocument();
    expect(screen.getByText('Staffing role is required.')).toBeInTheDocument();
    expect(screen.getByText('Start date is required.')).toBeInTheDocument();
  });

  it('navigates between tabs and shows correct content', async () => {
    mockedFetchProjectById.mockResolvedValue(buildActiveProject());
    mockedFetchAssignments.mockResolvedValue({
      items: [
        {
          allocationPercent: 80,
          approvalState: 'APPROVED',
          endDate: '2026-09-30T00:00:00.000Z',
          id: 'asn-1',
          person: { displayName: 'Alice Smith', id: 'person-1' },
          project: { displayName: 'Atlas ERP Rollout', id: 'prj-1' },
          staffingRole: 'Lead Engineer',
          startDate: '2026-04-01T00:00:00.000Z',
        },
      ],
      totalCount: 1,
    });

    const user = userEvent.setup();
    renderWithRouter('/projects/prj-1');

    // Summary tab is default — project name visible
    expect(await screen.findByRole('heading', { name: 'Atlas ERP Rollout' })).toBeInTheDocument();

    // Click Team tab
    await user.click(screen.getByRole('tab', { name: 'Team' }));
    expect(await screen.findByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Lead Engineer')).toBeInTheDocument();

    // Click back to Summary tab
    await user.click(screen.getByRole('tab', { name: 'Summary' }));
    expect(await screen.findByText('Jira-linked ERP rollout program.')).toBeInTheDocument();

    // Click Budget tab — shows budget empty state (mock has budget: null)
    await user.click(screen.getByRole('tab', { name: 'Budget' }));
    expect(await screen.findByText('Budget Summary')).toBeInTheDocument();

    // Click History tab — shows audit timeline (empty)
    await user.click(screen.getByRole('tab', { name: 'History' }));
    expect(await screen.findByText('Change History')).toBeInTheDocument();
  });

  it('shows budget health color badge on Summary tab', async () => {
    mockedFetchProjectById.mockResolvedValue(buildActiveProject());
    mockedFetchProjectBudgetDashboard.mockResolvedValue({
      budget: { capex: 50000, opex: 30000, total: 80000, fiscalYear: 2026 },
      burnDown: [],
      forecast: { projectedTotalCost: 70000, remainingBudget: 10000, onTrack: true },
      byRole: [],
      healthColor: 'yellow',
    });

    renderWithRouter('/projects/prj-1');

    await screen.findByRole('heading', { name: 'Atlas ERP Rollout' });
    expect(await screen.findByLabelText('Budget: At Risk')).toBeInTheDocument();
  });

  it('shows health badge on Summary tab', async () => {
    mockedFetchProjectById.mockResolvedValue(buildActiveProject());
    mockedFetchProjectHealth.mockResolvedValue({
      evidenceScore: 33,
      grade: 'green',
      projectId: 'prj-1',
      score: 84,
      staffingScore: 33,
      timelineScore: 18,
    });

    renderWithRouter('/projects/prj-1');

    await screen.findByRole('heading', { name: 'Atlas ERP Rollout' });
    expect(await screen.findByLabelText('Health: 84 (green)')).toBeInTheDocument();
  });
});

function renderWithRouter(initialEntry: string): void {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<ProjectDetailsPlaceholderPage />} path="/projects/:id" />
      </Routes>
    </MemoryRouter>,
  );
}

function buildActiveProject() {
  return {
    assignmentCount: 3,
    description: 'Jira-linked ERP rollout program.',
    externalLinks: [],
    externalLinksCount: 0,
    externalLinksSummary: [],
    id: 'prj-1',
    name: 'Atlas ERP Rollout',
    plannedEndDate: '2026-09-30T00:00:00.000Z',
    projectManagerId: 'pm-1',
    projectManagerDisplayName: null,
    projectCode: 'PRJ-102',
    startDate: '2026-04-01T00:00:00.000Z',
    status: 'ACTIVE',
    version: 3,
  };
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
