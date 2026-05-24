import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderRoute } from '@test/render-route';
import { HrActionCardsPanel } from './HrActionCardsPanel';
import type { HrActionCardDto } from '@/lib/api/hr-actions';

const fetchHrActionCards = vi.fn();

vi.mock('@/lib/api/hr-actions', () => ({
  fetchHrActionCards: (params?: { page?: number; pageSize?: number }) => fetchHrActionCards(params),
}));

const today = new Date();
const inSevenDays = new Date(today.getTime() + 7 * 86400000).toISOString().slice(0, 10);
const yesterday = new Date(today.getTime() - 1 * 86400000).toISOString().slice(0, 10);

const sampleItems: HrActionCardDto[] = [
  {
    kind: 'probation_ending',
    personId: 'p1',
    personName: 'Ada Lovelace',
    dueAt: inSevenDays,
    severity: 'warning',
    message: 'Probation period ends in 7 days — schedule review.',
    href: '/people/p1',
  },
  {
    kind: 'contract_expiring',
    personId: 'p2',
    personName: 'Grace Hopper',
    dueAt: yesterday,
    severity: 'danger',
    message: 'Contract expired yesterday — extension required.',
    href: '/people/p2',
  },
];

describe('HrActionCardsPanel', () => {
  it('renders one card per HR action with severity tone', async () => {
    fetchHrActionCards.mockResolvedValue(sampleItems);
    renderRoute(<HrActionCardsPanel />);
    await waitFor(() => expect(screen.getByTestId('hr-action-cards')).toBeInTheDocument());
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
    expect(screen.getByText(/Probation period ends/)).toBeInTheDocument();
  });

  it('shows due-in label for future dates', async () => {
    fetchHrActionCards.mockResolvedValue(sampleItems);
    renderRoute(<HrActionCardsPanel />);
    await waitFor(() => expect(screen.getByText(/Due in 7d/)).toBeInTheDocument());
  });

  it('shows overdue label for past dates', async () => {
    fetchHrActionCards.mockResolvedValue(sampleItems);
    renderRoute(<HrActionCardsPanel />);
    await waitFor(() => expect(screen.getByText(/Due 1d overdue/)).toBeInTheDocument());
  });

  it('renders kind chips (Probation / Contract / etc.)', async () => {
    fetchHrActionCards.mockResolvedValue(sampleItems);
    renderRoute(<HrActionCardsPanel />);
    await waitFor(() => expect(screen.getByText('Probation')).toBeInTheDocument());
    expect(screen.getByText('Contract')).toBeInTheDocument();
  });

  it('shows deep-link "Open →" per card', async () => {
    fetchHrActionCards.mockResolvedValue(sampleItems);
    renderRoute(<HrActionCardsPanel />);
    await waitFor(() => expect(screen.getByTestId('hr-action-cards')).toBeInTheDocument());
    const links = screen.getAllByRole('link', { name: /Open/ });
    expect(links).toHaveLength(2);
    expect(links[0].getAttribute('href')).toBe('/people/p1');
  });

  it('shows a quiet message when there are no HR actions', async () => {
    fetchHrActionCards.mockResolvedValue([]);
    renderRoute(<HrActionCardsPanel />);
    await waitFor(() => expect(screen.getByText(/No HR actions pending/)).toBeInTheDocument());
  });

  it('shows an error state when the endpoint fails', async () => {
    fetchHrActionCards.mockRejectedValue(new Error('Boom'));
    renderRoute(<HrActionCardsPanel />);
    await waitFor(() => expect(screen.getByText(/Boom/)).toBeInTheDocument());
  });
});
