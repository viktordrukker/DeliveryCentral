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

const NOW = new Date('2026-06-05T12:00:00.000Z');
const FRESH_CREATED = new Date(NOW.getTime() - 3 * 60 * 60 * 1000).toISOString(); // 3h
const STALE_CREATED = new Date(NOW.getTime() - 48 * 60 * 60 * 1000).toISOString(); // 48h
const BREACH_CREATED = new Date(NOW.getTime() - 96 * 60 * 60 * 1000).toISOString(); // 96h

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
        createdAt: FRESH_CREATED,
      },
      {
        id: 'a-2',
        person: { id: 'p-2', displayName: 'Bob' },
        project: { id: 'pr-2', displayName: 'Borealis' },
        staffingRole: 'Engineer',
        startDate: '2026-01-01',
        endDate: null,
        approvalState: 'PROPOSED',
        allocationPercent: 50,
        createdAt: STALE_CREATED,
      },
      {
        id: 'a-3',
        person: { id: 'p-3', displayName: 'Carol' },
        project: { id: 'pr-3', displayName: 'Cygnus' },
        staffingRole: 'Engineer',
        startDate: '2026-01-01',
        endDate: null,
        approvalState: 'PROPOSED',
        allocationPercent: 50,
        createdAt: BREACH_CREATED,
      },
    ],
    totalCount: 3,
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
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

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

  // LEAN-P4-missing-2 — column render + threshold colors.
  it('renders the Time in queue column with threshold-coloured cells', async () => {
    render(
      <MemoryRouter>
        <ApprovalQueuePage />
      </MemoryRouter>,
    );

    // Column header is present once the table renders.
    await waitFor(() => {
      expect(screen.getByText(/Time in queue/i)).toBeInTheDocument();
    });

    // Fresh (3h) → "3h 0m" in active colour.
    const fresh = screen.getByText(/^3h 0m$/);
    expect(fresh).toBeInTheDocument();
    expect(fresh.getAttribute('style')).toContain('var(--color-status-active)');

    // Stale (48h) → "2d 0h" in warning colour (>24h, ≤72h).
    const stale = screen.getByText(/^2d 0h$/);
    expect(stale).toBeInTheDocument();
    expect(stale.getAttribute('style')).toContain('var(--color-status-warning)');

    // Breach (96h) → "4d 0h" in danger colour (>72h).
    const breach = screen.getByText(/^4d 0h$/);
    expect(breach).toBeInTheDocument();
    expect(breach.getAttribute('style')).toContain('var(--color-status-danger)');
  });
});
