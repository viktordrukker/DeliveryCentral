// Sprint F-0.7 — per-user UI preferences (locale + timezone) persisted to
// localStorage so the FE can render dates/numbers in the user's preferred
// shape independent of the browser's OS locale.
//
// In v1 these are FE-only preferences (no backend round-trip). The tenant-
// level `general.timezone` and `general.currency` settings (Cat-1.3 D-161 /
// D-165) provide the system-wide defaults; the user override layers on top.
// Phase F-1.1 will add a per-user backend column + sync to PlatformSetting
// (account.preferredLocale / account.preferredTimezone).
//
// NOTE: native `<input type="date">` controls always show OS locale per
// browser spec — there is no JS hook to override. These prefs influence
// programmatic FORMATTING (Intl.DateTimeFormat / Intl.NumberFormat) only.
// The full Audit-page date-picker fix (D-86) requires a custom date picker
// component — defer to v1.1 ratchet.

const LOCALE_KEY = 'dc:user_locale';
const TZ_KEY = 'dc:user_timezone';

export const SUPPORTED_LOCALES: ReadonlyArray<{ code: string; label: string }> = [
  { code: 'en-US', label: 'English (US) — 1,234.56 · MM/DD/YYYY' },
  { code: 'en-GB', label: 'English (UK) — 1,234.56 · DD/MM/YYYY' },
  { code: 'en-AU', label: 'English (Australia) — 1,234.56 · DD/MM/YYYY' },
  { code: 'de-DE', label: 'Deutsch (Germany) — 1.234,56 · DD.MM.YYYY' },
  { code: 'fr-FR', label: 'Français (France) — 1 234,56 · DD/MM/YYYY' },
  { code: 'es-ES', label: 'Español (Spain) — 1.234,56 · DD/MM/YYYY' },
  { code: 'ru-RU', label: 'Русский — 1 234,56 · DD.MM.YYYY' },
  { code: 'zh-CN', label: '中文 (China) — 1,234.56 · YYYY/MM/DD' },
  { code: 'ja-JP', label: '日本語 — 1,234.56 · YYYY/MM/DD' },
];

export const COMMON_TIMEZONES: ReadonlyArray<{ code: string; label: string }> = [
  { code: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { code: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { code: 'Europe/Berlin', label: 'Europe/Berlin (CET/CEST)' },
  { code: 'Europe/Paris', label: 'Europe/Paris (CET/CEST)' },
  { code: 'Europe/Madrid', label: 'Europe/Madrid (CET/CEST)' },
  { code: 'Europe/Moscow', label: 'Europe/Moscow (MSK)' },
  { code: 'America/New_York', label: 'America/New_York (EST/EDT)' },
  { code: 'America/Chicago', label: 'America/Chicago (CST/CDT)' },
  { code: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT)' },
  { code: 'America/Sao_Paulo', label: 'America/Sao_Paulo (BRT)' },
  { code: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
  { code: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
  { code: 'Asia/Singapore', label: 'Asia/Singapore (SGT)' },
  { code: 'Asia/Hong_Kong', label: 'Asia/Hong_Kong (HKT)' },
  { code: 'Asia/Shanghai', label: 'Asia/Shanghai (CST)' },
  { code: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
  { code: 'Australia/Sydney', label: 'Australia/Sydney (AEST/AEDT)' },
];

function safeRead(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
    // Same-tab listeners need a manual signal because the `storage` event
    // only fires on cross-tab writes.
    window.dispatchEvent(new CustomEvent('dc:user-prefs-changed', { detail: { key } }));
  } catch {
    /* localStorage blocked; preferences become per-page */
  }
}

/** Returns the user-set locale or browser default. */
export function getUserLocale(): string {
  return safeRead(LOCALE_KEY) ?? navigator.language ?? 'en-US';
}

/** Returns the user-set timezone or browser default. */
export function getUserTimezone(): string {
  return (
    safeRead(TZ_KEY) ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC'
  );
}

export function setUserLocale(locale: string): void {
  safeWrite(LOCALE_KEY, locale);
}

export function setUserTimezone(timezone: string): void {
  safeWrite(TZ_KEY, timezone);
}

/**
 * Format a date with the user's preferred locale + timezone.
 *
 * Use this in display code instead of `new Date().toLocaleString()` so user
 * preferences propagate everywhere. The Audit page filter (D-86) and other
 * native `<input type="date">` controls cannot be retargeted (browser spec
 * follows OS locale) — that fix waits for the v1.1 custom date-picker.
 */
export function formatUserDate(
  value: string | number | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (value === null || value === undefined || value === '') return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const locale = getUserLocale();
  const timeZone = getUserTimezone();
  return new Intl.DateTimeFormat(locale, { timeZone, ...options }).format(date);
}
