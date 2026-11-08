import { fireEvent, screen, waitFor } from '@testing-library/react';
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

describe('BenchEnrichedPanel — D4 fidelity', () => {
  it('renders the 4-tile KPI strip', async () => {
    fetchEnrichedBench.mockResolvedValue(sampleRows);
    renderRoute(<BenchEnrichedPanel />);
    await waitFor(() => expect(screen.getByTestId('bench-kpi-strip')).toBeInTheDocument());
    const strip = screen.getByTestId('bench-kpi-strip');
    expect(strip.textContent).toContain('On bench');
    expect(strip.textContent).toContain('Idle > 14 days');
    expect(strip.textContent).toContain('Availability · 14d');
    expect(strip.textContent).toContain('Suggested fills');
  });

  it('renders one row per person with role/grade/office cell', async () => {
    fetchEnrichedBench.mockResolvedValue(sampleRows);
    renderRoute(<BenchEnrichedPanel />);
    await waitFor(() => expect(screen.getByTestId('bench-enriched-list')).toBeInTheDocument());
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText(/Senior Engineer · L5 · London/)).toBeInTheDocument();
  });

  it('sorts by daysOnBench DESC (longest idle first)', async () => {
    fetchEnrichedBench.mockResolvedValue(sampleRows);
    const { container } = renderRoute(<BenchEnrichedPanel />);
    await waitFor(() => expect(screen.getByTestId('bench-enriched-list')).toBeInTheDocument());
    const rows = container.querySelectorAll('tbody tr');
    expect(rows[0].textContent).toContain('Grace Hopper'); // 72d
    expect(rows[1].textContent).toContain('Ada Lovelace'); // 14d
  });

  it('shows danger tone for >60 days on bench', async () => {
    fetchEnrichedBench.mockResolvedValue([sampleRows[1]]);
    renderRoute(<BenchEnrichedPanel />);
    await waitFor(() => expect(screen.getByText('Grace Hopper')).toBeInTheDocument());
    const daysCell = screen.getByText('72d');
    expect(daysCell.style.color).toContain('status-danger');
  });

  it('renders match-count badge when suggested projects exist', async () => {
    fetchEnrichedBench.mockResolvedValue(sampleRows);
    renderRoute(<BenchEnrichedPanel />);
    await waitFor(() => expect(screen.getByText(/2 matches/)).toBeInTheDocument());
  });

  it('shows em-dash when no suggested projects', async () => {
    fetchEnrichedBench.mockResolvedValue(sampleRows);
    renderRoute(<BenchEnrichedPanel />);
    await waitFor(() => expect(screen.getByTestId('bench-enriched-list')).toBeInTheDocument());
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1);
  });

  it('shows status badge per row (On bench / Engaged)', async () => {
    fetchEnrichedBench.mockResolvedValue(sampleRows);
    renderRoute(<BenchEnrichedPanel />);
    await waitFor(() => expect(screen.getByTestId('bench-enriched-list')).toBeInTheDocument());
    expect(screen.getAllByText('On bench').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Engaged')).toBeInTheDocument();
  });

  it('renders empty-bench card when the endpoint returns []', async () => {
    fetchEnrichedBench.mockResolvedValue([]);
    renderRoute(<BenchEnrichedPanel />);
    await waitFor(() => expect(screen.getByTestId('bench-empty')).toBeInTheDocument());
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
    // V2-A.7 — Table rows became role="link" (interactive) when onRowClick wired
    // for master-detail. Filter to the actual `<a>` element for this assertion.
    const link = screen.getByRole('link', { name: /^Open/ });
    expect(link.getAttribute('href')).toBe('/people/p1');
  });
});

describe('BenchEnrichedPanel — A7/A8/A9 chrome', () => {
  it('A7: renders page chrome — breadcrumb, idle-total badges, Export CSV', async () => {
    fetchEnrichedBench.mockResolvedValue(sampleRows);
    renderRoute(<BenchEnrichedPanel />);
    await waitFor(() => expect(screen.getByTestId('bench-enriched')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeInTheDocument();
    // 2 on bench (p1, p2); 1 idle > 14d (p2 = 72d)
    expect(screen.getByText(/2 on bench/i)).toBeInTheDocument();
    expect(screen.getByText(/1 idle > 14d/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'People' })).toBeInTheDocument();
  });

  it('A8: paginates the list at 12/page with a Showing N of M footer', async () => {
    const many: BenchEnrichedRowDto[] = Array.from({ length: 15 }, (_, i) => ({
      personId: `m${i}`,
      name: `Person ${String(i).padStart(2, '0')}`,
      role: 'Engineer',
      office: 'London',
      grade: 'L4',
      isOnBench: true,
      daysOnBench: 50 - i, // DESC so the sort order is deterministic
      availabilityHours14d: 40,
      suggestedProjectIds: [],
    }));
    fetchEnrichedBench.mockResolvedValue(many);
    const { container } = renderRoute(<BenchEnrichedPanel />);
    await waitFor(() => expect(screen.getByTestId('bench-pagination')).toBeInTheDocument());
    expect(container.querySelectorAll('tbody tr').length).toBe(12);
    expect(screen.getByTestId('bench-pagination').textContent).toContain('Showing 1–12 of 15');
    fireEvent.click(screen.getByLabelText('Next page'));
    await waitFor(() =>
      expect(screen.getByTestId('bench-pagination').textContent).toContain('Showing 13–15 of 15'),
    );
    expect(container.querySelectorAll('tbody tr').length).toBe(3);
  });

  it('A9: inspector opens with a prev/next stepper that walks the sorted list', async () => {
    fetchEnrichedBench.mockResolvedValue(sampleRows);
    renderRoute(<BenchEnrichedPanel />);
    await waitFor(() => expect(screen.getByTestId('bench-enriched-list')).toBeInTheDocument());
    // sorted DESC: Grace(72) idx0, Ada(14) idx1, Alan(0) idx2
    fireEvent.click(screen.getByText('Ada Lovelace'));
    await waitFor(() => expect(screen.getByTestId('bench-inspector')).toBeInTheDocument());
    expect(screen.getByTestId('bench-inspector-stepper').textContent).toContain('2 / 3');
    fireEvent.click(screen.getByLabelText('Next person'));
    await waitFor(() =>
      expect(screen.getByTestId('bench-inspector-stepper').textContent).toContain('3 / 3'),
    );
    expect(screen.getByLabelText('Next person')).toBeDisabled();
  });
});
