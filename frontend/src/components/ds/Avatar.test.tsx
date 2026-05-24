import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Avatar, initials, nameHue } from './Avatar';

describe('initials()', () => {
  it('returns first letter for single-token name', () => {
    expect(initials('Cher')).toBe('C');
  });
  it('returns first letter of first + last token for multi-token name', () => {
    expect(initials('Priya Natarajan')).toBe('PN');
    expect(initials('John Q Public')).toBe('JP'); // first + last of 3 tokens
  });
  it('handles hyphenated names', () => {
    expect(initials('Anne-Marie Smith')).toBe('AS');
  });
  it('uppercases', () => {
    expect(initials('priya natarajan')).toBe('PN');
  });
  it('returns empty for empty/whitespace input', () => {
    expect(initials('')).toBe('');
    expect(initials('   ')).toBe('');
  });
});

describe('nameHue()', () => {
  it('returns a number in 1..8', () => {
    const hues = ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Frank', 'Grace', 'Heidi', 'Ivan']
      .map((n) => nameHue(n));
    for (const h of hues) expect(h).toBeGreaterThanOrEqual(1);
    for (const h of hues) expect(h).toBeLessThanOrEqual(8);
  });
  it('is deterministic for same name', () => {
    expect(nameHue('Priya Natarajan')).toBe(nameHue('Priya Natarajan'));
  });
  it('returns 1 for empty string', () => {
    expect(nameHue('')).toBe(1);
  });
});

describe('Avatar', () => {
  it('renders initials by default with role="img" + aria-label', () => {
    render(<Avatar name="Priya Natarajan" />);
    const el = screen.getByRole('img');
    expect(el).toHaveAttribute('aria-label', 'Avatar of Priya Natarajan');
    expect(el.textContent).toBe('PN');
  });

  it('renders image when src provided', () => {
    render(<Avatar name="Priya Natarajan" src="https://example.com/p.jpg" />);
    const img = screen.getByRole('img');
    expect(img.tagName).toBe('IMG');
    expect(img).toHaveAttribute('src', 'https://example.com/p.jpg');
    expect(img).toHaveAttribute('alt', 'Priya Natarajan');
  });

  it('applies stable data-hue attribute', () => {
    render(<Avatar name="Priya Natarajan" />);
    const el = screen.getByRole('img');
    const hue = el.getAttribute('data-hue');
    expect(hue).not.toBeNull();
    expect(Number(hue)).toBeGreaterThanOrEqual(1);
    expect(Number(hue)).toBeLessThanOrEqual(8);
  });

  it('size prop changes dimensions', () => {
    const { rerender, container } = render(<Avatar name="A B" size="sm" />);
    const el1 = container.querySelector('.ds-avatar') as HTMLElement;
    expect(el1.style.width).toBe('24px');
    rerender(<Avatar name="A B" size="xl" />);
    const el2 = container.querySelector('.ds-avatar') as HTMLElement;
    expect(el2.style.width).toBe('56px');
  });

  it('aria-label override works', () => {
    render(<Avatar name="Cher" ariaLabel="Custom label" />);
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Custom label');
  });
});
