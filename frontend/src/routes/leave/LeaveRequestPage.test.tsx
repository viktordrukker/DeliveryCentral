import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/leaveRequests', () => {
  return {
    approveLeaveRequest: vi.fn(() => Promise.resolve({})),
    createLeaveRequest: vi.fn(() => Promise.resolve({})),
    fetchLeaveRequests: vi.fn(() => Promise.resolve([])),
    fetchMyLeaveRequests: vi.fn(() => Promise.resolve([])),
    rejectLeaveRequest: vi.fn(() => Promise.resolve({})),
  };
});

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    principal: { personId: 'test-person-id', roles: ['employee'] },
  }),
}));

import { LeaveRequestPage } from './LeaveRequestPage';

describe('LeaveRequestPage', () => {
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
});
