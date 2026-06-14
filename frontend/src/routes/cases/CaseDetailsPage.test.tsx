import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { ApiError } from '@/lib/api/http-client';
import { fetchCaseById, fetchCaseComments, fetchCaseSteps } from '@/lib/api/cases';
import { CaseDetailsPage } from './CaseDetailsPage';

vi.mock('@/app/auth-context', async () => {
  const actual = await vi.importActual<typeof import('@/app/auth-context')>('@/app/auth-context');
  return {
    ...actual,
    useAuth: () => ({ principal: { personId: 'test-user', roles: ['hr_manager'] }, isLoading: false }),
  };
});

vi.mock('@/lib/api/cases', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/cases')>('@/lib/api/cases');

  return {
    ...actual,
    fetchCaseById: vi.fn(),
    fetchCaseSteps: vi.fn().mockResolvedValue([]),
    fetchCaseComments: vi.fn().mockResolvedValue([]),
  };
});

const mockedFetchCaseById = vi.mocked(fetchCaseById);
const mockedFetchCaseSteps = vi.mocked(fetchCaseSteps);
const mockedFetchCaseComments = vi.mocked(fetchCaseComments);

describe('CaseDetailsPage', () => {
  beforeEach(() => {
    mockedFetchCaseById.mockReset();
    mockedFetchCaseSteps.mockResolvedValue([]);
    mockedFetchCaseComments.mockResolvedValue([]);
    window.localStorage.clear();
  });

  it('renders case detail data', async () => {
    mockedFetchCaseById.mockResolvedValue({
      caseNumber: 'CASE-4001',
      caseTypeDisplayName: 'Onboarding',
      caseTypeKey: 'ONBOARDING',
      id: 'case-1',
      openedAt: '2026-04-04T12:00:00.000Z',
      ownerPersonId: 'owner-1',
      participants: [
        {
          personId: 'owner-1',
          personName: 'Owner One',
          role: 'OWNER',
        },
      ],
      relatedAssignmentId: 'asn-1',
      relatedAssignmentRole: 'Senior Engineer',
      relatedProjectId: 'prj-1',
      status: 'OPEN',
      subjectPersonId: 'subject-1',
      summary: 'Follow up on onboarding access approvals.',
    });

    renderWithRouter('/cases/case-1');

    expect(await screen.findByRole('heading', { name: 'CASE-4001' })).toBeInTheDocument();
    expect(screen.getAllByText('Onboarding').length).toBeGreaterThan(0);
    expect(screen.getByText('OPEN')).toBeInTheDocument();
    expect(screen.getByText('Follow up on onboarding access approvals.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'subject-1' })).toHaveAttribute('href', '/people/subject-1');
    expect(screen.getByRole('link', { name: 'prj-1' })).toHaveAttribute('href', '/projects/prj-1');
    // SC-7 — Related Position link shows the role label, not the raw position id.
    expect(screen.getByRole('link', { name: 'Senior Engineer' })).toHaveAttribute('href', '/projects/prj-1?position=asn-1');
    expect(screen.queryByText('asn-1')).not.toBeInTheDocument();
    expect(screen.getByText('OWNER')).toBeInTheDocument();
    // SC-7 — Participants table shows the resolved name, not the raw UUID.
    expect(screen.getByText('Owner One')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open person' })).toHaveAttribute('href', '/people/owner-1');
  });

  it('shows the comment author name, not a UUID (SC-7)', async () => {
    mockedFetchCaseById.mockResolvedValue({
      caseNumber: 'CASE-4002',
      caseTypeDisplayName: 'Onboarding',
      caseTypeKey: 'ONBOARDING',
      id: 'case-2',
      openedAt: '2026-04-04T12:00:00.000Z',
      ownerPersonId: 'owner-1',
      participants: [],
      status: 'OPEN',
      subjectPersonId: 'subject-1',
      summary: 'x',
    });
    mockedFetchCaseComments.mockResolvedValue([
      {
        authorPersonId: '99999999-aaaa-bbbb-cccc-dddddddddddd',
        authorPersonName: 'Cara Diaz',
        body: 'Looks good.',
        createdAt: '2026-04-05T09:00:00.000Z',
        id: 'cmt-1',
      },
    ]);

    renderWithRouter('/cases/case-2');

    expect(await screen.findByText('Cara Diaz')).toBeInTheDocument();
    expect(screen.queryByText(/99999999/)).not.toBeInTheDocument();
  });

  it('shows not found state for missing cases', async () => {
    mockedFetchCaseById.mockRejectedValue(new ApiError('Request failed for /cases/missing', 404));

    renderWithRouter('/cases/missing');

    expect(await screen.findByText('Case not found')).toBeInTheDocument();
    expect(screen.getByText('No case was found for missing.')).toBeInTheDocument();
  });
});

function renderWithRouter(initialEntry: string): void {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<CaseDetailsPage />} path="/cases/:id" />
        <Route element={<div>Person Details</div>} path="/people/:id" />
        <Route element={<div>Project Details</div>} path="/projects/:id" />
        <Route element={<div>Cases</div>} path="/cases" />
      </Routes>
    </MemoryRouter>,
  );
}
