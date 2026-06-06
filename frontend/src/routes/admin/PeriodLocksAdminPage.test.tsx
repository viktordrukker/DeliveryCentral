import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import { fetchPeriodLocks, type PeriodLock } from '@/lib/api/period-locks';

import { PeriodLocksAdminPage } from './PeriodLocksAdminPage';

vi.mock('@/lib/api/period-locks', () => ({
  fetchPeriodLocks: vi.fn(),
  createPeriodLock: vi.fn(),
  deletePeriodLock: vi.fn(),
}));

const mockedFetch = vi.mocked(fetchPeriodLocks);

const lockedByUuid = '11111111-1111-1111-1111-111111111005';

const baselineLock: PeriodLock = {
  id: 'lock-1',
  periodFrom: '2026-01-01',
  periodTo: '2026-01-31',
  lockedBy: lockedByUuid,
  lockedByDisplayName: 'Director Diane',
  lockedByPublicId: 'usr_director1',
  lockedAt: '2026-02-01T09:00:00.000Z',
};

function renderPage(): void {
  render(
    <MemoryRouter>
      <PeriodLocksAdminPage />
    </MemoryRouter>,
  );
}

describe('PeriodLocksAdminPage', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it('renders lockedBy as displayName (W1-14 UUID_LEAK guard)', async () => {
    mockedFetch.mockResolvedValue([baselineLock]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Director Diane')).toBeInTheDocument();
    });

    // No raw lockedBy UUID may leak into the rendered table.
    expect(screen.queryByText(lockedByUuid)).not.toBeInTheDocument();
  });

  it('falls back to "Unknown actor" when displayName is null', async () => {
    mockedFetch.mockResolvedValue([
      {
        ...baselineLock,
        lockedByDisplayName: null,
        lockedByPublicId: null,
      },
    ]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Unknown actor')).toBeInTheDocument();
    });

    expect(screen.queryByText(lockedByUuid)).not.toBeInTheDocument();
  });
});
