import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import {
  archiveRateCard,
  createRateCard,
  fetchRateCard,
  listRateCards,
  type RateCard,
  type RateCardWithEntries,
} from '@/lib/api/rate-cards';
import { RateCardsAdminPage } from './RateCardsAdminPage';

vi.mock('@/lib/api/rate-cards', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/rate-cards')>();
  return {
    ...actual,
    listRateCards: vi.fn(),
    fetchRateCard: vi.fn(),
    createRateCard: vi.fn(),
    updateRateCard: vi.fn(),
    archiveRateCard: vi.fn(),
    createRateCardEntry: vi.fn(),
    updateRateCardEntry: vi.fn(),
    archiveRateCardEntry: vi.fn(),
  };
});

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockedList = vi.mocked(listRateCards);
const mockedFetch = vi.mocked(fetchRateCard);
const mockedCreate = vi.mocked(createRateCard);
const mockedArchive = vi.mocked(archiveRateCard);

const card: RateCard = {
  id: 'card-1',
  name: 'Tenant default 2026',
  currencyCode: 'USD',
  clientId: null,
  clientName: null,
  validFrom: '2026-01-01',
  validTo: null,
  isActive: true,
  notes: null,
  tenantId: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  archivedAt: null,
  entryCount: 2,
};

const detail: RateCardWithEntries = {
  ...card,
  entries: [
    {
      id: 'entry-1',
      rateCardId: 'card-1',
      staffingRole: 'Engineer',
      grade: 'g13',
      requiredSkills: [],
      hourlyRate: 95.5,
      notes: null,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      archivedAt: null,
      pinnedAssignmentCount: 4,
    },
    {
      id: 'entry-2',
      rateCardId: 'card-1',
      staffingRole: 'Tech Lead',
      grade: 'g15',
      requiredSkills: ['React', 'TypeScript'],
      hourlyRate: 145,
      notes: 'Senior FE',
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      archivedAt: null,
      pinnedAssignmentCount: 1,
    },
  ],
};

function renderPage(): void {
  render(
    <MemoryRouter>
      <RateCardsAdminPage />
    </MemoryRouter>,
  );
}

describe('RateCardsAdminPage', () => {
  beforeEach(() => {
    mockedList.mockReset();
    mockedFetch.mockReset();
    mockedCreate.mockReset();
    mockedArchive.mockReset();
  });

  it('lists cards and auto-loads entries for the first card', async () => {
    mockedList.mockResolvedValue([card]);
    mockedFetch.mockResolvedValue(detail);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Tenant default 2026')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(mockedFetch).toHaveBeenCalledWith('card-1');
    });
    // Entries section visible
    expect(screen.getByText(/entries \(2\)/)).toBeInTheDocument();
    expect(screen.getByText('Engineer')).toBeInTheDocument();
    expect(screen.getByText('Tech Lead')).toBeInTheDocument();
  });

  it('shows "Tenant default" scope label when clientId is null', async () => {
    mockedList.mockResolvedValue([card]);
    mockedFetch.mockResolvedValue(detail);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Tenant default 2026')).toBeInTheDocument();
    });
    expect(screen.getByText('Tenant default')).toBeInTheDocument();
  });

  it('renders an EmptyState with a Create button when no cards exist', async () => {
    mockedList.mockResolvedValue([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/No cards/)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Create card/i })).toBeInTheDocument();
  });

  it('renders the right entry count + pinned badge in the entries table', async () => {
    mockedList.mockResolvedValue([card]);
    mockedFetch.mockResolvedValue(detail);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/entries \(2\)/)).toBeInTheDocument();
    });
    const tables = screen.getAllByRole('table');
    // The second table is the entries table; assert pinned counts column.
    const entriesTable = tables[1] as HTMLTableElement;
    expect(within(entriesTable).getByText('4')).toBeInTheDocument();
    expect(within(entriesTable).getByText('1')).toBeInTheDocument();
  });
});
