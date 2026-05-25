import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { BenchInspector } from './BenchInspector';
import type { BenchEnrichedRowDto } from '@/lib/api/people-bench';

const baseRow: BenchEnrichedRowDto = {
  personId: 'p-1',
  name: 'Ada Lovelace',
  role: 'Engineer',
  office: 'London',
  grade: 'L4',
  isOnBench: true,
  daysOnBench: 22,
  availabilityHours14d: 64,
  suggestedProjectIds: [],
};

function renderInspector(row: Partial<BenchEnrichedRowDto> = {}, onClose = vi.fn()): { onClose: ReturnType<typeof vi.fn> } {
  render(
    <MemoryRouter>
      <BenchInspector row={{ ...baseRow, ...row }} onClose={onClose} />
    </MemoryRouter>,
  );
  return { onClose };
}

describe('BenchInspector', () => {
  it('renders identity, days idle, availability, and headroom', () => {
    renderInspector({ daysOnBench: 22, availabilityHours14d: 64 });
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText(/Engineer.*L4.*London/)).toBeInTheDocument();
    expect(screen.getByText('22d')).toBeInTheDocument();
    expect(screen.getByText('64h')).toBeInTheDocument();
    // headroom = 64/80 = 80%
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('shows empty-state when no suggested fills', () => {
    renderInspector({ suggestedProjectIds: [] });
    expect(screen.getByText(/No matching engine suggestions/i)).toBeInTheDocument();
  });

  it('lists suggested project IDs as links', () => {
    renderInspector({ suggestedProjectIds: ['proj-a', 'proj-b'] });
    expect(screen.getByText('Suggested fills (2)')).toBeInTheDocument();
    const linkA = screen.getByRole('link', { name: 'proj-a' });
    const linkB = screen.getByRole('link', { name: 'proj-b' });
    expect(linkA).toHaveAttribute('href', '/projects/proj-a');
    expect(linkB).toHaveAttribute('href', '/projects/proj-b');
  });

  it('disables "Propose to position" when no suggestions exist', () => {
    renderInspector({ suggestedProjectIds: [] });
    expect(screen.getByRole('button', { name: 'Propose to position' })).toBeDisabled();
  });

  it('enables "Propose to position" when suggestions exist', () => {
    renderInspector({ suggestedProjectIds: ['proj-a'] });
    expect(screen.getByRole('button', { name: 'Propose to position' })).toBeEnabled();
  });

  it('fires onClose when the close button is clicked', async () => {
    const user = userEvent.setup();
    const { onClose } = renderInspector();
    await user.click(screen.getByRole('button', { name: /close inspector/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('links "Open profile" to /people/:id', () => {
    renderInspector({ personId: 'p-42' });
    expect(screen.getByRole('link', { name: 'Open profile' })).toHaveAttribute('href', '/people/p-42');
  });
});
