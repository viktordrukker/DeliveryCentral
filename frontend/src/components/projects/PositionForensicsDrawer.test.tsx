import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PositionForensicsDrawer } from './PositionForensicsDrawer';
import type { PositionForensics } from '@/lib/api/project-positions';

const fetchPositionForensicsMock = vi.fn();

vi.mock('@/lib/api/project-positions', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/project-positions')>(
    '@/lib/api/project-positions',
  );
  return {
    ...actual,
    fetchPositionForensics: (...args: unknown[]) => fetchPositionForensicsMock(...args),
  };
});

afterEach(() => {
  fetchPositionForensicsMock.mockReset();
});

function buildPayload(over: Partial<PositionForensics> = {}): PositionForensics {
  return {
    positionId: 'pos-1',
    projectId: 'proj-1',
    role: 'Senior Engineer',
    currentStatus: 'PROPOSED',
    asOf: '2026-06-06T00:00:00.000Z',
    events: [
      {
        id: 'h1',
        changeType: 'OPENED',
        previousStatus: 'DRAFT',
        newStatus: 'OPEN',
        previousPersonId: null,
        newPersonId: null,
        changedByPersonId: 'pm-1',
        changeReason: null,
        occurredAt: '2026-06-01T00:00:00.000Z',
        dwellMs: 86_400_000, // 1d in OPEN
        longDwell: false,
      },
      {
        id: 'h2',
        changeType: 'PROPOSED',
        previousStatus: 'OPEN',
        newStatus: 'PROPOSED',
        previousPersonId: null,
        newPersonId: 'cand-1',
        changedByPersonId: 'pm-1',
        changeReason: 'Initial slate built',
        occurredAt: '2026-06-02T00:00:00.000Z',
        dwellMs: 4 * 86_400_000, // 4d in PROPOSED — over 3d threshold
        longDwell: true,
      },
    ],
    ...over,
  };
}

describe('PositionForensicsDrawer', () => {
  it('renders nothing when positionId is null', () => {
    const { container } = render(
      <PositionForensicsDrawer positionId={null} onClose={() => undefined} />,
    );
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(fetchPositionForensicsMock).not.toHaveBeenCalled();
  });

  it('fetches forensics for the position and renders each event in the timeline', async () => {
    fetchPositionForensicsMock.mockResolvedValueOnce(buildPayload());
    render(
      <PositionForensicsDrawer
        positionId="pos-1"
        positionRole="Senior Engineer"
        onClose={() => undefined}
      />,
    );
    await waitFor(() =>
      expect(fetchPositionForensicsMock).toHaveBeenCalledWith('pos-1'),
    );
    // Both events render
    expect(await screen.findByTestId('position-forensics-event-h1')).toBeInTheDocument();
    expect(screen.getByTestId('position-forensics-event-h2')).toBeInTheDocument();
    // Title shows the role
    expect(screen.getAllByText(/Senior Engineer/i)[0]).toBeInTheDocument();
  });

  it('flags long-dwell events as such on the timeline', async () => {
    fetchPositionForensicsMock.mockResolvedValueOnce(buildPayload());
    render(<PositionForensicsDrawer positionId="pos-1" onClose={() => undefined} />);
    const longDwell = await screen.findByTestId('position-forensics-dwell-h2');
    expect(longDwell.textContent).toMatch(/long/);
    const shortDwell = screen.getByTestId('position-forensics-dwell-h1');
    expect(shortDwell.textContent).not.toMatch(/long/);
  });

  it('shows the change reason and actor when present', async () => {
    fetchPositionForensicsMock.mockResolvedValueOnce(buildPayload());
    render(<PositionForensicsDrawer positionId="pos-1" onClose={() => undefined} />);
    expect(await screen.findByText(/Initial slate built/i)).toBeInTheDocument();
    expect(screen.getAllByText(/pm-1/).length).toBeGreaterThan(0);
  });

  it('renders an empty-state message when the position has no history yet', async () => {
    fetchPositionForensicsMock.mockResolvedValueOnce(
      buildPayload({ events: [], currentStatus: 'DRAFT' }),
    );
    render(<PositionForensicsDrawer positionId="pos-1" onClose={() => undefined} />);
    expect(
      await screen.findByText(/No fill-history events recorded for this position yet/i),
    ).toBeInTheDocument();
  });

  it('renders an error state when the fetch fails', async () => {
    fetchPositionForensicsMock.mockRejectedValueOnce(new Error('boom'));
    render(<PositionForensicsDrawer positionId="pos-1" onClose={() => undefined} />);
    expect(await screen.findByText(/boom/i)).toBeInTheDocument();
  });
});
