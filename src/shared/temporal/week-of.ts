/**
 * F-7.1 / D-161 — tenant-tz / week-start aware week boundary helper.
 *
 * Replaces the per-module `getMondayOfWeek(new Date())` copies that all
 * assumed UTC + Monday week start. Tenant admins can override:
 *
 *   PlatformSetting key            Default     Meaning
 *   ─────────────────────────────  ──────────  ────────────────────────────────
 *   general.timezone               'UTC'       IANA tz name (e.g. 'Europe/London')
 *   timesheets.weekStartDay        1 (Monday)  0=Sun, 1=Mon, …, 6=Sat
 *
 * The helper takes an absolute `Date` and returns the start-of-week
 * `Date` in UTC, where "start of week" is computed in the supplied
 * tenant timezone with the supplied week-start day. The returned UTC
 * instant is the same calendar boundary admins would describe verbally
 * ("the week starts at Monday 00:00 in London").
 *
 * Implementation uses `Intl.DateTimeFormat` to extract the local-tz
 * calendar fields, so no extra dependency is required on the BE.
 * The FE uses `date-fns-tz` for the same shape — see F-7.3.
 */

const DEFAULT_TIMEZONE = 'UTC';
const DEFAULT_WEEK_START_DAY = 1; // Monday

export interface WeekStartOptions {
  /** IANA timezone name. Defaults to UTC. */
  timezone?: string;
  /** 0=Sunday, 1=Monday, …, 6=Saturday. Defaults to Monday. */
  weekStartDay?: number;
}

/**
 * Returns the UTC instant at which the tenant's week containing
 * `instant` begins. Day-of-week is computed in the tenant timezone.
 */
export function getWeekStart(instant: Date, options: WeekStartOptions = {}): Date {
  const tz = options.timezone ?? DEFAULT_TIMEZONE;
  const weekStartDay = clampWeekStartDay(options.weekStartDay ?? DEFAULT_WEEK_START_DAY);

  const local = readLocalFields(instant, tz);
  const dow = local.dayOfWeek; // 0..6 in the tenant tz
  // How many days back to step to reach the configured week-start day.
  // E.g. weekStartDay=1 (Mon) and dow=3 (Wed) → step back 2; dow=0 (Sun) → step back 6.
  const offset = (dow - weekStartDay + 7) % 7;

  // The tz-local calendar date at the start of the week:
  const startLocalY = local.year;
  const startLocalM = local.month;
  const startLocalD = local.day - offset;

  // Re-build a Date that, when interpreted in the tenant tz, lands at
  // 00:00:00 on that calendar date. UTC ms = local-midnight-ms - offset-from-utc-ms.
  const tzOffsetMs = tzOffsetAt(
    Date.UTC(startLocalY, startLocalM - 1, startLocalD, 0, 0, 0),
    tz,
  );
  const utcMs =
    Date.UTC(startLocalY, startLocalM - 1, startLocalD, 0, 0, 0) - tzOffsetMs;
  return new Date(utcMs);
}

/** Same as `getWeekStart` but returns the ISO date string `YYYY-MM-DD`. */
export function getWeekStartISODate(instant: Date, options: WeekStartOptions = {}): string {
  return getWeekStart(instant, options).toISOString().slice(0, 10);
}

function clampWeekStartDay(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_WEEK_START_DAY;
  const i = Math.trunc(value);
  if (i < 0 || i > 6) return DEFAULT_WEEK_START_DAY;
  return i;
}

interface LocalFields {
  year: number;
  month: number; // 1..12
  day: number; // 1..31
  dayOfWeek: number; // 0=Sun..6=Sat
}

function readLocalFields(instant: Date, tz: string): LocalFields {
  // `Intl.DateTimeFormat` with `timeZone` returns the tz-local calendar
  // fields regardless of the host process's TZ env. weekday gives us
  // the day of week without needing to mod-arith with epoch offsets.
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const parts = fmt.formatToParts(instant);
  const map = new Map(parts.map((p) => [p.type, p.value]));
  const year = Number(map.get('year'));
  const month = Number(map.get('month'));
  const day = Number(map.get('day'));
  const dayOfWeek = WEEKDAY_INDEX[map.get('weekday') ?? 'Mon'] ?? 1;
  return { year, month, day, dayOfWeek };
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Returns the offset (ms) from UTC to the supplied IANA timezone at the
 * given UTC instant. Positive when the tz is ahead of UTC (e.g. Europe/Berlin
 * = +3_600_000 in standard time).
 */
function tzOffsetAt(utcMs: number, tz: string): number {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date(utcMs));
  const map = new Map(parts.map((p) => [p.type, p.value]));
  const y = Number(map.get('year'));
  const m = Number(map.get('month'));
  const d = Number(map.get('day'));
  let h = Number(map.get('hour'));
  if (h === 24) h = 0;
  const mn = Number(map.get('minute'));
  const s = Number(map.get('second'));
  const localAsUtcMs = Date.UTC(y, m - 1, d, h, mn, s);
  return localAsUtcMs - utcMs;
}
