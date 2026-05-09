import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import { fetchPulseTeamTrend } from '@/lib/api/pulse';
import { PulseTrendCard } from './PulseTrendCard';

vi.mock('@/lib/api/pulse', () => ({
  fetchPulseTeamTrend: vi.fn(),
}));

const mockedFetch = vi.mocked(fetchPulseTeamTrend);

afterEach(() => {
  mockedFetch.mockReset();
});

describe('PulseTrendCard', () => {
  it('renders the latest week mood and the response/struggling tally', async () => {
    mockedFetch.mockResolvedValueOnce({
      scopePersonCount: 8,
      weeks: [
        { weekStart: '2026-04-06', avgMood: null, responseCount: 0, strugglingCount: 0 },
        { weekStart: '2026-04-13', avgMood: 3.5, responseCount: 4, strugglingCount: 0 },
        { weekStart: '2026-04-20', avgMood: 4.0, responseCount: 5, strugglingCount: 0 },
        { weekStart: '2026-04-27', avgMood: 2.5, responseCount: 6, strugglingCount: 1 },
      ],
    });

    render(<PulseTrendCard weeks={4} />);

    await waitFor(() => expect(mockedFetch).toHaveBeenCalledWith(4));
    await screen.findByText('2.5');
    expect(screen.getByText(/8/)).toBeInTheDocument();
    expect(screen.getByText(/15 responses/)).toBeInTheDocument();
    expect(screen.getByText(/1 struggling/)).toBeInTheDocument();
  });

  it('shows the empty-scope state when the caller has no reports', async () => {
    mockedFetch.mockResolvedValueOnce({
      scopePersonCount: 0,
      weeks: [
        { weekStart: '2026-04-27', avgMood: null, responseCount: 0, strugglingCount: 0 },
      ],
    });

    render(<PulseTrendCard weeks={1} />);

    await screen.findByText(/No reports in your scope/);
  });

  it('renders an error when the fetch fails', async () => {
    mockedFetch.mockRejectedValueOnce(new Error('Boom'));

    render(<PulseTrendCard weeks={1} />);

    await screen.findByText('Boom');
  });
});
