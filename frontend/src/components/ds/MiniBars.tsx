import { CSSProperties } from 'react';

export type MiniBarsTone = 'accent' | 'active' | 'warning' | 'danger' | 'info' | 'muted';

export interface MiniBarsProps {
  /** Series of numbers (non-negative). */
  data: number[];
  width?: number;
  height?: number;
  /** Color tone for in-budget bars. */
  tone?: MiniBarsTone;
  /** Optional threshold line. Bars exceeding `threshold` render as warning. */
  threshold?: number;
  /** Class names. */
  className?: string;
  style?: CSSProperties;
  /** ARIA label override. */
  ariaLabel?: string;
}

const TONE_COLOR: Record<MiniBarsTone, string> = {
  accent: 'var(--color-accent)',
  active: 'var(--color-status-active)',
  warning: 'var(--color-status-warning)',
  danger: 'var(--color-status-danger)',
  info: 'var(--color-status-info)',
  muted: 'var(--color-text-subtle)',
};

/**
 * Inline-SVG mini bar chart with optional threshold line. Bars exceeding
 * the threshold render in warning color. Used inside KPI cards for things
 * like weekly hours, weekly burn, etc.
 *
 * Reference: DS/chrome.jsx:202-224.
 */
export function MiniBars({
  data,
  width = 120,
  height = 28,
  tone = 'accent',
  threshold,
  className,
  style,
  ariaLabel,
}: MiniBarsProps): JSX.Element | null {
  if (data.length === 0) return null;
  const max = Math.max(...data, threshold ?? 0);
  if (max === 0) {
    // All zeros — render flat baseline
    return (
      <svg
        width={width}
        height={height}
        className={['ds-mini-bars', className].filter(Boolean).join(' ')}
        role="img"
        aria-label={ariaLabel ?? `${data.length} bars, all zero`}
        style={{ display: 'block', ...style }}
      >
        <line
          x1={0}
          y1={height - 1}
          x2={width}
          y2={height - 1}
          stroke="var(--color-text-subtle)"
          strokeWidth={1}
          opacity={0.4}
        />
      </svg>
    );
  }

  const barWidth = width / data.length - 2;
  const color = TONE_COLOR[tone];
  const overCount = threshold != null ? data.filter((v) => v > threshold).length : 0;
  const label =
    ariaLabel ??
    (threshold != null
      ? `${data.length} bars, ${overCount} above threshold ${threshold}`
      : `${data.length} bars, max ${max}`);

  return (
    <svg
      width={width}
      height={height}
      className={['ds-mini-bars', className].filter(Boolean).join(' ')}
      role="img"
      aria-label={label}
      style={{ display: 'block', ...style }}
    >
      {data.map((v, i) => {
        const h = (v / max) * (height - 2);
        const over = threshold != null && v > threshold;
        return (
          <rect
            key={i}
            x={i * (barWidth + 2)}
            y={height - h}
            width={barWidth}
            height={h}
            rx={1.5}
            fill={over ? 'var(--color-status-warning)' : color}
            opacity={over ? 1 : 0.85}
          />
        );
      })}
      {threshold != null && (
        <line
          x1={0}
          x2={width}
          y1={height - (threshold / max) * (height - 2)}
          y2={height - (threshold / max) * (height - 2)}
          stroke="var(--color-text-subtle)"
          strokeDasharray="2 2"
          opacity={0.6}
        />
      )}
    </svg>
  );
}
