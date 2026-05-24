import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Money } from './Money';

describe('Money', () => {
  it('renders positive whole-dollar by default', () => {
    const { container } = render(<Money value={1234} />);
    expect(container.textContent).toBe('$1,234');
  });

  it('renders negative with Unicode minus prefix', () => {
    const { container } = render(<Money value={-1234} />);
    expect(container.textContent).toBe('$–1,234');
  });

  it('compact 1.5k for 1500', () => {
    const { container } = render(<Money value={1500} compact />);
    expect(container.textContent).toBe('$1.5k');
  });

  it('compact 2.4M for 2_400_000', () => {
    const { container } = render(<Money value={2_400_000} compact />);
    expect(container.textContent).toBe('$2.4M');
  });

  it('compact strips trailing zeros', () => {
    const { container } = render(<Money value={1_000_000} compact />);
    expect(container.textContent).toBe('$1M');
  });

  it('compact handles negative', () => {
    const { container } = render(<Money value={-3500} compact />);
    expect(container.textContent).toBe('–$3.5k');
  });

  it('EUR symbol', () => {
    const { container } = render(<Money value={500} currency="EUR" />);
    expect(container.textContent).toBe('€500');
  });

  it('unknown currency uses prefix code', () => {
    const { container } = render(<Money value={500} currency="UZS" />);
    expect(container.textContent).toBe('UZS 500');
  });

  it('maxFractionDigits respected', () => {
    const { container } = render(<Money value={123.456} maxFractionDigits={2} />);
    expect(container.textContent).toBe('$123.46');
  });

  it('tabular-nums applied', () => {
    const { container } = render(<Money value={100} />);
    const span = container.querySelector('.ds-money') as HTMLElement;
    expect(span.style.fontVariantNumeric).toBe('tabular-nums lining-nums');
  });

  it('aria-label includes "Negative" for negatives', () => {
    const { container } = render(<Money value={-100} />);
    const span = container.querySelector('.ds-money') as HTMLElement;
    expect(span.getAttribute('aria-label')).toContain('Negative');
  });
});
