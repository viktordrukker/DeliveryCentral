import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { GanttRow } from './GanttRow';

describe('GanttRow', () => {
  it('renders label + track + bar', () => {
    const { container, getByText } = render(<GanttRow label="Discovery" start={0} end={20} />);
    expect(getByText('Discovery')).toBeTruthy();
    expect(container.querySelector('.ds-gantt-row__track')).not.toBeNull();
    expect(container.querySelector('.ds-gantt-row__bar')).not.toBeNull();
  });

  it('positions bar by start/total ratio', () => {
    const { container } = render(<GanttRow label="Build" start={25} end={75} total={100} />);
    const bar = container.querySelector('.ds-gantt-row__bar') as HTMLDivElement;
    expect(bar.style.left).toBe('25%');
    expect(bar.style.width).toBe('50%');
  });

  it('renders marker pin when provided', () => {
    const { container } = render(<GanttRow label="X" start={0} end={50} marker={30} />);
    expect(container.querySelector('.ds-gantt-row__marker')).not.toBeNull();
  });

  it('omits marker pin when not provided', () => {
    const { container } = render(<GanttRow label="X" start={0} end={50} />);
    expect(container.querySelector('.ds-gantt-row__marker')).toBeNull();
  });

  it('applies tone color to the bar', () => {
    const { container } = render(<GanttRow label="X" start={0} end={50} tone="danger" />);
    const bar = container.querySelector('.ds-gantt-row__bar') as HTMLDivElement;
    expect(bar.style.background).toContain('status-danger');
  });

  it('dim mode reduces opacity + uses muted text', () => {
    const { container } = render(<GanttRow label="Past" start={0} end={50} dim />);
    const bar = container.querySelector('.ds-gantt-row__bar') as HTMLDivElement;
    const labelEl = container.querySelector('.ds-gantt-row__label') as HTMLSpanElement;
    expect(bar.style.opacity).toBe('0.5');
    expect(labelEl.style.color).toContain('text-muted');
  });

  it('clamps start below 0 and end above total', () => {
    const { container } = render(<GanttRow label="X" start={-10} end={150} total={100} />);
    const bar = container.querySelector('.ds-gantt-row__bar') as HTMLDivElement;
    expect(bar.style.left).toBe('0%');
    expect(bar.style.width).toBe('100%');
  });

  it('aria-label uses provided string label by default', () => {
    const { container } = render(<GanttRow label="Discovery" start={5} end={20} total={100} />);
    const root = container.firstChild as HTMLElement;
    expect(root.getAttribute('aria-label')).toBe('Discovery from 5 to 20 of 100');
  });

  it('aria-label override', () => {
    const { container } = render(
      <GanttRow label="X" start={0} end={10} ariaLabel="Custom segment" />,
    );
    expect((container.firstChild as HTMLElement).getAttribute('aria-label')).toBe(
      'Custom segment',
    );
  });

  it('zero-length segment renders without crash', () => {
    const { container } = render(<GanttRow label="Milestone" start={50} end={50} />);
    const bar = container.querySelector('.ds-gantt-row__bar') as HTMLDivElement;
    expect(bar.style.width).toBe('0%');
  });
});
