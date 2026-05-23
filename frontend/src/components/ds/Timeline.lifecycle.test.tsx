import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Timeline, type TimelineSegment, lifecycleStatusOf } from './Timeline';

const today = new Date();
const iso = (offsetDays: number): string => {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

describe('lifecycleStatusOf', () => {
  it('maps canonical lowercase statuses', () => {
    expect(lifecycleStatusOf('draft')).toBe('draft');
    expect(lifecycleStatusOf('open')).toBe('open');
    expect(lifecycleStatusOf('proposed')).toBe('proposed');
    expect(lifecycleStatusOf('booked')).toBe('booked');
    expect(lifecycleStatusOf('onboarding')).toBe('onboarding');
    expect(lifecycleStatusOf('assigned')).toBe('assigned');
    expect(lifecycleStatusOf('hold')).toBe('hold');
    expect(lifecycleStatusOf('released')).toBe('released');
  });

  it('normalizes case and separators (ON_HOLD, on-hold, On Hold all → hold)', () => {
    expect(lifecycleStatusOf('ON_HOLD')).toBe('hold');
    expect(lifecycleStatusOf('on-hold')).toBe('hold');
    expect(lifecycleStatusOf('On Hold')).toBe('hold');
  });

  it('maps workflow-state synonyms used in the existing codebase', () => {
    expect(lifecycleStatusOf('IN_REVIEW')).toBe('proposed');
    expect(lifecycleStatusOf('APPROVED')).toBe('booked');
    expect(lifecycleStatusOf('ACTIVE')).toBe('assigned');
    expect(lifecycleStatusOf('COMPLETED')).toBe('released');
    expect(lifecycleStatusOf('CANCELLED')).toBe('released');
  });

  it('returns null for unknown / undefined statuses', () => {
    expect(lifecycleStatusOf('foobar')).toBeNull();
    expect(lifecycleStatusOf(null)).toBeNull();
    expect(lifecycleStatusOf(undefined)).toBeNull();
    expect(lifecycleStatusOf('')).toBeNull();
  });
});

describe('Timeline colorMode="lifecycle"', () => {
  const segments: TimelineSegment[] = [
    { allocationPercent: 80, endDate: iso(30), id: 'a', label: 'Project Alpha', startDate: iso(-10), status: 'assigned' },
    { allocationPercent: 50, endDate: iso(45), id: 'b', label: 'Project Beta', startDate: iso(15), status: 'proposed' },
    { allocationPercent: 20, endDate: iso(60), id: 'c', label: 'Project Gamma', startDate: iso(30), status: 'open' },
  ];

  it('renders each segment with a data-lifecycle attribute matching its status', () => {
    render(<Timeline segments={segments} colorMode="lifecycle" variant="stacked" />);
    expect(document.querySelector('[data-lifecycle="assigned"]')).not.toBeNull();
    expect(document.querySelector('[data-lifecycle="proposed"]')).not.toBeNull();
    expect(document.querySelector('[data-lifecycle="open"]')).not.toBeNull();
  });

  it('lifecycle bar uses the booked fill token when status="booked"', () => {
    const bookedSegs: TimelineSegment[] = [
      { allocationPercent: 100, endDate: iso(30), id: 'a', label: 'Project Alpha', startDate: iso(-10), status: 'booked' },
    ];
    render(<Timeline segments={bookedSegs} colorMode="lifecycle" variant="bar" />);
    const bar = document.querySelector('[data-lifecycle="booked"]') as HTMLButtonElement | null;
    expect(bar).not.toBeNull();
    expect(bar?.style.background).toContain('lifecycle-booked-fill');
  });

  it('open status renders with a stroke and transparent fill', () => {
    const openSegs: TimelineSegment[] = [
      { allocationPercent: 100, endDate: iso(30), id: 'a', label: 'Project Alpha', startDate: iso(-10), status: 'open' },
    ];
    render(<Timeline segments={openSegs} colorMode="lifecycle" variant="bar" />);
    const bar = document.querySelector('[data-lifecycle="open"]') as HTMLButtonElement | null;
    expect(bar).not.toBeNull();
    expect(bar?.style.background).toContain('lifecycle-open-fill');
    expect(bar?.style.borderColor).toContain('lifecycle-open-stroke');
  });

  it('unknown status falls back to tone-based coloring (no data-lifecycle attribute)', () => {
    const unknownSegs: TimelineSegment[] = [
      { allocationPercent: 100, endDate: iso(30), id: 'a', label: 'Project Alpha', startDate: iso(-10), status: 'UNKNOWN_STATE' },
    ];
    render(<Timeline segments={unknownSegs} colorMode="lifecycle" variant="bar" />);
    // data-lifecycle should NOT be set since status doesn't map.
    expect(document.querySelector('[data-lifecycle]')).toBeNull();
    // Should still render a button via tone path.
    expect(screen.getByRole('button', { name: /Project Alpha/i })).toBeInTheDocument();
  });

  it('default colorMode is "tone" — no data-lifecycle attribute on bars', () => {
    const segs: TimelineSegment[] = [
      { allocationPercent: 100, endDate: iso(30), id: 'a', label: 'Project Alpha', startDate: iso(-10), status: 'assigned' },
    ];
    render(<Timeline segments={segs} variant="bar" />);
    expect(document.querySelector('[data-lifecycle]')).toBeNull();
  });

  it('released segments render at reduced opacity', () => {
    const releasedSegs: TimelineSegment[] = [
      { allocationPercent: 100, endDate: iso(30), id: 'a', label: 'Project Alpha', startDate: iso(-10), status: 'released' },
    ];
    render(<Timeline segments={releasedSegs} colorMode="lifecycle" variant="bar" />);
    const bar = document.querySelector('[data-lifecycle="released"]') as HTMLButtonElement;
    expect(parseFloat(bar.style.opacity)).toBeLessThan(1);
  });

  it('draft segments render with dashed border', () => {
    const draftSegs: TimelineSegment[] = [
      { allocationPercent: 100, endDate: iso(30), id: 'a', label: 'Project Alpha', startDate: iso(-10), status: 'draft' },
    ];
    render(<Timeline segments={draftSegs} colorMode="lifecycle" variant="bar" />);
    const bar = document.querySelector('[data-lifecycle="draft"]') as HTMLButtonElement;
    expect(bar.style.borderStyle).toBe('dashed');
  });
});
