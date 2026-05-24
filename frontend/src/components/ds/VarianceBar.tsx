import { CSSProperties } from 'react';

export type VarianceBarTone = 'auto' | 'positive' | 'negative' | 'danger' | 'neutral';

export interface VarianceBarProps {
  /** Signed value. Negative renders left of center, positive right of center. */
  value: number;
  /** Symmetric scale endpoint — |value| is clamped to `max`. */
  max: number;
  width?: number;
  height?: number;
  /**
   * Tone resolution. `'auto'` colors by sign (positive = active, negative = danger).
   * Explicit tones override.
   */
  tone?: VarianceBarTone;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
}

const TONE_COLOR: Record<Exclude<VarianceBarTone, 'auto'>, string> = {
  positive: 'var(--color-status-active)',
  negative: 'var(--color-status-danger)',
  danger: 'var(--color-status-danger)',
  neutral: 'var(--color-text-subtle)',
};

/**
 * Variance bar with split positive/negative track around a center axis.
 * Used in Project Pulse / Money tabs to render delta-from-baseline visually.
 *
 * Reference: DS/chrome.jsx:227-239.
 */
export function VarianceBar({
  value,
  max,
  width = 120,
  height = 8,
  tone = 'auto',
  className,
  style,
  ariaLabel,
}: VarianceBarProps): JSX.Element {
  const safeMax = max > 0 ? max : 1;
  const pct = Math.min(1, Math.abs(value) / safeMax);
  const fillWidth = (pct * (width / 2)).toFixed(1);
  const isNeg = value < 0;
  const fillLeft = isNeg
    ? (width / 2 - pct * (width / 2)).toFixed(1)
    : (width / 2).toFixed(1);
  const resolvedTone: Exclude<VarianceBarTone, 'auto'> =
    tone === 'auto' ? (isNeg ? 'negative' : 'positive') : tone;
  const color = TONE_COLOR[resolvedTone];
  const label = ariaLabel ?? `Variance ${value} of ${safeMax}`;

  return (
    <div
      className={['ds-variance-bar', className].filter(Boolean).join(' ')}
      role="img"
      aria-label={label}
      style={{
        position: 'relative',
        width,
        height,
        background: 'var(--color-surface-alt)',
        borderRadius: height / 2,
        ...style,
      }}
    >
      <span
        style={{
          position: 'absolute',
          left: width / 2 - 0.5,
          top: 0,
          width: 1,
          height,
          background: 'var(--color-border-strong)',
          opacity: 0.6,
        }}
      />
      <span
        style={{
          position: 'absolute',
          left: `${fillLeft}px`,
          top: 0,
          width: `${fillWidth}px`,
          height,
          background: color,
          borderRadius: height / 2,
        }}
      />
    </div>
  );
}
