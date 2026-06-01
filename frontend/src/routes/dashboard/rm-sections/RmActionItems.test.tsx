/**
 * V2 Scope §4 item 11 — RM Action Items Age column.
 *
 * Asserts the new "Age" column renders hours/days since requestedAt,
 * marks > 3d items as stale (red + flag), and sorts pending approvals
 * oldest-first within their group.
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { RmActionItems } from './RmActionItems';

function isoHoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}

function renderRm(props: Partial<Parameters<typeof RmActionItems>[0]> = {}): void {
  render(
    <MemoryRouter>
      <RmActionItems
        overallocated={[]}
        pendingApprovals={[]}
        incomingRequests={[]}
        {...props}
      />
    </MemoryRouter>,
  );
}

const PENDING_BASE = {
  assignmentId: 'a-1',
  personDisplayName: 'Ada Lovelace',
  personId: 'p-1',
  projectId: 'proj-1',
  projectName: 'Apollo',
  requestedAt: isoHoursAgo(1),
};

describe('RmActionItems — Age column', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-31T20:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders an "Age" column header', () => {
    renderRm({ pendingApprovals: [{ ...PENDING_BASE }] });
    expect(screen.getByText('Age')).toBeInTheDocument();
  });

  it('formats hours and days based on time since requestedAt', () => {
    const fresh = { ...PENDING_BASE, assignmentId: 'fresh', requestedAt: isoHoursAgo(2) };
    const dayOld = { ...PENDING_BASE, assignmentId: 'day', requestedAt: isoHoursAgo(30) };
    const stale = { ...PENDING_BASE, assignmentId: 'stale', requestedAt: isoHoursAgo(96) };
    renderRm({ pendingApprovals: [fresh, dayOld, stale] });
    // Stale formats as "4d ⚑", day-old as "1d", fresh as "2h"
    expect(screen.getByText('2h')).toBeInTheDocument();
    expect(screen.getByText('1d')).toBeInTheDocument();
    expect(screen.getByText('4d ⚑')).toBeInTheDocument();
  });

  it('marks items aged > 72h as stale (data-stale="true")', () => {
    const stale = { ...PENDING_BASE, assignmentId: 'stale', requestedAt: isoHoursAgo(80) };
    renderRm({ pendingApprovals: [stale] });
    const cell = screen.getByText('3d ⚑');
    expect(cell.getAttribute('data-stale')).toBe('true');
  });

  it('sorts pending approvals oldest-first within their group', () => {
    const fresh = { ...PENDING_BASE, assignmentId: 'fresh', personDisplayName: 'Fresh', requestedAt: isoHoursAgo(2) };
    const older = { ...PENDING_BASE, assignmentId: 'older', personDisplayName: 'Older', requestedAt: isoHoursAgo(50) };
    renderRm({ pendingApprovals: [fresh, older] });
    // Older should render first (earlier DOM position).
    const olderEl = screen.getByText('Older');
    const freshEl = screen.getByText('Fresh');
    expect(olderEl.compareDocumentPosition(freshEl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows "—" for items without a usable timestamp (overalloc / staffing-request rows)', () => {
    renderRm({
      overallocated: [
        {
          displayName: 'Bob',
          indicator: 'OVERALLOC',
          personId: 'p-9',
          teamId: 't-1',
          teamName: 'Team A',
          totalAllocationPercent: 120,
        },
      ],
    });
    // Age cell should render "—" for overalloc row.
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
