import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Timeline, type TimelineSegment } from './Timeline';

const today = new Date();
const iso = (offsetDays: number): string => {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

const baseSegments: TimelineSegment[] = [
  { allocationPercent: 60, endDate: iso(30), id: 'a', label: 'Project Alpha', startDate: iso(-10), status: 'APPROVED' },
  { allocationPercent: 40, endDate: iso(60), id: 'b', label: 'Project Beta', startDate: iso(20), status: 'IN_REVIEW' },
];

describe('Timeline', () => {
  it('renders an empty state when no segments are in range', () => {
    render(<Timeline segments={[]} testId="t" />);
    expect(screen.getByTestId('t')).toBeInTheDocument();
    expect(screen.getByText(/No assignments in range/i)).toBeInTheDocument();
  });

  it('renders one focusable button per segment for stacked variant', () => {
    render(<Timeline segments={baseSegments} testId="t" variant="stacked" />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(baseSegments.length);
    expect(buttons[0]).toHaveAttribute('aria-label', expect.stringContaining('Project Alpha'));
  });

  it('opens a hover card on focus and shows segment label', async () => {
    const user = userEvent.setup();
    render(<Timeline segments={baseSegments} testId="t" variant="stacked" />);
    const first = screen.getAllByRole('button')[0];
    await user.tab();
    expect(first).toHaveFocus();
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent('Project Alpha');
  });

  it('invokes onSegmentClick when a bar is clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Timeline onSegmentClick={onClick} segments={baseSegments} variant="stacked" />);
    const first = screen.getAllByRole('button')[0];
    await user.click(first);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick.mock.calls[0][0].id).toBe('a');
  });

  it('uses the explicit tone override when supplied', () => {
    const segs: TimelineSegment[] = [
      { allocationPercent: 50, endDate: iso(20), id: 'x', label: 'Override', startDate: iso(-5), tone: 'danger' },
    ];
    render(<Timeline segments={segs} variant="stacked" />);
    const button = screen.getByRole('button');
    expect(button.getAttribute('data-tone')).toBe('danger');
  });

  it('maps unknown statuses through resolveStatusTone', () => {
    const segs: TimelineSegment[] = [
      { allocationPercent: 50, endDate: iso(20), id: 'y', label: 'Booked', startDate: iso(-5), status: 'BOOKED' },
    ];
    render(<Timeline segments={segs} variant="stacked" />);
    const button = screen.getByRole('button');
    expect(button.getAttribute('data-tone')).toBe('info');
  });

  it('renders a today indicator by default and hides it when showToday is false', () => {
    const { container, rerender } = render(<Timeline segments={baseSegments} testId="t" variant="stacked" />);
    expect(container.querySelector('.ds-timeline__today')).not.toBeNull();
    rerender(<Timeline segments={baseSegments} showToday={false} testId="t" variant="stacked" />);
    expect(container.querySelector('.ds-timeline__today')).toBeNull();
  });

  it('renders conflict shading for overallocated weeks', () => {
    const overlap: TimelineSegment[] = [
      { allocationPercent: 80, endDate: iso(30), id: '1', label: 'A', startDate: iso(-10), status: 'APPROVED' },
      { allocationPercent: 50, endDate: iso(40), id: '2', label: 'B', startDate: iso(5), status: 'APPROVED' },
    ];
    const { container } = render(<Timeline segments={overlap} variant="stacked" />);
    expect(container.querySelectorAll('.ds-timeline__conflict').length).toBeGreaterThan(0);
  });

  it('renders the bar variant with one rectangle per segment', () => {
    render(<Timeline segments={baseSegments} variant="bar" />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(baseSegments.length);
  });

  it('cycles focus with arrow keys', async () => {
    const user = userEvent.setup();
    render(<Timeline segments={baseSegments} variant="bar" />);
    const buttons = screen.getAllByRole('button');
    buttons[0].focus();
    await user.keyboard('{ArrowRight}');
    expect(buttons[1]).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(buttons[0]).toHaveFocus();
  });

  it('respects custom renderHoverCard', async () => {
    const user = userEvent.setup();
    render(
      <Timeline
        renderHoverCard={(s) => <div>Custom card for {s.label}</div>}
        segments={baseSegments}
        variant="stacked"
      />,
    );
    await user.tab();
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent('Custom card for Project Alpha');
  });
});
