import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { ApprovalInspector } from './ApprovalInspector';
import type { ApprovalQueueItemDto } from '@/lib/api/approvals-unified';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const baseItem: ApprovalQueueItemDto = {
  id: 'a-1',
  source: 'budget',
  title: 'Capex budget increase for Orion',
  submittedBy: { personId: 'p-1', displayName: 'Marie Curie' },
  submittedAt: '2026-05-20T09:00:00Z',
  slaDueAt: null,
  slaBreachedAt: null,
  slaStage: 'due-soon',
  ageHours: 26,
  href: '/projects/orion?tab=budget',
  meta: {
    projectCode: 'PRJ-ORION',
    projectName: 'Orion',
    currentAmount: 100000,
    requestedAmount: 125000,
    currency: 'USD',
    reason: 'Q4 surge in vendor labour rates.',
  },
};

function renderInspector(
  itemOverrides: Partial<ApprovalQueueItemDto> = {},
  onClose = vi.fn(),
): { onClose: ReturnType<typeof vi.fn> } {
  // Meta is replaced wholesale when an override provides it; otherwise the
  // baseItem.meta is reused so callers don't have to repeat the full payload.
  const meta = itemOverrides.meta !== undefined ? itemOverrides.meta : baseItem.meta;
  render(
    <MemoryRouter>
      <ApprovalInspector
        item={{ ...baseItem, ...itemOverrides, meta }}
        onClose={onClose}
      />
    </MemoryRouter>,
  );
  return { onClose };
}

describe('ApprovalInspector', () => {
  it('renders source label, title, and submitter', () => {
    renderInspector();
    expect(screen.getByText('Budget request')).toBeInTheDocument();
    expect(screen.getByText('Capex budget increase for Orion')).toBeInTheDocument();
    expect(screen.getByText('Marie Curie')).toBeInTheDocument();
    expect(screen.getByText(/Due soon/i)).toBeInTheDocument();
  });

  it('renders project + current + requested + variance from meta', () => {
    renderInspector();
    expect(screen.getByText('Project')).toBeInTheDocument();
    // "Orion" appears in both the inspector title and the project tile;
    // the project code is unique enough to assert on.
    expect(screen.getByText('PRJ-ORION')).toBeInTheDocument();
    expect(screen.getByText('$100,000')).toBeInTheDocument();
    expect(screen.getByText('$125,000')).toBeInTheDocument();
    // (125000 - 100000) / 100000 = 25%, with sign
    expect(screen.getByText('+25%')).toBeInTheDocument();
  });

  it('renders submitter rationale when meta.reason is present', () => {
    renderInspector();
    expect(screen.getByText(/Q4 surge in vendor labour rates/)).toBeInTheDocument();
  });

  it('renders all 3 decision buttons + Open source link', () => {
    renderInspector();
    expect(screen.getByRole('button', { name: 'Escalate' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeEnabled();
    expect(screen.getByRole('link', { name: /Open source/i })).toHaveAttribute('href', '/projects/orion?tab=budget');
  });

  it('disables sibling buttons while one is submitting', async () => {
    const user = userEvent.setup();
    renderInspector();
    await user.click(screen.getByRole('button', { name: 'Approve' }));
    // Synchronous re-render: other actions disabled while submitting.
    expect(screen.getByRole('button', { name: 'Escalate' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeDisabled();
  });

  it('fires onClose when the × button is clicked', async () => {
    const user = userEvent.setup();
    const { onClose } = renderInspector();
    await user.click(screen.getByRole('button', { name: /close inspector/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('falls back gracefully when meta has no known fields', () => {
    renderInspector({
      meta: {},
    });
    // No Project / Current / Requested / Variance tiles render — but core
    // identity + decision buttons + comment field still mount.
    expect(screen.queryByText('Project')).not.toBeInTheDocument();
    expect(screen.queryByText('Current')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Add context for the submitter/i)).toBeInTheDocument();
  });

  it('handles a missing submitter without crashing', () => {
    renderInspector({ submittedBy: null });
    expect(screen.getByText(/unknown submitter/i)).toBeInTheDocument();
  });

  describe('V2-A.17 — leave-source detail block', () => {
    it('renders leave detail tiles when source=leave and meta carries leave fields', () => {
      renderInspector({
        source: 'leave',
        title: '5 days annual leave',
        meta: {
          leaveType: 'ANNUAL',
          leaveStartDate: '2026-06-01',
          leaveEndDate: '2026-06-05',
          businessDays: 5,
          balanceRemaining: 12,
        },
      });
      expect(screen.getByTestId('approval-inspector-leave-detail')).toBeInTheDocument();
      expect(screen.getByText('Leave detail')).toBeInTheDocument();
      expect(screen.getByText('ANNUAL')).toBeInTheDocument();
      expect(screen.getByText('2026-06-01 → 2026-06-05')).toBeInTheDocument();
      expect(screen.getByText('Business days')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Balance after')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
    });

    it('omits the leave detail block when source is not leave', () => {
      renderInspector({
        source: 'budget',
        meta: {
          leaveType: 'ANNUAL',
          leaveStartDate: '2026-06-01',
        },
      });
      expect(screen.queryByTestId('approval-inspector-leave-detail')).not.toBeInTheDocument();
    });

    it('omits the leave detail block when source=leave but meta is empty', () => {
      renderInspector({
        source: 'leave',
        meta: {},
      });
      expect(screen.queryByTestId('approval-inspector-leave-detail')).not.toBeInTheDocument();
    });

    it('flags negative leave balance in danger color', () => {
      renderInspector({
        source: 'leave',
        meta: { balanceRemaining: -2 },
      });
      const balanceCell = screen.getByText('-2');
      expect(balanceCell.style.color).toContain('status-danger');
    });
  });
});
