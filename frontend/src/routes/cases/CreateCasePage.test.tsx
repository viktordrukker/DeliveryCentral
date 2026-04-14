import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { fetchAssignments } from '@/lib/api/assignments';
import { createCase } from '@/lib/api/cases';
import { fetchPersonDirectory } from '@/lib/api/person-directory';
import { fetchProjectDirectory } from '@/lib/api/project-registry';
import { renderRoute } from '@test/render-route';
import { CreateCasePage } from './CreateCasePage';

vi.mock('@/lib/api/cases', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/cases')>('@/lib/api/cases');

  return {
    ...actual,
    createCase: vi.fn(),
  };
});

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
    fetchProjectDirectory: vi.fn(),
  };
});

vi.mock('@/lib/api/assignments', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/assignments')>(
    '@/lib/api/assignments',
  );

  return {
    ...actual,
    fetchAssignments: vi.fn(),
  };
});

const mockedCreateCase = vi.mocked(createCase);
const mockedFetchPersonDirectory = vi.mocked(fetchPersonDirectory);
const mockedFetchProjectDirectory = vi.mocked(fetchProjectDirectory);
const mockedFetchAssignments = vi.mocked(fetchAssignments);

describe('CreateCasePage', () => {
  beforeEach(() => {
    mockedCreateCase.mockReset();
    mockedFetchPersonDirectory.mockReset();
    mockedFetchProjectDirectory.mockReset();
    mockedFetchAssignments.mockReset();
    window.localStorage.clear();

    mockedFetchPersonDirectory.mockResolvedValue({
      items: [
        {
          currentAssignmentCount: 1,
          currentLineManager: null,
          currentOrgUnit: { code: 'ORG-APP', id: 'org-1', name: 'Application Engineering' },
          displayName: 'Casey Nguyen',
          dottedLineManagers: [],
          grade: null,
          id: 'person-1',
          primaryEmail: 'casey.nguyen@example.com',
          lifecycleStatus: 'ACTIVE',
          resourcePoolIds: [],
          resourcePools: [],
          role: null,
        },
        {
          currentAssignmentCount: 2,
          currentLineManager: null,
          currentOrgUnit: { code: 'ORG-HR', id: 'org-2', name: 'Human Resources' },
          displayName: 'Jordan Patel',
          dottedLineManagers: [],
          grade: null,
          id: 'person-2',
          primaryEmail: 'jordan.patel@example.com',
          lifecycleStatus: 'ACTIVE',
          resourcePoolIds: [],
          resourcePools: [],
          role: null,
        },
      ],
      page: 1,
      pageSize: 100,
      total: 2,
    });

    mockedFetchProjectDirectory.mockResolvedValue({
      items: [
        {
          assignmentCount: 3,
          externalLinksCount: 0,
          externalLinksSummary: [],
          id: 'prj-1',
          name: 'Northstar Modernization',
          projectCode: 'PRJ-100',
          status: 'ACTIVE',
        },
      ],
    });

    mockedFetchAssignments.mockResolvedValue({
      items: [
        {
          allocationPercent: 50,
          approvalState: 'APPROVED',
          endDate: null,
          id: 'asn-1',
          person: { displayName: 'Casey Nguyen', id: 'person-1' },
          project: { displayName: 'Northstar Modernization', id: 'prj-1' },
          staffingRole: 'Analyst',
          startDate: '2026-04-01T00:00:00.000Z',
        },
      ],
      totalCount: 1,
    });
  });

  it('renders and submits the create case flow', async () => {
    mockedCreateCase.mockResolvedValue({
      caseNumber: 'CASE-3001',
      caseTypeDisplayName: 'Onboarding',
      caseTypeKey: 'ONBOARDING',
      id: 'case-1',
      openedAt: '2026-04-04T12:00:00.000Z',
      ownerPersonId: 'person-2',
      participants: [],
      relatedAssignmentId: 'asn-1',
      relatedProjectId: 'prj-1',
      status: 'OPEN',
      subjectPersonId: 'person-1',
      summary: 'Provision access and confirm onboarding readiness.',
    });

    const { user } = renderWithRouter();

    expect(await screen.findByText('Create Case')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Subject Person'), 'person-1');
    await user.selectOptions(screen.getByLabelText('Owner'), 'person-2');
    await user.selectOptions(screen.getByLabelText('Related Project'), 'prj-1');
    await user.selectOptions(screen.getByLabelText('Related Assignment'), 'asn-1');
    await user.type(
      screen.getByLabelText('Summary'),
      'Provision access and confirm onboarding readiness.',
    );
    await user.click(screen.getByRole('button', { name: 'Create case' }));

    await waitFor(() => {
      expect(mockedCreateCase).toHaveBeenCalledWith({
        caseTypeKey: 'ONBOARDING',
        ownerPersonId: 'person-2',
        relatedAssignmentId: 'asn-1',
        relatedProjectId: 'prj-1',
        subjectPersonId: 'person-1',
        summary: 'Provision access and confirm onboarding readiness.',
      });
    });

    expect(await screen.findByText('Case Details')).toBeInTheDocument();
  });

  it('shows validation errors before submission', async () => {
    const { user } = renderWithRouter();

    await screen.findByText('Create Case');
    await user.click(screen.getByRole('button', { name: 'Create case' }));

    expect(screen.getByText('Subject person is required.')).toBeInTheDocument();
    expect(screen.getByText('Owner is required.')).toBeInTheDocument();
  });
});

function renderWithRouter() {
  return renderRoute(
    <Routes>
      <Route element={<CreateCasePage />} path="/cases/new" />
      <Route element={<div>Case Details</div>} path="/cases/:id" />
      <Route element={<div>Cases</div>} path="/cases" />
    </Routes>,
    {
      initialEntries: ['/cases/new'],
    },
  );
}
