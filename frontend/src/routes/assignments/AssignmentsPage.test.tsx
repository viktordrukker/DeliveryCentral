import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { fetchAssignments } from '@/lib/api/assignments';
import { AssignmentsPage } from './AssignmentsPage';

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
    principal: { personId: 'user-1', roles: ['resource_manager'] },
  }),
}));

vi.mock('@/lib/api/assignments', () => ({
  fetchAssignments: vi.fn(),
}));

const mockedFetchAssignments = vi.mocked(fetchAssignments);

describe('AssignmentsPage', () => {
  beforeEach(() => {
    mockedFetchAssignments.mockReset();
  });

  it('shows loading state', () => {
    mockedFetchAssignments.mockReturnValue(new Promise(() => undefined));

    renderWithRouter();

    expect(screen.getByTestId('skeleton-table')).toBeInTheDocument();
  });

  it('shows empty state', async () => {
    mockedFetchAssignments.mockResolvedValue({
      items: [],
      totalCount: 0,
    });

    renderWithRouter();

    expect(await screen.findByText('No assignments yet')).toBeInTheDocument();
  });

  it('renders assignment data', async () => {
    mockedFetchAssignments.mockResolvedValue({
      items: [
        {
          allocationPercent: 50,
          approvalState: 'APPROVED',
          endDate: '2025-04-30T23:59:59.999Z',
          id: 'asn-1',
          person: { displayName: 'Ethan Brooks', id: 'person-1' },
          project: { displayName: 'Atlas ERP Rollout', id: 'project-1' },
          staffingRole: 'Lead Engineer',
          startDate: '2025-02-01T00:00:00.000Z',
        },
      ],
      totalCount: 1,
    });

    renderWithRouter();

    expect(await screen.findByText('Ethan Brooks')).toBeInTheDocument();
    expect(screen.getByText('Atlas ERP Rollout')).toBeInTheDocument();
    expect(screen.getByText('Lead Engineer')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getAllByText('Approved').length).toBeGreaterThanOrEqual(1);
  });

  it('shows API error state', async () => {
    mockedFetchAssignments.mockRejectedValue(new Error('Assignments unavailable'));

    renderWithRouter();

    expect(await screen.findByText('Assignments unavailable')).toBeInTheDocument();
  });

  it('navigates to assignment details placeholder on row click', async () => {
    mockedFetchAssignments.mockResolvedValue({
      items: [
        {
          allocationPercent: 50,
          approvalState: 'APPROVED',
          endDate: '2025-04-30T23:59:59.999Z',
          id: 'asn-1',
          person: { displayName: 'Ethan Brooks', id: 'person-1' },
          project: { displayName: 'Atlas ERP Rollout', id: 'project-1' },
          staffingRole: 'Lead Engineer',
          startDate: '2025-02-01T00:00:00.000Z',
        },
      ],
      totalCount: 1,
    });

    const user = userEvent.setup();
    renderWithRouter();

    await user.click(await screen.findByText('Ethan Brooks'));

    await waitFor(() => {
      expect(screen.getByText('Assignment Details')).toBeInTheDocument();
    });
  });
});

function renderWithRouter(): void {
  render(
    <MemoryRouter initialEntries={['/assignments']}>
      <Routes>
        <Route element={<AssignmentsPage />} path="/assignments" />
        <Route
          element={<div>Assignment Details</div>}
          path="/assignments/:id"
        />
      </Routes>
    </MemoryRouter>,
  );
}
