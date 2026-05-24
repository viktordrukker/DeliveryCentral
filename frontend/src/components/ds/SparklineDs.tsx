import { CSSProperties } from 'react';

export type SparklineTone = 'accent' | 'active' | 'warning' | 'danger' | 'info' | 'muted';

export interface SparklineDsProps {
  /** Series of numbers. Empty array renders nothing. */
  data: number[];
  width?: number;
  height?: number;
  /** Color tone. Defaults to 'accent'. */
  tone?: SparklineTone;
  /** Show terminal dot on the last point. Defaults to true. */
  showLastPoint?: boolean;
  /** Show subtle area fill under the line. Defaults to true. */
  showAreaFill?: boolean;
  /** Class names. */
  className?: string;
  style?: CSSProperties;
  /** ARIA label for screen readers. Defaults to a summary of the trend. */
  ariaLabel?: string;
}

const TONE_COLOR: Record<SparklineTone, string> = {
  accent: 'var(--color-accent)',
  active: 'var(--color-status-active)',
  warning: 'var(--color-status-warning)',
  danger: 'var(--color-status-danger)',
  info: 'var(--color-status-info)',
  muted: 'var(--color-text-subtle)',
};

/**
 * Inline-SVG sparkline. Standalone (no recharts) — keeps bundle lean and
 * renders identically across themes via CSS vars.
 *
 * Coexists with `Sparkline` at `frontend/src/components/charts/Sparkline.tsx`
 * which uses recharts and is consumed by existing dashboards. Named
 * `SparklineDs` to avoid clashing imports during the migration window;
 * once redesigned pages adopt it the recharts version can be retired.
 *
 * Reference: DS/chrome.jsx:176-200.
 */
export function SparklineDs({
  data,
  width = 100,
  height = 28,
  tone = 'accent',
  showLastPoint = true,
  showAreaFill = true,
  className,
  style,
  ariaLabel,
}: SparklineDsProps): JSX.Element | null {
  if (data.length === 0) return null;
  if (data.length === 1) {
    // Degenerate case — render a single dot in the middle
    const color = TONE_COLOR[tone];
    return (
      <svg
        width={width}
        height={height}
        className={['ds-sparkline', className].filter(Boolean).join(' ')}
        role="img"
        aria-label={ariaLabel ?? `Single value ${data[0]}`}
        style={{ display: 'block', overflow: 'visible', ...style }}
      >
        <circle cx={width / 2} cy={height / 2} r="2.5" fill={color} />
      </svg>
    );
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts: [number, number][] = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y];
  });

  const d = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = d + ` L ${width.toFixed(1)} ${height.toFixed(1)} L 0 ${height.toFixed(1)} Z`;

  const color = TONE_COLOR[tone];
  const last = pts[pts.length - 1];
  const direction = data[data.length - 1] >= data[0] ? 'up' : 'down';
  const label = ariaLabel ?? `Trend ${direction} from ${data[0]} to ${data[data.length - 1]} over ${data.length} points`;

  return (
    <svg
      width={width}
      height={height}
      className={['ds-sparkline', className].filter(Boolean).join(' ')}
      role="img"
      aria-label={label}
      style={{ display: 'block', overflow: 'visible', ...style }}
    >
      {showAreaFill && <path d={area} fill={color} opacity={0.1} />}
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {showLastPoint && <circle cx={last[0]} cy={last[1]} r={2.5} fill={color} />}
    </svg>
  );
}
