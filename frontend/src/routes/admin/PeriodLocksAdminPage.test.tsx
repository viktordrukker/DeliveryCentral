import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import {
  createPeriodLock,
  deletePeriodLock,
  fetchPeriodLocks,
  type PeriodLock,
} from '@/lib/api/period-locks';

import { PeriodLocksAdminPage } from './PeriodLocksAdminPage';

vi.mock('@/lib/api/period-locks', () => ({
  fetchPeriodLocks: vi.fn(),
  createPeriodLock: vi.fn(),
  deletePeriodLock: vi.fn(),
}));

const mockedFetch = vi.mocked(fetchPeriodLocks);
const mockedCreate = vi.mocked(createPeriodLock);
const mockedDelete = vi.mocked(deletePeriodLock);

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
    mockedCreate.mockReset();
    mockedDelete.mockReset();
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

  // W4-08 — ConfirmDialog (tone=danger) with range copy on Unlock action.
  it('opens a danger-toned confirm dialog with range copy when unlocking a period', async () => {
    mockedFetch.mockResolvedValue([baselineLock]);
    renderPage();

    const unlockBtn = await screen.findByRole('button', { name: 'Unlock' });
    await userEvent.click(unlockBtn);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/This will unlock/i)).toBeInTheDocument();
    // Range tokens — formatDate produces locale-formatted dates so we just
    // pin the year/month tokens for both endpoints.
    expect(within(dialog).getByText(/Jan/)).toBeInTheDocument();
  });

  // W4-08 — Creating a lock now requires confirmation with the canonical
  // "This will lock {from}–{to} preventing further edits." copy.
  it('confirms creation with "This will lock …" copy', async () => {
    mockedFetch.mockResolvedValue([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/No period locks/i)).toBeInTheDocument();
    });

    const fromInput = screen.getByLabelText(/^From$/i) as HTMLInputElement;
    const toInput = screen.getByLabelText(/^To$/i) as HTMLInputElement;
    await userEvent.type(fromInput, '2026-01-01');
    await userEvent.type(toInput, '2026-01-31');

    await userEvent.click(screen.getByRole('button', { name: /Lock period/i }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/This will lock/i)).toBeInTheDocument();
    expect(
      within(dialog).getByText(/preventing further edits/i),
    ).toBeInTheDocument();
  });
});
