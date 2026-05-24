import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Donut } from './Donut';

describe('Donut', () => {
  it('renders two concentric circles (track + arc)', () => {
    const { container } = render(<Donut value={50} />);
    expect(container.querySelectorAll('circle').length).toBe(2);
  });

  it('arc dasharray reflects percentage', () => {
    const { container } = render(<Donut value={25} max={100} size={56} thickness={6} />);
    const arc = container.querySelectorAll('circle')[1];
    const r = (56 - 6) / 2;
    const c = 2 * Math.PI * r;
    expect(arc.getAttribute('stroke-dasharray')).toBe(`${c * 0.25} ${c}`);
  });

  it('clamps value below 0', () => {
    const { container } = render(<Donut value={-10} />);
    const arc = container.querySelectorAll('circle')[1];
    const dash = arc.getAttribute('stroke-dasharray') ?? '';
    expect(dash.startsWith('0 ')).toBe(true);
  });

  it('clamps value above max', () => {
    const { container } = render(<Donut value={150} max={100} size={56} thickness={6} />);
    const arc = container.querySelectorAll('circle')[1];
    const r = (56 - 6) / 2;
    const c = 2 * Math.PI * r;
    expect(arc.getAttribute('stroke-dasharray')).toBe(`${c} ${c}`);
  });

  it('applies the tone color to the arc', () => {
    const { container } = render(<Donut value={50} tone="danger" />);
    const arc = container.querySelectorAll('circle')[1];
    expect(arc.getAttribute('stroke')).toContain('status-danger');
  });

  it('aria-label reports percentage by default', () => {
    const { container } = render(<Donut value={25} max={100} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-label')).toBe('25% of 100');
  });

  it('aria-label override', () => {
    const { container } = render(<Donut value={5} max={10} ariaLabel="Done" />);
    expect(container.querySelector('svg')?.getAttribute('aria-label')).toBe('Done');
  });

  it('renders a center label when provided', () => {
    const { container, getByText } = render(<Donut value={42} label="42%" />);
    expect(getByText('42%')).toBeTruthy();
    expect(container.querySelector('text')).not.toBeNull();
  });

  it('no center label when omitted', () => {
    const { container } = render(<Donut value={42} />);
    expect(container.querySelector('text')).toBeNull();
  });

  it('handles max=0 without divide-by-zero', () => {
    const { container } = render(<Donut value={5} max={0} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
