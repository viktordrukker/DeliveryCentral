import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { VarianceBar } from './VarianceBar';

describe('VarianceBar', () => {
  it('renders a positive value to the right of center', () => {
    const { container } = render(<VarianceBar value={5} max={10} width={100} />);
    const fills = container.querySelectorAll('span');
    // span[0] = center axis, span[1] = filled segment
    expect(fills.length).toBe(2);
    const fill = fills[1] as HTMLSpanElement;
    expect(fill.style.left).toBe('50px');
    expect(fill.style.width).toBe('25px');
  });

  it('renders a negative value to the left of center', () => {
    const { container } = render(<VarianceBar value={-5} max={10} width={100} />);
    const fill = container.querySelectorAll('span')[1] as HTMLSpanElement;
    expect(fill.style.left).toBe('25px');
    expect(fill.style.width).toBe('25px');
  });

  it('clamps value above max', () => {
    const { container } = render(<VarianceBar value={20} max={10} width={100} />);
    const fill = container.querySelectorAll('span')[1] as HTMLSpanElement;
    expect(fill.style.width).toBe('50px');
  });

  it('uses positive tone for positive values in auto mode', () => {
    const { container } = render(<VarianceBar value={3} max={10} />);
    const fill = container.querySelectorAll('span')[1] as HTMLSpanElement;
    expect(fill.style.background).toContain('status-active');
  });

  it('uses danger tone for negative values in auto mode', () => {
    const { container } = render(<VarianceBar value={-3} max={10} />);
    const fill = container.querySelectorAll('span')[1] as HTMLSpanElement;
    expect(fill.style.background).toContain('status-danger');
  });

  it('explicit neutral tone overrides auto coloring', () => {
    const { container } = render(<VarianceBar value={5} max={10} tone="neutral" />);
    const fill = container.querySelectorAll('span')[1] as HTMLSpanElement;
    expect(fill.style.background).toContain('text-subtle');
  });

  it('aria-label describes the variance', () => {
    const { container } = render(<VarianceBar value={-2.5} max={5} />);
    const root = container.firstChild as HTMLElement;
    expect(root.getAttribute('aria-label')).toBe('Variance -2.5 of 5');
  });

  it('aria-label override', () => {
    const { container } = render(<VarianceBar value={1} max={10} ariaLabel="Custom" />);
    const root = container.firstChild as HTMLElement;
    expect(root.getAttribute('aria-label')).toBe('Custom');
  });

  it('handles max=0 without divide-by-zero', () => {
    const { container } = render(<VarianceBar value={3} max={0} />);
    expect(container.querySelector('[role="img"]')).not.toBeNull();
  });
});
