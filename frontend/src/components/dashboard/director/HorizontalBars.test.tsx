import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { HorizontalBars } from './HorizontalBars';

const ROWS = [
  { id: 'a', label: 'Alpha', value: 82, color: 'var(--color-status-active)' },
  { id: 'b', label: 'Bravo', value: 45 },
  { id: 'c', label: 'Charlie', value: 0 },
];

describe('HorizontalBars', () => {
  it('renders one list item per row with label + value', () => {
    render(<HorizontalBars rows={ROWS} testId="hb" />);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Bravo')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
    expect(screen.getByText('82%')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('clamps bar width to [0, max] proportion of the track', () => {
    const { container } = render(<HorizontalBars rows={ROWS} max={100} />);
    const inner = container.querySelectorAll('[role="img"] > div') as NodeListOf<HTMLDivElement>;
    expect(inner[0].style.width).toBe('82%');
    expect(inner[1].style.width).toBe('45%');
    expect(inner[2].style.width).toBe('0%');
  });

  it('uses the per-row color when provided, accent fallback otherwise', () => {
    const { container } = render(<HorizontalBars rows={ROWS} />);
    const inner = container.querySelectorAll('[role="img"] > div') as NodeListOf<HTMLDivElement>;
    expect(inner[0].style.background).toContain('color-status-active');
    expect(inner[1].style.background).toContain('color-accent');
  });

  it('honours a custom formatValue', () => {
    render(<HorizontalBars rows={ROWS} formatValue={(v) => `${v} pts`} />);
    expect(screen.getByText('82 pts')).toBeInTheDocument();
    expect(screen.getByText('45 pts')).toBeInTheDocument();
  });

  it('exposes aria-label + role on the outer list and on each bar', () => {
    render(<HorizontalBars rows={ROWS} ariaLabel="Test bars" />);
    expect(screen.getByRole('list', { name: 'Test bars' })).toBeInTheDocument();
    expect(screen.getByLabelText('Alpha: 82%')).toBeInTheDocument();
    expect(screen.getByLabelText('Bravo: 45%')).toBeInTheDocument();
  });

  it('handles max=0 without dividing by zero', () => {
    const { container } = render(<HorizontalBars rows={[{ id: 'z', label: 'Zero', value: 50 }]} max={0} />);
    const inner = container.querySelector('[role="img"] > div') as HTMLDivElement;
    // safeMax falls back to 1, so 50/1 clamps to 100% width.
    expect(inner.style.width).toBe('100%');
  });
});
