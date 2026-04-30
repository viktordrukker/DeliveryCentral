import { HTMLAttributes } from 'react';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg';

interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  size?: SpinnerSize;
  /** Default `"Loading…"` — set to a more specific label when context allows. */
  label?: string;
}

/**
 * Indeterminate spinner. Color inherits via `currentColor` when used inside a
 * Button; otherwise defaults to `--color-accent`.
 *
 * Respects `prefers-reduced-motion` (no animation).
 */
export function Spinner({
  size = 'md',
  label = 'Loading…',
  className,
  ...rest
}: SpinnerProps): JSX.Element {
  const merged = ['ds-spinner', `ds-spinner--${size}`, className]
    .filter(Boolean)
    .join(' ');
  return <span className={merged} role="status" aria-label={label} {...rest} />;
}
