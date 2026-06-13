import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchLeaveRequests } from '@/lib/api/leaveRequests';

vi.mock('@/lib/api/leaveRequests', () => {
  return {
    approveLeaveRequest: vi.fn(() => Promise.resolve({})),
    createLeaveRequest: vi.fn(() => Promise.resolve({})),
    fetchLeaveRequests: vi.fn(() => Promise.resolve([])),
    fetchMyLeaveRequests: vi.fn(() => Promise.resolve([])),
    rejectLeaveRequest: vi.fn(() => Promise.resolve({})),
  };
});

let mockRoles: string[] = ['employee'];
vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    principal: { personId: 'test-person-id', roles: mockRoles },
  }),
}));

import { LeaveRequestPage } from './LeaveRequestPage';

describe('LeaveRequestPage', () => {
  afterEach(() => {
    mockRoles = ['employee'];
    vi.mocked(fetchLeaveRequests).mockResolvedValue([]);
  });
  it('renders the page title', () => {
    render(
      <MemoryRouter>
        <LeaveRequestPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Time Off')).toBeDefined();
  });

  it('renders the leave request form', () => {
    render(
      <MemoryRouter>
        <LeaveRequestPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Request Leave')).toBeDefined();
    expect(screen.getByText('Submit Request')).toBeDefined();
  });

  it('shows the requester name (not a UUID) in the manager approval queue (SC-7)', async () => {
    mockRoles = ['hr_manager'];
    vi.mocked(fetchLeaveRequests).mockResolvedValue([
      {
        createdAt: '2026-06-01T00:00:00.000Z',
        endDate: '2026-07-05',
        id: 'lr-1',
        notes: null,
        personId: '11111111-2222-3333-4444-555555555555',
        personName: 'Alice Smith',
        reviewedAt: null,
        reviewedBy: null,
        reviewComment: null,
        startDate: '2026-07-01',
        status: 'PENDING',
        type: 'ANNUAL',
      },
    ]);

    render(
      <MemoryRouter>
        <LeaveRequestPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Alice Smith')).toBeInTheDocument();
    // The raw UUID (or its truncation) must never appear.
    await waitFor(() => expect(screen.queryByText(/11111111/)).not.toBeInTheDocument());
  });
});
