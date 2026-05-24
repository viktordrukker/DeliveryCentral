import { CSSProperties } from 'react';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  /** Person's display name. Used to derive initials + a stable hue. */
  name: string;
  /** Optional image src. When provided, renders an `<img>` and ignores initials/hue. */
  src?: string;
  /** Size token. Defaults to 'md'. */
  size?: AvatarSize;
  /** Alt text override for image avatars; defaults to `name`. */
  alt?: string;
  /** Extra class names (appended). */
  className?: string;
  /** Inline style overrides. */
  style?: CSSProperties;
  /** Optional aria-label override (defaults to `Avatar of {name}`). */
  ariaLabel?: string;
}

const SIZE_PX: Record<AvatarSize, { dim: number; font: number }> = {
  xs: { dim: 20, font: 9 },
  sm: { dim: 24, font: 10 },
  md: { dim: 32, font: 12 },
  lg: { dim: 40, font: 14 },
  xl: { dim: 56, font: 18 },
};

/**
 * Initials from a display name. First letter of the first + last whitespace-separated tokens, max 2.
 * "Priya Natarajan" -> "PN"
 * "Cher" -> "C"
 * "Anne-Marie O'Connor" -> "AO" (hyphens treated as word boundary by split)
 */
export function initials(name: string): string {
  const tokens = name.trim().split(/[\s-]+/).filter(Boolean);
  if (tokens.length === 0) return '';
  if (tokens.length === 1) return tokens[0][0].toUpperCase();
  return (tokens[0][0] + tokens[tokens.length - 1][0]).toUpperCase();
}

/**
 * Deterministic hue 1..8 from a string. Used to pick one of 8 avatar background
 * colors so the same person always gets the same colour.
 */
export function nameHue(name: string): 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 {
  if (!name) return 1;
  const sum = Array.from(name).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return ((sum % 8) + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
}

const HUE_BG: Record<number, string> = {
  1: 'var(--color-chart-1)',
  2: 'var(--color-chart-2)',
  3: 'var(--color-chart-3)',
  4: 'var(--color-chart-4)',
  5: 'var(--color-chart-5)',
  6: 'var(--color-chart-6)',
  7: 'var(--color-chart-7)',
  8: 'var(--color-chart-8)',
};

/**
 * Person avatar — either an image (when `src` is provided) or initials on a
 * deterministic colored background derived from the name.
 *
 * Used inside the DS sidebar user card, person rows, drawer headers, etc.
 *
 * A11y: renders `role="img"` + computed `aria-label`. Initials text is
 * `aria-hidden` since the name is already in the label.
 */
export function Avatar({
  name,
  src,
  size = 'md',
  alt,
  className,
  style,
  ariaLabel,
}: AvatarProps): JSX.Element {
  const sz = SIZE_PX[size];
  const label = ariaLabel ?? `Avatar of ${name}`;
  const cls = ['ds-avatar', `ds-avatar--${size}`, className].filter(Boolean).join(' ');

  if (src) {
    return (
      <img
        src={src}
        alt={alt ?? name}
        className={cls}
        width={sz.dim}
        height={sz.dim}
        style={{
          display: 'inline-block',
          width: sz.dim,
          height: sz.dim,
          borderRadius: '50%',
          objectFit: 'cover',
          verticalAlign: 'middle',
          ...style,
        }}
      />
    );
  }

  const hue = nameHue(name);
  return (
    <span
      role="img"
      aria-label={label}
      data-hue={hue}
      className={cls}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: sz.dim,
        height: sz.dim,
        borderRadius: '50%',
        background: HUE_BG[hue],
        color: 'var(--color-text-inverse)',
        fontSize: sz.font,
        fontWeight: 600,
        fontFamily: 'var(--font-sans)',
        userSelect: 'none',
        verticalAlign: 'middle',
        ...style,
      }}
    >
      <span aria-hidden="true">{initials(name)}</span>
    </span>
  );
}
