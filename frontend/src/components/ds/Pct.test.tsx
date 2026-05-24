import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Pct } from './Pct';

describe('Pct', () => {
  it('renders positive with default 1 fraction digit', () => {
    const { container } = render(<Pct value={12.5} />);
    expect(container.textContent).toBe('12.5%');
  });

  it('renders negative with Unicode minus prefix', () => {
    const { container } = render(<Pct value={-3.4} />);
    expect(container.textContent).toBe('–3.4%');
  });

  it('sign=true prepends + for positives', () => {
    const { container } = render(<Pct value={8.2} sign />);
    expect(container.textContent).toBe('+8.2%');
  });

  it('sign=true does not double-prefix negatives', () => {
    const { container } = render(<Pct value={-3.4} sign />);
    expect(container.textContent).toBe('–3.4%');
  });

  it('fractionDigits=0 strips decimals', () => {
    const { container } = render(<Pct value={12.7} fractionDigits={0} />);
    expect(container.textContent).toBe('13%');
  });

  it('tone="auto" colors negative as danger', () => {
    const { container } = render(<Pct value={-5} tone="auto" />);
    const el = container.querySelector('.ds-pct') as HTMLElement;
    expect(el.style.color).toContain('status-danger');
  });

  it('tone="auto" colors positive as active', () => {
    const { container } = render(<Pct value={5} tone="auto" />);
    const el = container.querySelector('.ds-pct') as HTMLElement;
    expect(el.style.color).toContain('status-active');
  });

  it('explicit tone overrides auto', () => {
    const { container } = render(<Pct value={5} tone="warning" />);
    const el = container.querySelector('.ds-pct') as HTMLElement;
    expect(el.style.color).toContain('status-warning');
  });

  it('aria-label describes negative', () => {
    const { container } = render(<Pct value={-3.4} />);
    const el = container.querySelector('.ds-pct') as HTMLElement;
    expect(el.getAttribute('aria-label')).toContain('minus');
  });
});
