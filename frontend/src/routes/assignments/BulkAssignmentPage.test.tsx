import { screen, waitFor, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { bulkCreateAssignments } from '@/lib/api/assignments';
import { fetchPersonDirectory } from '@/lib/api/person-directory';
import { fetchProjectDirectory } from '@/lib/api/project-registry';
import {
  createProjectPosition,
  transitionProjectPositionFill,
  type ProjectPosition,
} from '@/lib/api/project-positions';
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

// LEAN-P2-2: bulk submit now fans out createProjectPosition +
// transitionProjectPositionFill calls per row. Mock both paths and aggregate
// in the test.
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

const mockedFetchPersonDirectory = vi.mocked(fetchPersonDirectory);
const mockedFetchProjectDirectory = vi.mocked(fetchProjectDirectory);
const mockedBulkCreateAssignments = vi.mocked(bulkCreateAssignments);
const mockedCreateProjectPosition = vi.mocked(createProjectPosition);
const mockedTransitionProjectPositionFill = vi.mocked(transitionProjectPositionFill);

function buildPosition(id: string, personId: string): ProjectPosition {
  return {
    id,
    projectId: 'project-1',
    role: 'Lead Engineer',
    requiredAllocationPercent: 50,
    fillStatus: 'BOOKED',
    activePersonId: personId,
    activeAllocationPercent: 50,
    version: 1,
  };
}

describe('BulkAssignmentPage', () => {
  beforeEach(() => {
    mockedFetchPersonDirectory.mockReset();
    mockedFetchProjectDirectory.mockReset();
    mockedBulkCreateAssignments.mockReset();
    mockedCreateProjectPosition.mockReset();
    mockedTransitionProjectPositionFill.mockReset();

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
    // LEAN-P2-2: bulk submit fans out createProjectPosition + transition per
    // row. Each row creates a DRAFT position, transitions it to BOOKED.
    let nextId = 0;
    mockedCreateProjectPosition.mockImplementation(async () => {
      nextId += 1;
      return buildPosition(`pos-${nextId}`, '');
    });
    mockedTransitionProjectPositionFill.mockImplementation(async (positionId, req) =>
      buildPosition(positionId, req.personId ?? ''),
    );

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
      expect(mockedCreateProjectPosition).toHaveBeenCalledTimes(2);
    });
    expect(mockedTransitionProjectPositionFill).toHaveBeenCalledTimes(2);
    expect(mockedTransitionProjectPositionFill).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        toStatus: 'BOOKED',
        personId: 'person-1',
        allocationPercent: 50,
      }),
    );

    expect(await screen.findByText('Batch Result Summary')).toBeInTheDocument();
    expect(screen.getByText('Created 2 assignment(s).')).toBeInTheDocument();
    expect(screen.getByText('No items failed in this batch.')).toBeInTheDocument();
  });

  it('shows per-item partial failures clearly', async () => {
    // LEAN-P2-2: fan-out creates one position per row. The second row's
    // transition throws to simulate a partial failure; the aggregator
    // emits a failedItem with the legacy code 'CREATE_FAILED'.
    let nextId = 0;
    mockedCreateProjectPosition.mockImplementation(async () => {
      nextId += 1;
      return buildPosition(`pos-${nextId}`, '');
    });
    mockedTransitionProjectPositionFill.mockImplementation(async (positionId, req) => {
      if (req.personId === 'person-2') {
        throw new Error('Person is inactive and cannot receive new assignments.');
      }
      return buildPosition(positionId, req.personId ?? '');
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

    expect(
      await screen.findByText('Created 1 of 2 assignment(s); 1 failed.'),
    ).toBeInTheDocument();
    expect(screen.getByText('CREATE_FAILED')).toBeInTheDocument();
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
