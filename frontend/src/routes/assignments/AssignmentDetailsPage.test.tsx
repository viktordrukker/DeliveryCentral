import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import {
  approveAssignment,
  endAssignment,
  fetchAssignmentById,
  rejectAssignment,
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
const mockedApproveAssignment = vi.mocked(approveAssignment);
const mockedEndAssignment = vi.mocked(endAssignment);
const mockedRejectAssignment = vi.mocked(rejectAssignment);
const mockedFetchBusinessAudit = vi.mocked(fetchBusinessAudit);

describe('AssignmentDetailsPage', () => {
  beforeEach(() => {
    mockedFetchAssignmentById.mockReset();
    mockedApproveAssignment.mockReset();
    mockedEndAssignment.mockReset();
    mockedRejectAssignment.mockReset();
    mockedFetchBusinessAudit.mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 100 });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('renders action buttons in a valid state', async () => {
    mockedFetchAssignmentById.mockResolvedValue(buildAssignmentDetails());

    renderWithRouter('/assignments/asn-1');

    expect((await screen.findAllByText('REQUESTED')).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Approve assignment' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject assignment' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'End assignment' })).toBeInTheDocument();
    expect(screen.getByText('Lifecycle History')).toBeInTheDocument();
    expect(screen.getByText('Assignment Created')).toBeInTheDocument();
  });

  it('runs approve flow and revalidates', async () => {
    mockedFetchAssignmentById
      .mockResolvedValueOnce(buildAssignmentDetails())
      .mockResolvedValueOnce(
        buildAssignmentDetails({
          approvalState: 'APPROVED',
          canApprove: false,
          canEnd: true,
          canReject: false,
          history: [
            buildHistoryItem('ASSIGNMENT_APPROVED', {
              changeReason: 'Approved for rollout.',
              changedByPersonId: 'manager-1',
              id: 'hist-2',
            }),
            buildHistoryItem('ASSIGNMENT_CREATED'),
          ],
        }),
      );
    mockedApproveAssignment.mockResolvedValue({
      allocationPercent: 50,
      id: 'asn-1',
      personId: 'person-1',
      projectId: 'project-1',
      requestedAt: '2025-03-10T10:00:00.000Z',
      staffingRole: 'Lead Engineer',
      startDate: '2025-02-01T00:00:00.000Z',
      status: 'APPROVED',
    });

    const user = userEvent.setup();
    renderWithRouter('/assignments/asn-1');

    expect((await screen.findAllByText('REQUESTED')).length).toBeGreaterThan(0);
    await user.type(screen.getByLabelText('Approval Comment'), 'Approved for rollout.');
    await user.click(screen.getByRole('button', { name: 'Approve assignment' }));

    // ConfirmDialog now shows — click Approve
    expect(await screen.findByText('Approve Assignment')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => {
      expect(mockedApproveAssignment).toHaveBeenCalledWith('asn-1', {
        actorId: 'manager-1',
        comment: 'Approved for rollout.',
      });
    });

    expect(await screen.findByText('Assignment approved successfully.')).toBeInTheDocument();
    expect(screen.getAllByText('APPROVED').length).toBeGreaterThan(0);
  });

  it('runs reject flow and revalidates', async () => {
    mockedFetchAssignmentById
      .mockResolvedValueOnce(buildAssignmentDetails())
      .mockResolvedValueOnce(
        buildAssignmentDetails({
          approvalState: 'REJECTED',
          canApprove: false,
          canEnd: false,
          canReject: false,
          history: [
            buildHistoryItem('ASSIGNMENT_REJECTED', {
              changeReason: 'Capacity unavailable.',
              changedByPersonId: 'manager-1',
              id: 'hist-2',
            }),
            buildHistoryItem('ASSIGNMENT_CREATED'),
          ],
        }),
      );
    mockedRejectAssignment.mockResolvedValue({
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

    expect((await screen.findAllByText('REQUESTED')).length).toBeGreaterThan(0);
    await user.type(screen.getByLabelText('Rejection Reason'), 'Capacity unavailable.');
    await user.click(screen.getByRole('button', { name: 'Reject assignment' }));

    // ConfirmDialog now shows — click Reject
    expect(await screen.findByText('Reject Assignment')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reject' }));

    await waitFor(() => {
      expect(mockedRejectAssignment).toHaveBeenCalledWith('asn-1', {
        actorId: 'manager-1',
        reason: 'Capacity unavailable.',
      });
    });

    expect(await screen.findByText('Assignment rejected successfully.')).toBeInTheDocument();
    expect(screen.getAllByText('REJECTED').length).toBeGreaterThan(0);
  });

  it('runs end flow and refreshes lifecycle history', async () => {
    mockedFetchAssignmentById
      .mockResolvedValueOnce(
        buildAssignmentDetails({
          approvalState: 'APPROVED',
          canApprove: false,
          canEnd: true,
          canReject: false,
          history: [
            buildHistoryItem('ASSIGNMENT_APPROVED', {
              changeReason: 'Approved for rollout.',
              changedByPersonId: 'manager-1',
              id: 'hist-2',
            }),
            buildHistoryItem('ASSIGNMENT_CREATED'),
          ],
        }),
      )
      .mockResolvedValueOnce(
        buildAssignmentDetails({
          approvalState: 'ENDED',
          canApprove: false,
          canEnd: false,
          canReject: false,
          endDate: '2025-03-31T00:00:00.000Z',
          history: [
            buildHistoryItem('ASSIGNMENT_ENDED', {
              changeReason: 'Rolled off cleanly.',
              changedByPersonId: 'manager-1',
              id: 'hist-3',
              newSnapshot: { status: 'ENDED', validTo: '2025-03-31T00:00:00.000Z' },
              occurredAt: '2025-03-31T12:00:00.000Z',
              previousSnapshot: { status: 'APPROVED', validTo: '2025-04-30T23:59:59.999Z' },
            }),
            buildHistoryItem('ASSIGNMENT_APPROVED', {
              changeReason: 'Approved for rollout.',
              changedByPersonId: 'manager-1',
              id: 'hist-2',
            }),
            buildHistoryItem('ASSIGNMENT_CREATED'),
          ],
        }),
      );
    mockedEndAssignment.mockResolvedValue({
      allocationPercent: 50,
      endDate: '2025-03-31T00:00:00.000Z',
      id: 'asn-1',
      personId: 'person-1',
      projectId: 'project-1',
      requestedAt: '2025-03-10T10:00:00.000Z',
      staffingRole: 'Lead Engineer',
      startDate: '2025-02-01T00:00:00.000Z',
      status: 'ENDED',
    });

    const user = userEvent.setup();
    renderWithRouter('/assignments/asn-1');

    expect((await screen.findAllByText('APPROVED')).length).toBeGreaterThan(0);
    await user.type(screen.getByLabelText('End Date'), '2025-03-31');
    await user.type(screen.getByLabelText('End Reason'), 'Rolled off cleanly.');
    await user.click(screen.getByRole('button', { name: 'End assignment' }));

    // ConfirmDialog now shows — click confirm
    expect(await screen.findByText('End Assignment')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirm end' }));

    await waitFor(() => {
      expect(mockedEndAssignment).toHaveBeenCalledWith('asn-1', {
        actorId: 'manager-1',
        endDate: '2025-03-31T00:00:00.000Z',
        reason: 'Rolled off cleanly.',
      });
    });

    expect(await screen.findByText('Assignment ended successfully.')).toBeInTheDocument();
    expect(screen.getByText('Assignment Ended')).toBeInTheDocument();
    expect(screen.getAllByText('Rolled off cleanly.').length).toBeGreaterThan(0);
  });
});

function buildAssignmentDetails(
  overrides: Partial<Awaited<ReturnType<typeof fetchAssignmentById>>> = {},
) {
  return {
    allocationPercent: 50,
    approvalState: 'REQUESTED',
    approvals: [],
    canApprove: true,
    canEnd: false,
    canReject: true,
    endDate: '2025-04-30T23:59:59.999Z',
    history: [buildHistoryItem('ASSIGNMENT_CREATED')],
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
    newSnapshot: { status: 'REQUESTED' },
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
