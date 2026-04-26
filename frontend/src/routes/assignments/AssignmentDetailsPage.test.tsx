import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import {
  endAssignment,
  fetchAssignmentById,
  transitionAssignment,
} from '@/lib/api/assignments';
import { fetchBusinessAudit } from '@/lib/api/business-audit';
import { AssignmentDetailsPlaceholderPage } from './AssignmentDetailsPlaceholderPage';

vi.mock('@/lib/api/assignments', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/assignments')>('@/lib/api/assignments');
  return {
    ...actual,
    approveAssignment: vi.fn(),
    endAssignment: vi.fn(),
    fetchAssignmentById: vi.fn(),
    rejectAssignment: vi.fn(),
    transitionAssignment: vi.fn(),
  };
});

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    principal: { personId: 'manager-1', roles: ['project_manager'] },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('@/lib/api/business-audit', () => ({
  fetchBusinessAudit: vi.fn(),
}));

const mockedFetchAssignmentById = vi.mocked(fetchAssignmentById);
const mockedEndAssignment = vi.mocked(endAssignment);
const mockedTransitionAssignment = vi.mocked(transitionAssignment);
const mockedFetchBusinessAudit = vi.mocked(fetchBusinessAudit);

describe('AssignmentDetailsPage', () => {
  beforeEach(() => {
    mockedFetchAssignmentById.mockReset();
    mockedEndAssignment.mockReset();
    mockedTransitionAssignment.mockReset();
    mockedFetchBusinessAudit.mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 100 });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('renders dynamic transition buttons for the current status', async () => {
    mockedFetchAssignmentById.mockResolvedValue(buildAssignmentDetails());

    renderWithRouter('/assignments/asn-1');

    // PROPOSED state → Book, Reject, Cancel are available to project_manager
    expect((await screen.findAllByText('PROPOSED')).length).toBeGreaterThan(0);
    expect(screen.getByTestId('transition-booked')).toBeInTheDocument();
    expect(screen.getByTestId('transition-rejected')).toBeInTheDocument();
    expect(screen.getByTestId('transition-cancelled')).toBeInTheDocument();
    expect(screen.getByText('Lifecycle History')).toBeInTheDocument();
  });

  it('runs book transition and revalidates', async () => {
    mockedFetchAssignmentById
      .mockResolvedValueOnce(buildAssignmentDetails())
      .mockResolvedValueOnce(
        buildAssignmentDetails({
          approvalState: 'BOOKED',
          canApprove: false,
          canEnd: true,
          canReject: false,
          history: [
            buildHistoryItem('STATUS_BOOKED', {
              changeReason: undefined,
              changedByPersonId: 'manager-1',
              id: 'hist-2',
            }),
            buildHistoryItem('STATUS_PROPOSED'),
          ],
        }),
      );
    mockedTransitionAssignment.mockResolvedValue({
      allocationPercent: 50,
      id: 'asn-1',
      personId: 'person-1',
      projectId: 'project-1',
      requestedAt: '2025-03-10T10:00:00.000Z',
      staffingRole: 'Lead Engineer',
      startDate: '2025-02-01T00:00:00.000Z',
      status: 'BOOKED',
    });

    const user = userEvent.setup();
    renderWithRouter('/assignments/asn-1');

    await user.click(await screen.findByTestId('transition-booked'));
    const bookDialog = await screen.findByRole('dialog');
    await user.click(within(bookDialog).getByRole('button', { name: 'Book' }));

    await waitFor(() => {
      expect(mockedTransitionAssignment).toHaveBeenCalledWith('asn-1', 'BOOKED', {
        reason: undefined,
      });
    });

    expect(await screen.findByText(/Assignment moved to booked\./)).toBeInTheDocument();
    expect(screen.getAllByText('BOOKED').length).toBeGreaterThan(0);
  });

  it('runs reject transition with a required reason', async () => {
    mockedFetchAssignmentById
      .mockResolvedValueOnce(buildAssignmentDetails())
      .mockResolvedValueOnce(
        buildAssignmentDetails({
          approvalState: 'REJECTED',
          canApprove: false,
          canEnd: false,
          canReject: false,
          history: [
            buildHistoryItem('STATUS_REJECTED', {
              changeReason: 'Capacity unavailable.',
              changedByPersonId: 'manager-1',
              id: 'hist-2',
            }),
            buildHistoryItem('STATUS_PROPOSED'),
          ],
        }),
      );
    mockedTransitionAssignment.mockResolvedValue({
      allocationPercent: 50,
      id: 'asn-1',
      personId: 'person-1',
      projectId: 'project-1',
      requestedAt: '2025-03-10T10:00:00.000Z',
      staffingRole: 'Lead Engineer',
      startDate: '2025-02-01T00:00:00.000Z',
      status: 'REJECTED',
    });

    const user = userEvent.setup();
    renderWithRouter('/assignments/asn-1');

    await user.click(await screen.findByTestId('transition-rejected'));
    const rejectDialog = await screen.findByRole('dialog');
    await user.type(within(rejectDialog).getByLabelText('Reason'), 'Capacity unavailable.');
    await user.click(within(rejectDialog).getByRole('button', { name: 'Reject' }));

    await waitFor(() => {
      expect(mockedTransitionAssignment).toHaveBeenCalledWith('asn-1', 'REJECTED', {
        reason: 'Capacity unavailable.',
      });
    });

    expect(await screen.findByText(/Assignment moved to rejected\./)).toBeInTheDocument();
    expect(screen.getAllByText('REJECTED').length).toBeGreaterThan(0);
  });

  it('renders completed history and no further transitions when completed', async () => {
    mockedFetchAssignmentById.mockResolvedValueOnce(
      buildAssignmentDetails({
        approvalState: 'COMPLETED',
        canApprove: false,
        canEnd: false,
        canReject: false,
        endDate: '2025-03-31T00:00:00.000Z',
        history: [
          buildHistoryItem('STATUS_COMPLETED', {
            changeReason: 'Rolled off cleanly.',
            changedByPersonId: 'manager-1',
            id: 'hist-3',
            newSnapshot: { status: 'COMPLETED', validTo: '2025-03-31T00:00:00.000Z' },
            occurredAt: '2025-03-31T12:00:00.000Z',
            previousSnapshot: { status: 'ASSIGNED', validTo: '2025-04-30T23:59:59.999Z' },
          }),
          buildHistoryItem('STATUS_ASSIGNED'),
          buildHistoryItem('STATUS_PROPOSED'),
        ],
      }),
    );

    renderWithRouter('/assignments/asn-1');

    expect((await screen.findAllByText('COMPLETED')).length).toBeGreaterThan(0);
    expect(screen.queryByTestId('transition-booked')).not.toBeInTheDocument();
    expect(screen.queryByTestId('transition-rejected')).not.toBeInTheDocument();
    expect(screen.queryByTestId('transition-cancelled')).not.toBeInTheDocument();
    expect(screen.getAllByText('Rolled off cleanly.').length).toBeGreaterThan(0);
  });
});

function buildAssignmentDetails(
  overrides: Partial<Awaited<ReturnType<typeof fetchAssignmentById>>> = {},
) {
  return {
    allocationPercent: 50,
    approvalState: 'PROPOSED',
    approvals: [],
    canApprove: true,
    canEnd: false,
    canReject: true,
    endDate: '2025-04-30T23:59:59.999Z',
    history: [buildHistoryItem('STATUS_PROPOSED')],
    id: 'asn-1',
    note: 'Needs approval.',
    person: { displayName: 'Ethan Brooks', id: 'person-1' },
    project: { displayName: 'Atlas ERP Rollout', id: 'project-1' },
    requestedAt: '2025-03-10T10:00:00.000Z',
    requestedByPersonId: 'manager-1',
    staffingRole: 'Lead Engineer',
    startDate: '2025-02-01T00:00:00.000Z',
    ...overrides,
  };
}

function buildHistoryItem(changeType: string, overrides: Record<string, unknown> = {}) {
  return {
    changeReason: 'Initial assignment request created.',
    changeType,
    changedByPersonId: 'manager-1',
    id: 'hist-1',
    newSnapshot: { status: 'PROPOSED' },
    occurredAt: '2025-03-10T10:00:00.000Z',
    previousSnapshot: undefined,
    ...overrides,
  };
}

function renderWithRouter(initialEntry: string): void {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<AssignmentDetailsPlaceholderPage />} path="/assignments/:id" />
      </Routes>
    </MemoryRouter>,
  );
}
