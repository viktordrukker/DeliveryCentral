import { CSSProperties } from 'react';

export interface MoneyProps {
  /** Numeric value. Negatives render with a minus prefix. */
  value: number;
  /** ISO currency code. Defaults to 'USD'. Recognised symbols: USD ($), EUR (€). Other codes render as prefix text. */
  currency?: string;
  /** When true, compact thousands/millions (e.g. `1.2k`, `4.8M`). Default false (full digits). */
  compact?: boolean;
  /** Max fraction digits when compact=false. Defaults to 0 (whole-dollar). */
  maxFractionDigits?: number;
  /** Extra class names. */
  className?: string;
  style?: CSSProperties;
  /** Optional aria-label override. */
  ariaLabel?: string;
}

const CURRENCY_SYMBOL: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  UZS: 'UZS ',
};

/**
 * Tabular-num currency formatter. Negatives render with a Unicode minus
 * (–, U+2013) for visual symmetry with positives — column alignment
 * survives mixed signs.
 *
 * `compact`:
 *   100 → "$100"
 *   1_500 → "$1.5k" (compact) or "$1,500" (default)
 *   2_400_000 → "$2.4M" (compact) or "$2,400,000" (default)
 *
 * Renders inside `<span>` with `font-variant-numeric: tabular-nums lining-nums`.
 */
export function Money({
  value,
  currency = 'USD',
  compact = false,
  maxFractionDigits = 0,
  className,
  style,
  ariaLabel,
}: MoneyProps): JSX.Element {
  const abs = Math.abs(value);
  let display: string;
  if (compact && abs >= 1_000_000) {
    display = stripTrailingZero((value / 1_000_000).toFixed(2)) + 'M';
  } else if (compact && abs >= 1_000) {
    display = stripTrailingZero((value / 1_000).toFixed(1)) + 'k';
  } else {
    display = abs.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: maxFractionDigits,
    });
    if (value < 0) display = '–' + display;
    else {
      // For full mode, sign already absorbed below for display string; we
      // prepend the symbol after.
    }
  }
  // For compact mode we computed signed magnitude already; for full mode the
  // sign is part of `display`. Either way the symbol goes before the digits.
  const sign = compact && value < 0 ? '–' : '';
  const symbol = CURRENCY_SYMBOL[currency] ?? `${currency} `;
  // In compact mode `display` carries the unsigned magnitude — prefix sign.
  // In full mode `display` already has the leading minus when negative.
  const rendered = compact ? `${sign}${symbol}${stripLeadingMinus(display)}` : `${symbol}${display}`;

  const label = ariaLabel ?? `${value < 0 ? 'Negative ' : ''}${rendered.replace('–', '')}`;

  return (
    <span
      className={['ds-money', className].filter(Boolean).join(' ')}
      style={{
        fontVariantNumeric: 'tabular-nums lining-nums',
        ...style,
      }}
      aria-label={label}
    >
      {rendered}
    </span>
  );
}

function stripTrailingZero(s: string): string {
  return s.replace(/\.?0+$/, '');
}

function stripLeadingMinus(s: string): string {
  return s.startsWith('–') || s.startsWith('-') ? s.slice(1) : s;
}
