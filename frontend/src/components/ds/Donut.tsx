import { CSSProperties } from 'react';

export type DonutTone = 'accent' | 'active' | 'warning' | 'danger' | 'info' | 'muted';

export interface DonutProps {
  /** Current value (0..max). Clamped. */
  value: number;
  /** Scale endpoint. Default 100 (i.e. percentage). */
  max?: number;
  /** Outer diameter in px. */
  size?: number;
  /** Ring color tone. */
  tone?: DonutTone;
  /** Ring thickness. */
  thickness?: number;
  /** Optional center label. When omitted, no text renders. */
  label?: string;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
}

const TONE_COLOR: Record<DonutTone, string> = {
  accent: 'var(--color-accent)',
  active: 'var(--color-status-active)',
  warning: 'var(--color-status-warning)',
  danger: 'var(--color-status-danger)',
  info: 'var(--color-status-info)',
  muted: 'var(--color-text-subtle)',
};

/**
 * Single-ring donut chart. Renders the proportion `value / max` as an arc
 * starting at 12 o'clock and growing clockwise.
 *
 * Reference: DS/chrome.jsx:241-259.
 */
export function Donut({
  value,
  max = 100,
  size = 56,
  tone = 'accent',
  thickness = 6,
  label,
  className,
  style,
  ariaLabel,
}: DonutProps): JSX.Element {
  const safeMax = max > 0 ? max : 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / safeMax));
  const color = TONE_COLOR[tone];
  const center = size / 2;
  const a11y = ariaLabel ?? `${Math.round(pct * 100)}% of ${safeMax}`;

  return (
    <svg
      width={size}
      height={size}
      className={['ds-donut', className].filter(Boolean).join(' ')}
      role="img"
      aria-label={a11y}
      style={{ display: 'block', ...style }}
    >
      <circle
        cx={center}
        cy={center}
        r={r}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth={thickness}
      />
      <circle
        cx={center}
        cy={center}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={thickness}
        strokeDasharray={`${c * pct} ${c}`}
        strokeDashoffset={c * 0.25}
        transform={`rotate(-90 ${center} ${center})`}
        strokeLinecap="round"
      />
      {label && (
        <text
          x={center}
          y={center}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={Math.max(10, size / 4.5)}
          fill="var(--color-text)"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {label}
        </text>
      )}
    </svg>
  );
}
