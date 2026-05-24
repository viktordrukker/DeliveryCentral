import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SparklineDs } from './SparklineDs';

describe('SparklineDs', () => {
  it('returns null for empty data', () => {
    const { container } = render(<SparklineDs data={[]} />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('renders a single dot for single-value data', () => {
    const { container } = render(<SparklineDs data={[42]} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.querySelector('circle')).not.toBeNull();
  });

  it('renders line + area + endpoint for series', () => {
    const { container } = render(<SparklineDs data={[1, 3, 2, 5, 4]} />);
    const paths = container.querySelectorAll('path');
    // 2 paths: area fill + stroke
    expect(paths.length).toBe(2);
    // 1 circle at last point
    expect(container.querySelectorAll('circle').length).toBe(1);
  });

  it('hides area fill when showAreaFill=false', () => {
    const { container } = render(<SparklineDs data={[1, 2, 3]} showAreaFill={false} />);
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(1);
  });

  it('hides last-point dot when showLastPoint=false', () => {
    const { container } = render(<SparklineDs data={[1, 2, 3]} showLastPoint={false} />);
    expect(container.querySelectorAll('circle').length).toBe(0);
  });

  it('applies tone color', () => {
    const { container } = render(<SparklineDs data={[1, 2, 3]} tone="danger" />);
    const stroke = (container.querySelector('path[stroke]') as SVGPathElement).getAttribute('stroke');
    expect(stroke).toContain('status-danger');
  });

  it('renders SVG with role=img + aria-label', () => {
    const { container } = render(<SparklineDs data={[1, 2, 3]} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('role')).toBe('img');
    expect(svg?.getAttribute('aria-label')).toMatch(/Trend (up|down) from 1 to 3/);
  });

  it('aria-label override', () => {
    const { container } = render(<SparklineDs data={[1, 2, 3]} ariaLabel="Custom" />);
    expect(container.querySelector('svg')?.getAttribute('aria-label')).toBe('Custom');
  });

  it('flat data renders without crash', () => {
    const { container } = render(<SparklineDs data={[5, 5, 5]} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('custom dimensions applied', () => {
    const { container } = render(<SparklineDs data={[1, 2, 3]} width={200} height={50} />);
    const svg = container.querySelector('svg') as SVGElement;
    expect(svg.getAttribute('width')).toBe('200');
    expect(svg.getAttribute('height')).toBe('50');
  });
});
