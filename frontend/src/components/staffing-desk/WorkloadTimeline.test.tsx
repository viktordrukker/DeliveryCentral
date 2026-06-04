import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { listProjectPositions } from '@/lib/api/project-positions';
import { WorkloadTimeline } from './WorkloadTimeline';

vi.mock('@/lib/api/project-positions', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/api/project-positions')>(
      '@/lib/api/project-positions',
    );
  return {
    ...actual,
    listProjectPositions: vi.fn(),
  };
});

const mockedListProjectPositions = vi.mocked(listProjectPositions);

beforeEach(() => {
  mockedListProjectPositions.mockReset();
  mockedListProjectPositions.mockResolvedValue({ positions: [], total: 0 });
});

describe('WorkloadTimeline (LEAN-P2-3)', () => {
  it('reads from /project-positions with activePersonId filter', async () => {
    render(
      <MemoryRouter>
        <WorkloadTimeline personId="per-1" />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockedListProjectPositions).toHaveBeenCalledTimes(1);
    });
    expect(mockedListProjectPositions).toHaveBeenCalledWith({
      activePersonId: 'per-1',
      take: 200,
    });
  });

  it('skips fetch when personId is omitted (planned-only mode)', async () => {
    render(
      <MemoryRouter>
        <WorkloadTimeline planned={{ allocationPercent: 50, endDate: '2026-12-31', projectName: 'New', startDate: '2026-06-01' }} />
      </MemoryRouter>,
    );

    // Microtask flush so the effect runs.
    await waitFor(() => {
      expect(mockedListProjectPositions).not.toHaveBeenCalled();
    });
  });

  it('skips fetch when preloadedAssignments are provided', async () => {
    render(
      <MemoryRouter>
        <WorkloadTimeline
          personId="per-1"
          preloadedAssignments={[
            { allocationPercent: 80, endDate: '2026-12-31', projectName: 'Phoenix', startDate: '2026-06-01', status: 'BOOKED' },
          ]}
        />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockedListProjectPositions).not.toHaveBeenCalled();
    });
  });
});
