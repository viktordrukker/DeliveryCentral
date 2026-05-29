import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderRoute } from '@test/render-route';
import { ApprovalsPage } from './ApprovalsPage';
import type { ApprovalQueueItemDto, ApprovalQueueResponseDto } from '@/lib/api/approvals-unified';

const fetchUnifiedApprovals = vi.fn();

vi.mock('@/lib/api/approvals-unified', () => ({
  fetchUnifiedApprovals: (params: unknown) => fetchUnifiedApprovals(params),
}));

const sampleItems: ApprovalQueueItemDto[] = [
  {
    id: 'pp-1',
    source: 'position-proposal',
    title: 'Senior Engineer — Apollo project',
    submittedBy: { personId: 'p1', displayName: 'Ada Lovelace' },
    submittedAt: '2026-05-20T08:00:00Z',
    slaDueAt: '2026-05-26T08:00:00Z',
    slaBreachedAt: null,
    slaStage: 'on-track',
    ageHours: 96,
    href: '/staffing-requests/pp-1',
    meta: {},
  },
  {
    id: 'bg-2',
    source: 'budget',
    title: 'Q3 +$200k for Atlas',
    submittedBy: { personId: 'p2', displayName: 'Grace Hopper' },
    submittedAt: '2026-05-19T10:00:00Z',
    slaDueAt: '2026-05-22T10:00:00Z',
    slaBreachedAt: '2026-05-23T10:00:00Z',
    slaStage: 'breached',
    ageHours: 120,
    href: '/projects/atlas?tab=budget',
    meta: {},
  },
];

function response(items: ApprovalQueueItemDto[]): ApprovalQueueResponseDto {
  return { items, total: items.length, page: 1, pageSize: 100 };
}

describe('ApprovalsPage', () => {
  it('shows a loading state then renders the list', async () => {
    fetchUnifiedApprovals.mockResolvedValue(response(sampleItems));
    renderRoute(<ApprovalsPage />);
    await waitFor(() => expect(screen.getByTestId('approvals-list')).toBeInTheDocument());
    expect(screen.getByText('Senior Engineer — Apollo project')).toBeInTheDocument();
    expect(screen.getByText('Q3 +$200k for Atlas')).toBeInTheDocument();
  });

  it('renders source filter chips', async () => {
    fetchUnifiedApprovals.mockResolvedValue(response(sampleItems));
    renderRoute(<ApprovalsPage />);
    await waitFor(() => expect(screen.getByTestId('approvals-list')).toBeInTheDocument());
    const filters = screen.getByTestId('approvals-filters');
    expect(filters.textContent).toContain('All');
    expect(filters.textContent).toContain('Position proposals');
    expect(filters.textContent).toContain('Budget');
  });

  it('clicking a filter chip refetches with the source param', async () => {
    fetchUnifiedApprovals.mockResolvedValue(response(sampleItems));
    const user = userEvent.setup();
    renderRoute(<ApprovalsPage />);
    await waitFor(() => expect(screen.getByTestId('approvals-list')).toBeInTheDocument());
    fetchUnifiedApprovals.mockClear();
    await user.click(screen.getByRole('button', { name: /Budget · 1/ }));
    await waitFor(() =>
      expect(fetchUnifiedApprovals).toHaveBeenCalledWith({ sources: ['budget'], pageSize: 100 }),
    );
  });

  it('shows the Breached SLA badge on rows past the deadline', async () => {
    fetchUnifiedApprovals.mockResolvedValue(response(sampleItems));
    renderRoute(<ApprovalsPage />);
    await waitFor(() => expect(screen.getByText('Breached')).toBeInTheDocument());
  });

  it('shows empty-state when the queue is empty', async () => {
    fetchUnifiedApprovals.mockResolvedValue(response([]));
    renderRoute(<ApprovalsPage />);
    await waitFor(() => expect(screen.getByText('Inbox zero')).toBeInTheDocument());
  });

  it('shows error state when the endpoint fails', async () => {
    fetchUnifiedApprovals.mockRejectedValue(new Error('Boom'));
    renderRoute(<ApprovalsPage />);
    await waitFor(() => expect(screen.getByText(/Boom/)).toBeInTheDocument());
  });

  it('each row has an "Open →" deep-link to the href', async () => {
    fetchUnifiedApprovals.mockResolvedValue(response(sampleItems));
    renderRoute(<ApprovalsPage />);
    await waitFor(() => expect(screen.getByTestId('approvals-list')).toBeInTheDocument());
    const links = screen.getAllByRole('link', { name: /Open/ });
    expect(links).toHaveLength(2);
    expect(links[0].getAttribute('href')).toBe('/staffing-requests/pp-1');
  });

  it('respects ?source= URL param on initial load', async () => {
    fetchUnifiedApprovals.mockResolvedValue(response([]));
    renderRoute(<ApprovalsPage />, { initialEntries: ['/approvals?source=leave'] });
    await waitFor(() =>
      expect(fetchUnifiedApprovals).toHaveBeenCalledWith({ sources: ['leave'], pageSize: 100 }),
    );
  });

  it('B24: renders awaiting + SLA-breached header badges', async () => {
    fetchUnifiedApprovals.mockResolvedValue(response(sampleItems));
    renderRoute(<ApprovalsPage />);
    await waitFor(() => expect(screen.getByTestId('approvals-list')).toBeInTheDocument());
    expect(screen.getByText(/2 awaiting/)).toBeInTheDocument();
    // one sample item is slaStage=breached
    expect(screen.getByText(/1 SLA breached/)).toBeInTheDocument();
  });

  it('B24: header Refresh re-fetches the queue', async () => {
    fetchUnifiedApprovals.mockResolvedValue(response(sampleItems));
    const user = userEvent.setup();
    renderRoute(<ApprovalsPage />);
    await waitFor(() => expect(screen.getByTestId('approvals-refresh')).toBeInTheDocument());
    fetchUnifiedApprovals.mockClear();
    await user.click(screen.getByTestId('approvals-refresh'));
    await waitFor(() => expect(fetchUnifiedApprovals).toHaveBeenCalled());
  });
});
