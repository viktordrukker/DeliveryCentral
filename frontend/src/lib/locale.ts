/**
 * F-7.3 / D-165 — locale-aware formatters.
 *
 * Bridges the tenant `general.currency` + `general.timezone`
 * PlatformSettings to runtime Intl-based formatting. Components use
 * the `useLocale()` hook to grab the bound formatters; the underlying
 * primitives are also exported for non-React callers (chart label
 * functions, util scripts).
 *
 * `Intl.NumberFormat` + `Intl.DateTimeFormat` are stdlib (no extra
 * bundle weight). `date-fns-tz` is added for explicit timezone
 * conversions when component code needs a tz-tagged `Date` to feed
 * into `date-fns` operations.
 */

import { useMemo } from 'react';

import { usePlatformSettings } from '@/app/platform-settings-context';

const FALLBACK_CURRENCY = 'AUD';
const FALLBACK_TIMEZONE = 'UTC';

export interface LocaleFormatters {
  currency: string;
  timezone: string;
  formatCurrency: (value: number | null | undefined, options?: { maximumFractionDigits?: number }) => string;
  formatDate: (input: string | Date | null | undefined) => string;
  formatDateTime: (input: string | Date | null | undefined) => string;
  formatTime: (input: string | Date | null | undefined) => string;
  formatNumber: (value: number | null | undefined, options?: Intl.NumberFormatOptions) => string;
}

function toDate(input: string | Date | null | undefined): Date | null {
  if (!input) return null;
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function buildLocaleFormatters(
  currency: string,
  timezone: string,
): LocaleFormatters {
  const currencyFormatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  });
  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const timeFormatter = new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return {
    currency,
    timezone,
    formatCurrency: (value, options) => {
      if (value === null || value === undefined || Number.isNaN(value)) return '—';
      if (options?.maximumFractionDigits !== undefined) {
        return new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency,
          maximumFractionDigits: options.maximumFractionDigits,
        }).format(value);
      }
      return currencyFormatter.format(value);
    },
    formatDate: (input) => {
      const d = toDate(input);
      return d ? dateFormatter.format(d) : '—';
    },
    formatDateTime: (input) => {
      const d = toDate(input);
      return d ? dateTimeFormatter.format(d) : '—';
    },
    formatTime: (input) => {
      const d = toDate(input);
      return d ? timeFormatter.format(d) : '—';
    },
    formatNumber: (value, options) => {
      if (value === null || value === undefined || Number.isNaN(value)) return '—';
      return new Intl.NumberFormat(undefined, options).format(value);
    },
  };
}

/**
 * React hook — returns formatters bound to the current tenant locale
 * settings. Memoizes on (currency, timezone) so callers don't recreate
 * `Intl.*Format` instances every render.
 */
export function useLocale(): LocaleFormatters {
  const { settings } = usePlatformSettings();
  const currency = settings?.general.currency ?? FALLBACK_CURRENCY;
  const timezone = settings?.general.timezone ?? FALLBACK_TIMEZONE;
  return useMemo(() => buildLocaleFormatters(currency, timezone), [currency, timezone]);
}
