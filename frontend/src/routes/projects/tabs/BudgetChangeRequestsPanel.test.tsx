import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  approveBudgetChange,
  fetchPendingBudgetChangeRequests,
  rejectBudgetChange,
} from '@/lib/api/project-budget';
import { BudgetChangeRequestsPanel } from './BudgetChangeRequestsPanel';

vi.mock('@/lib/api/project-budget', () => ({
  fetchPendingBudgetChangeRequests: vi.fn(),
  approveBudgetChange: vi.fn(),
  rejectBudgetChange: vi.fn(),
}));
vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({ principal: { personId: 'me', roles: ['director'] } }),
}));

const mockFetch = vi.mocked(fetchPendingBudgetChangeRequests);

describe('BudgetChangeRequestsPanel (#713 on v2 Money tab)', () => {
  it('renders the resolved requester name (not a UUID) and an Approve action', async () => {
    mockFetch.mockResolvedValue([
      {
        id: 'appr-1',
        publicId: null,
        projectBudgetId: 'pb-1',
        status: 'PENDING',
        requestedByPersonId: '11111111-2222-3333-4444-555555555555',
        requestedByPersonName: 'Dana Cole',
        requestedAt: '2026-06-01T00:00:00.000Z',
        requestedChange: { capexBudget: 1000, opexBudget: 2000 },
        decidedByPersonId: null,
        decisionAt: null,
        decisionReason: null,
      },
    ]);

    render(<BudgetChangeRequestsPanel projectId="p1" />);

    expect(await screen.findByText('Dana Cole')).toBeInTheDocument();
    expect(screen.queryByText(/11111111/)).not.toBeInTheDocument();
    expect(screen.getByText('Pending Budget Change Requests')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
  });

  it('shows the empty state when there are no pending requests', async () => {
    mockFetch.mockResolvedValue([]);
    render(<BudgetChangeRequestsPanel projectId="p1" />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith('p1'));
    expect(await screen.findByText('All caught up')).toBeInTheDocument();
    expect(approveBudgetChange).not.toHaveBeenCalled();
    expect(rejectBudgetChange).not.toHaveBeenCalled();
  });
});
