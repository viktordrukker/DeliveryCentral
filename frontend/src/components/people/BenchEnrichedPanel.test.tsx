import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderRoute } from '@test/render-route';
import { BenchEnrichedPanel } from './BenchEnrichedPanel';
import type { BenchEnrichedRowDto } from '@/lib/api/people-bench';

const fetchEnrichedBench = vi.fn();

vi.mock('@/lib/api/people-bench', () => ({
  fetchEnrichedBench: () => fetchEnrichedBench(),
}));

const sampleRows: BenchEnrichedRowDto[] = [
  {
    personId: 'p1',
    name: 'Ada Lovelace',
    role: 'Senior Engineer',
    office: 'London',
    grade: 'L5',
    isOnBench: true,
    daysOnBench: 14,
    availabilityHours14d: 80,
    suggestedProjectIds: ['proj-1', 'proj-2'],
  },
  {
    personId: 'p2',
    name: 'Grace Hopper',
    role: 'Architect',
    office: null,
    grade: 'L7',
    isOnBench: true,
    daysOnBench: 72,
    availabilityHours14d: 80,
    suggestedProjectIds: [],
  },
  {
    personId: 'p3',
    name: 'Alan Turing',
    role: 'Engineer',
    office: 'Berlin',
    grade: 'L3',
    isOnBench: false,
    daysOnBench: 0,
    availabilityHours14d: 20,
    suggestedProjectIds: [],
  },
];

describe('BenchEnrichedPanel', () => {
  it('renders one row per person with role/grade/office line', async () => {
    fetchEnrichedBench.mockResolvedValue(sampleRows);
    renderRoute(<BenchEnrichedPanel />);
    await waitFor(() => expect(screen.getByTestId('bench-enriched-list')).toBeInTheDocument());
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText(/Senior Engineer · L5 · London/)).toBeInTheDocument();
  });

  it('shows summary chip with on-bench count + total availability + avg days', async () => {
    fetchEnrichedBench.mockResolvedValue(sampleRows);
    renderRoute(<BenchEnrichedPanel />);
    await waitFor(() => expect(screen.getByText(/2 on bench/)).toBeInTheDocument());
    expect(screen.getByText(/180h available/)).toBeInTheDocument();
    expect(screen.getByText(/avg 43d/)).toBeInTheDocument();
  });

  it('shows danger tone for >60 days on bench', async () => {
    fetchEnrichedBench.mockResolvedValue([sampleRows[1]]);
    const { container } = renderRoute(<BenchEnrichedPanel />);
    await waitFor(() => expect(screen.getByText('Grace Hopper')).toBeInTheDocument());
    const daysCell = screen.getByText('72d');
    expect(daysCell.style.color).toContain('status-danger');
  });

  it('shows match-count when suggested projects exist', async () => {
    fetchEnrichedBench.mockResolvedValue(sampleRows);
    renderRoute(<BenchEnrichedPanel />);
    await waitFor(() => expect(screen.getByText('2 matches')).toBeInTheDocument());
  });

  it('shows em-dash when no suggested projects', async () => {
    fetchEnrichedBench.mockResolvedValue(sampleRows);
    renderRoute(<BenchEnrichedPanel />);
    await waitFor(() => expect(screen.getByTestId('bench-enriched-list')).toBeInTheDocument());
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1);
  });

  it('renders an empty-bench message when the endpoint returns []', async () => {
    fetchEnrichedBench.mockResolvedValue([]);
    renderRoute(<BenchEnrichedPanel />);
    await waitFor(() => expect(screen.getByText('No one on bench')).toBeInTheDocument());
  });

  it('shows error state on fetch failure', async () => {
    fetchEnrichedBench.mockRejectedValue(new Error('Boom'));
    renderRoute(<BenchEnrichedPanel />);
    await waitFor(() => expect(screen.getByText(/Boom/)).toBeInTheDocument());
  });

  it('Open → links to /people/<personId>', async () => {
    fetchEnrichedBench.mockResolvedValue([sampleRows[0]]);
    renderRoute(<BenchEnrichedPanel />);
    await waitFor(() => expect(screen.getByTestId('bench-enriched-list')).toBeInTheDocument());
    const link = screen.getByRole('link', { name: /Open/ });
    expect(link.getAttribute('href')).toBe('/people/p1');
  });
});
