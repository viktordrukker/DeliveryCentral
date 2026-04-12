import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { fetchCases } from '@/lib/api/cases';
import { fetchPersonDirectory } from '@/lib/api/person-directory';
import { renderRoute } from '@test/render-route';
import { CasesPage } from './CasesPage';

vi.mock('@/lib/api/cases', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/cases')>('@/lib/api/cases');

  return {
    ...actual,
    fetchCases: vi.fn(),
  };
});

vi.mock('@/lib/api/person-directory', () => ({
  fetchPersonDirectory: vi.fn().mockResolvedValue({
    items: [
      { currentAssignmentCount: 0, currentLineManager: null, currentOrgUnit: null, displayName: 'Owner Two', dottedLineManagers: [], id: 'owner-2', lifecycleStatus: 'ACTIVE', primaryEmail: null, resourcePoolIds: [], resourcePools: [] },
      { currentAssignmentCount: 0, currentLineManager: null, currentOrgUnit: null, displayName: 'Subject Two', dottedLineManagers: [], id: 'subject-2', lifecycleStatus: 'ACTIVE', primaryEmail: null, resourcePoolIds: [], resourcePools: [] },
    ],
    page: 1,
    pageSize: 200,
    total: 2,
  }),
}));

const mockedFetchCases = vi.mocked(fetchCases);
const mockedFetchPersonDirectory = vi.mocked(fetchPersonDirectory);

describe('CasesPage', () => {
  beforeEach(() => {
    mockedFetchCases.mockReset();
    mockedFetchPersonDirectory.mockResolvedValue({
      items: [
        { currentAssignmentCount: 0, currentLineManager: null, currentOrgUnit: null, displayName: 'Owner Two', dottedLineManagers: [], id: 'owner-2', lifecycleStatus: 'ACTIVE', primaryEmail: null, resourcePoolIds: [], resourcePools: [] },
        { currentAssignmentCount: 0, currentLineManager: null, currentOrgUnit: null, displayName: 'Subject Two', dottedLineManagers: [], id: 'subject-2', lifecycleStatus: 'ACTIVE', primaryEmail: null, resourcePoolIds: [], resourcePools: [] },
      ],
      page: 1,
      pageSize: 200,
      total: 2,
    });
    window.localStorage.clear();
  });

  it('renders case list data', async () => {
    mockedFetchCases.mockResolvedValue({
      items: [
        {
          caseNumber: 'CASE-1001',
          caseTypeDisplayName: 'Onboarding',
          caseTypeKey: 'ONBOARDING',
          id: 'case-1',
          openedAt: '2026-04-04T09:00:00.000Z',
          ownerPersonId: 'owner-1',
          participants: [],
          relatedAssignmentId: 'asn-1',
          relatedProjectId: 'prj-1',
          status: 'OPEN',
          subjectPersonId: 'subject-1',
          summary: 'New starter needs project access review.',
        },
      ],
    });

    renderWithRouter();

    expect(await screen.findByRole('heading', { name: 'Cases' })).toBeInTheDocument();
    expect(screen.getByText('CASE-1001')).toBeInTheDocument();
    expect(screen.getByText('Onboarding')).toBeInTheDocument();
    expect(screen.getByText('subject-1')).toBeInTheDocument();
    expect(screen.getByText('owner-1')).toBeInTheDocument();
    expect(screen.getByText('New starter needs project access review.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open case' })).toHaveAttribute('href', '/cases/case-1');
  });

  it('shows empty state when no cases are returned', async () => {
    mockedFetchCases.mockResolvedValue({ items: [] });

    renderWithRouter();

    expect(await screen.findByText('No cases open')).toBeInTheDocument();
    expect(screen.getByText('No cases are available for the current filters.')).toBeInTheDocument();
  });

  it('applies filters through the backend query contract', async () => {
    mockedFetchCases
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValue({
        items: [
          {
            caseNumber: 'CASE-2002',
            caseTypeDisplayName: 'Onboarding',
            caseTypeKey: 'ONBOARDING',
            id: 'case-2',
            openedAt: '2026-04-05T09:00:00.000Z',
            ownerPersonId: 'owner-2',
            participants: [],
            status: 'OPEN',
            subjectPersonId: 'subject-2',
            summary: 'Filtered result',
          },
        ],
      });

    const { user } = renderWithRouter();

    await screen.findByText('No cases open');

    await user.type(screen.getByLabelText('Case Type'), 'ONBOARDING');
    await user.selectOptions(await screen.findByLabelText('Owner Person'), 'owner-2');
    await user.selectOptions(await screen.findByLabelText('Subject Person'), 'subject-2');

    await waitFor(() => {
      expect(mockedFetchCases).toHaveBeenLastCalledWith({
        caseTypeKey: 'ONBOARDING',
        ownerPersonId: 'owner-2',
        subjectPersonId: 'subject-2',
      });
    });

    expect(await screen.findByText('CASE-2002')).toBeInTheDocument();
  });
});

function renderWithRouter() {
  return renderRoute(
    <Routes>
      <Route element={<CasesPage />} path="/cases" />
      <Route element={<div>Case Details</div>} path="/cases/:id" />
      <Route element={<div>Create Case</div>} path="/cases/new" />
    </Routes>,
    {
      initialEntries: ['/cases'],
    },
  );
}
