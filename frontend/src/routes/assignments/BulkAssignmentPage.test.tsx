import { screen, waitFor, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { bulkCreateAssignments } from '@/lib/api/assignments';
import { fetchPersonDirectory } from '@/lib/api/person-directory';
import { fetchProjectDirectory } from '@/lib/api/project-registry';
import { renderRoute } from '@test/render-route';
import { BulkAssignmentPage } from './BulkAssignmentPage';

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({ principal: { personId: 'test-actor-id', roles: ['admin'] } }),
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
    bulkCreateAssignments: vi.fn(),
  };
});

const mockedFetchPersonDirectory = vi.mocked(fetchPersonDirectory);
const mockedFetchProjectDirectory = vi.mocked(fetchProjectDirectory);
const mockedBulkCreateAssignments = vi.mocked(bulkCreateAssignments);

describe('BulkAssignmentPage', () => {
  beforeEach(() => {
    mockedFetchPersonDirectory.mockReset();
    mockedFetchProjectDirectory.mockReset();
    mockedBulkCreateAssignments.mockReset();

    mockedFetchPersonDirectory.mockResolvedValue({
      items: buildPeople(),
      page: 1,
      pageSize: 100,
      total: 3,
    });
    mockedFetchProjectDirectory.mockResolvedValue({
      items: buildProjects(),
    });
  });

  it('submits a bulk assignment batch successfully', async () => {
    mockedBulkCreateAssignments.mockResolvedValue({
      createdCount: 2,
      createdItems: [
        {
          assignment: {
            allocationPercent: 50,
            id: 'asn-1',
            personId: 'person-1',
            projectId: 'project-1',
            requestedAt: '2026-03-30T00:00:00.000Z',
            staffingRole: 'Lead Engineer',
            startDate: '2026-04-01',
            status: 'PROPOSED',
          },
          index: 0,
        },
        {
          assignment: {
            allocationPercent: 50,
            id: 'asn-2',
            personId: 'person-2',
            projectId: 'project-1',
            requestedAt: '2026-03-30T00:00:00.000Z',
            staffingRole: 'Lead Engineer',
            startDate: '2026-04-01',
            status: 'PROPOSED',
          },
          index: 1,
        },
      ],
      failedCount: 0,
      failedItems: [],
      message: '2 assignments created. 0 failed.',
      strategy: 'PARTIAL_SUCCESS',
      totalCount: 2,
    });

    const { user } = renderWithRouter();

    await screen.findByText('Bulk Assignment Request');

    await user.selectOptions(screen.getByLabelText('Requested By'), 'person-3');
    await user.selectOptions(screen.getByLabelText('Project'), 'project-1');
    await user.type(screen.getByLabelText('Staffing Role'), 'Lead Engineer');
    await user.type(screen.getByLabelText('Allocation Percent'), '50');
    await user.type(screen.getByLabelText('Start Date'), '2026-04-01');
    await user.click(screen.getByLabelText('Ethan Brooks'));
    await user.click(screen.getByLabelText('Mia Lopez'));
    await user.click(screen.getByRole('button', { name: 'Submit bulk assignment' }));

    await waitFor(() => {
      expect(mockedBulkCreateAssignments).toHaveBeenCalledWith({
        actorId: 'person-3',
        entries: [
          {
            allocationPercent: 50,
            personId: 'person-1',
            projectId: 'project-1',
            staffingRole: 'Lead Engineer',
            startDate: '2026-04-01',
          },
          {
            allocationPercent: 50,
            personId: 'person-2',
            projectId: 'project-1',
            staffingRole: 'Lead Engineer',
            startDate: '2026-04-01',
          },
        ],
      });
    });

    expect(await screen.findByText('Batch Result Summary')).toBeInTheDocument();
    expect(screen.getByText('2 assignments created. 0 failed.')).toBeInTheDocument();
    expect(screen.getByText('No items failed in this batch.')).toBeInTheDocument();
  });

  it('shows per-item partial failures clearly', async () => {
    mockedBulkCreateAssignments.mockResolvedValue({
      createdCount: 1,
      createdItems: [
        {
          assignment: {
            allocationPercent: 50,
            id: 'asn-1',
            personId: 'person-1',
            projectId: 'project-1',
            requestedAt: '2026-03-30T00:00:00.000Z',
            staffingRole: 'Lead Engineer',
            startDate: '2026-04-01',
            status: 'PROPOSED',
          },
          index: 0,
        },
      ],
      failedCount: 1,
      failedItems: [
        {
          code: 'PERSON_INACTIVE',
          index: 1,
          message: 'Person is inactive and cannot receive new assignments.',
          personId: 'person-2',
          projectId: 'project-1',
          staffingRole: 'Lead Engineer',
        },
      ],
      message: '1 assignment created. 1 failed.',
      strategy: 'PARTIAL_SUCCESS',
      totalCount: 2,
    });

    const { user } = renderWithRouter();

    await screen.findByText('Bulk Assignment Request');

    await user.selectOptions(screen.getByLabelText('Requested By'), 'person-3');
    await user.selectOptions(screen.getByLabelText('Project'), 'project-1');
    await user.type(screen.getByLabelText('Staffing Role'), 'Lead Engineer');
    await user.type(screen.getByLabelText('Allocation Percent'), '50');
    await user.type(screen.getByLabelText('Start Date'), '2026-04-01');
    await user.click(screen.getByLabelText('Ethan Brooks'));
    await user.click(screen.getByLabelText('Mia Lopez'));
    await user.click(screen.getByRole('button', { name: 'Submit bulk assignment' }));

    expect(await screen.findByText('1 assignment created. 1 failed.')).toBeInTheDocument();
    expect(screen.getByText('PERSON_INACTIVE')).toBeInTheDocument();
    expect(screen.getByText('Person is inactive and cannot receive new assignments.')).toBeInTheDocument();

    const failedItemsSection = screen.getByRole('heading', { name: 'Failed Items' }).closest('section');
    expect(failedItemsSection).not.toBeNull();
    expect(within(failedItemsSection as HTMLElement).getByText('Mia Lopez')).toBeInTheDocument();
  });
});

function buildPeople() {
  return [
    {
      currentAssignmentCount: 1,
      currentLineManager: null,
      currentOrgUnit: {
        code: 'DEL-OPS',
        id: 'org-1',
        name: 'Delivery Operations',
      },
      displayName: 'Ethan Brooks',
      dottedLineManagers: [],
      grade: null,
      id: 'person-1',
      primaryEmail: 'ethan.brooks@example.com',
      lifecycleStatus: 'ACTIVE',
      resourcePoolIds: ['team-1'],
      resourcePools: [],
      role: null, hiredAt: null, terminatedAt: null,
    },
    {
      currentAssignmentCount: 0,
      currentLineManager: null,
      currentOrgUnit: {
        code: 'DEL-OPS',
        id: 'org-1',
        name: 'Delivery Operations',
      },
      displayName: 'Mia Lopez',
      dottedLineManagers: [],
      grade: null,
      id: 'person-2',
      primaryEmail: 'mia.lopez@example.com',
      lifecycleStatus: 'ACTIVE',
      resourcePoolIds: [],
      resourcePools: [],
      role: null, hiredAt: null, terminatedAt: null,
    },
    {
      currentAssignmentCount: 0,
      currentLineManager: null,
      currentOrgUnit: {
        code: 'DEL-OPS',
        id: 'org-1',
        name: 'Delivery Operations',
      },
      displayName: 'Sophia Kim',
      dottedLineManagers: [],
      grade: null,
      id: 'person-3',
      primaryEmail: 'sophia.kim@example.com',
      lifecycleStatus: 'ACTIVE',
      resourcePoolIds: [],
      resourcePools: [],
      role: null, hiredAt: null, terminatedAt: null,
    },
  ];
}

function buildProjects() {
  return [
    {
      assignmentCount: 2,
      externalLinksCount: 0,
      externalLinksSummary: [],
      id: 'project-1',
      name: 'Atlas ERP Rollout',
      projectCode: 'PRJ-102',
      status: 'ASSIGNED',
    },
  ];
}

function renderWithRouter() {
  return renderRoute(
    <Routes>
      <Route element={<BulkAssignmentPage />} path="/assignments/bulk" />
    </Routes>,
    {
      initialEntries: ['/assignments/bulk'],
    },
  );
}
