import { CSSProperties } from 'react';

export interface PctProps {
  /** Numeric value (e.g. 12.5 renders as "12.5%"). */
  value: number;
  /** When true, positive values show a `+` prefix. Default false. */
  sign?: boolean;
  /** Fraction digits. Default 1 (e.g. "12.5%"). Set to 0 for whole-percent. */
  fractionDigits?: number;
  /** Tone-aware coloring. `auto` colors negative red / positive green / zero text. */
  tone?: 'default' | 'auto' | 'active' | 'warning' | 'danger' | 'info' | 'muted';
  /** Extra class names. */
  className?: string;
  style?: CSSProperties;
  /** Optional aria-label override. */
  ariaLabel?: string;
}

/**
 * Tabular-num percentage formatter.
 *
 * Examples:
 *   <Pct value={12.5} />            // "12.5%"
 *   <Pct value={-3.4} sign />       // "-3.4%"
 *   <Pct value={8} sign />          // "+8.0%"
 *   <Pct value={-3.4} tone="auto" /> // "-3.4%" in danger color
 *
 * Uses Unicode minus (–) for negatives to match the Money atom.
 */
export function Pct({
  value,
  sign = false,
  fractionDigits = 1,
  tone = 'default',
  className,
  style,
  ariaLabel,
}: PctProps): JSX.Element {
  const abs = Math.abs(value);
  const text = `${abs.toFixed(fractionDigits)}%`;
  const prefix = value < 0 ? '–' : sign && value > 0 ? '+' : '';
  const rendered = `${prefix}${text}`;

  const color = (() => {
    if (tone === 'auto') {
      if (value < 0) return 'var(--color-status-danger)';
      if (value > 0) return 'var(--color-status-active)';
      return 'var(--color-text)';
    }
    switch (tone) {
      case 'active':
        return 'var(--color-status-active)';
      case 'warning':
        return 'var(--color-status-warning)';
      case 'danger':
        return 'var(--color-status-danger)';
      case 'info':
        return 'var(--color-status-info)';
      case 'muted':
        return 'var(--color-text-muted)';
      default:
        return undefined;
    }
  })();

  const label = ariaLabel ?? `${value < 0 ? 'minus ' : ''}${abs.toFixed(fractionDigits)} percent`;

  return (
    <span
      className={['ds-pct', className].filter(Boolean).join(' ')}
      aria-label={label}
      style={{
        fontVariantNumeric: 'tabular-nums lining-nums',
        color,
        ...style,
      }}
    >
      {rendered}
    </span>
  );
}
