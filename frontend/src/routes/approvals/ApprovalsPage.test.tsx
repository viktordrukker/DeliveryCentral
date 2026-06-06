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
    targetPublicId: 'pos_apolloSeniorEng',
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
    targetPublicId: 'prj_atlas',
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

  // W2-09 — empty state must offer a forward action per UX Law 2.
  it('empty-state on the All queue exposes a Back to dashboard link', async () => {
    fetchUnifiedApprovals.mockResolvedValue(response([]));
    renderRoute(<ApprovalsPage />);
    await waitFor(() => expect(screen.getByText('Inbox zero')).toBeInTheDocument());
    const backLink = screen.getByRole('link', { name: /Back to dashboard/i });
    expect(backLink.getAttribute('href')).toBe('/dashboard');
  });

  // W2-09 — empty state on a filtered queue exposes "Clear all filters"
  // forward action so the user is not stranded.
  it('empty-state on a filtered queue exposes Clear all filters', async () => {
    fetchUnifiedApprovals.mockResolvedValue(response([]));
    const user = userEvent.setup();
    renderRoute(<ApprovalsPage />, { initialEntries: ['/approvals?source=budget'] });
    await waitFor(() => expect(screen.getByText('Inbox zero')).toBeInTheDocument());
    const clearBtn = screen.getByRole('button', { name: /Clear all filters/i });
    expect(clearBtn).toBeInTheDocument();
    fetchUnifiedApprovals.mockClear();
    await user.click(clearBtn);
    await waitFor(() =>
      expect(fetchUnifiedApprovals).toHaveBeenCalledWith({ sources: undefined, pageSize: 100 }),
    );
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

  it('renders the Timesheets filter chip and refetches with timesheet source', async () => {
    const tsItem: ApprovalQueueItemDto = {
      id: 'tw-1',
      targetPublicId: 'tsh_w20260525',
      source: 'timesheet',
      title: 'Timesheet week of 2026-05-25',
      submittedBy: { personId: 'p3', displayName: 'Ethan Brooks' },
      submittedAt: '2026-05-26T18:00:00Z',
      slaDueAt: null,
      slaBreachedAt: null,
      slaStage: null,
      ageHours: 12,
      href: '/approvals/tw-1?source=timesheet',
      meta: { weekStart: '2026-05-25', totalHours: 40 },
    };
    fetchUnifiedApprovals.mockResolvedValue(response([tsItem]));
    const user = userEvent.setup();
    renderRoute(<ApprovalsPage />);
    await waitFor(() => expect(screen.getByTestId('approvals-list')).toBeInTheDocument());
    expect(screen.getByText('Timesheet week of 2026-05-25')).toBeInTheDocument();
    fetchUnifiedApprovals.mockClear();
    await user.click(screen.getByRole('button', { name: /Timesheets · 1/ }));
    await waitFor(() =>
      expect(fetchUnifiedApprovals).toHaveBeenCalledWith({ sources: ['timesheet'], pageSize: 100 }),
    );
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

  // LEAN-P4c-3 — HR (and authorized managers) decide leave from /approvals
  // instead of navigating to /leave-requests separately.
  it('renders leave items and refetches with the leave source when chip clicked', async () => {
    const leaveItem: ApprovalQueueItemDto = {
      id: 'lr-1',
      targetPublicId: 'lvr_annual1',
      source: 'leave',
      title: 'Leave: ANNUAL 2026-06-15…2026-06-20',
      submittedBy: { personId: 'p9', displayName: 'Ethan Brooks' },
      submittedAt: '2026-06-01T09:00:00Z',
      slaDueAt: null,
      slaBreachedAt: null,
      slaStage: null,
      ageHours: 24,
      href: '/leave-requests/lr-1',
      meta: { type: 'ANNUAL' },
    };
    fetchUnifiedApprovals.mockResolvedValue(response([leaveItem]));
    const user = userEvent.setup();
    renderRoute(<ApprovalsPage />);
    await waitFor(() => expect(screen.getByTestId('approvals-list')).toBeInTheDocument());
    expect(screen.getByText('Leave: ANNUAL 2026-06-15…2026-06-20')).toBeInTheDocument();
    const openLink = screen.getByRole('link', { name: /Open/ });
    expect(openLink.getAttribute('href')).toBe('/leave-requests/lr-1');
    fetchUnifiedApprovals.mockClear();
    await user.click(screen.getByRole('button', { name: /Leave · 1/ }));
    await waitFor(() =>
      expect(fetchUnifiedApprovals).toHaveBeenCalledWith({ sources: ['leave'], pageSize: 100 }),
    );
  });
});
