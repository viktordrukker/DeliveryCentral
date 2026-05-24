import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MiniBars } from './MiniBars';

describe('MiniBars', () => {
  it('returns null for empty data', () => {
    const { container } = render(<MiniBars data={[]} />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('all-zeros renders a baseline line', () => {
    const { container } = render(<MiniBars data={[0, 0, 0]} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.querySelector('line')).not.toBeNull();
    expect(svg?.querySelectorAll('rect').length).toBe(0);
  });

  it('renders one rect per data point', () => {
    const { container } = render(<MiniBars data={[1, 2, 3, 4]} />);
    expect(container.querySelectorAll('rect').length).toBe(4);
  });

  it('threshold renders dashed line', () => {
    const { container } = render(<MiniBars data={[1, 2, 3, 4]} threshold={3} />);
    const lines = container.querySelectorAll('line');
    expect(lines.length).toBe(1);
    expect(lines[0].getAttribute('stroke-dasharray')).toBe('2 2');
  });

  it('bars above threshold render warning color', () => {
    const { container } = render(<MiniBars data={[1, 5, 2, 6]} threshold={3} tone="accent" />);
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBe(4);
    // Bars 5 and 6 are above threshold 3
    const warningRects = Array.from(rects).filter((r) => r.getAttribute('fill')?.includes('status-warning'));
    expect(warningRects.length).toBe(2);
  });

  it('aria-label describes threshold breach count', () => {
    const { container } = render(<MiniBars data={[1, 5, 2, 6]} threshold={3} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-label')).toContain('2 above threshold 3');
  });

  it('aria-label without threshold reports max', () => {
    const { container } = render(<MiniBars data={[1, 5, 2, 6]} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-label')).toContain('max 6');
  });

  it('aria-label override', () => {
    const { container } = render(<MiniBars data={[1, 2]} ariaLabel="Custom bars" />);
    expect(container.querySelector('svg')?.getAttribute('aria-label')).toBe('Custom bars');
  });

  it('tone color applied to in-budget bars', () => {
    const { container } = render(<MiniBars data={[1, 2, 3]} tone="danger" />);
    const rects = container.querySelectorAll('rect');
    expect(rects[0].getAttribute('fill')).toContain('status-danger');
  });
});
