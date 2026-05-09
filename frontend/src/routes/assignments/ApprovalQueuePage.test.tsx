import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import { ApprovalQueuePage } from './ApprovalQueuePage';

// HD-8 / Chunk 8.5 — minimal visual smoke. Verifies the page renders
// without errors and the Export button (added by 8.5) is present in
// the title bar action slot for non-empty data.

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    principal: { personId: 'p-1', roles: ['director'] },
    isLoading: false,
  }),
}));

vi.mock('@/features/assignments/useApprovalQueue', () => ({
  useApprovalQueue: () => ({
    items: [
      {
        id: 'a-1',
        person: { id: 'p-1', displayName: 'Alice' },
        project: { id: 'pr-1', displayName: 'Apollo' },
        staffingRole: 'Engineer',
        startDate: '2026-01-01',
        endDate: null,
        approvalState: 'BOOKED',
        allocationPercent: 80,
      },
    ],
    totalCount: 1,
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

const setActionsSpy = vi.fn();
vi.mock('@/app/title-bar-context', () => ({
  useTitleBarActions: () => ({ setActions: setActionsSpy }),
}));

describe('ApprovalQueuePage — Export retrofit (HD-8 chunk 8.5)', () => {
  it('renders the title-bar Export button alongside scope filters', async () => {
    render(
      <MemoryRouter>
        <ApprovalQueuePage />
      </MemoryRouter>,
    );

    // The page passes the action JSX into setActions; pull the latest call
    // and render the JSX so we can assert on its contents.
    await waitFor(() => {
      expect(setActionsSpy).toHaveBeenCalled();
    });
    const lastCall = setActionsSpy.mock.calls[setActionsSpy.mock.calls.length - 1];
    const actionsJsx = lastCall[0] as JSX.Element;
    render(actionsJsx);

    expect(screen.getByRole('button', { name: /Export/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /All/i })).toBeInTheDocument();
  });
});
