import {
  CSSProperties,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export type CalendarSize = 'xs' | 'sm' | 'md';
export type CalendarMode = 'picker' | 'year';
export type CalendarEventKind = 'approved' | 'pending' | 'holiday' | 'leave';

export interface CalendarEvent {
  date: Date | string;
  kind: CalendarEventKind;
  label?: string;
}

export interface CalendarProps {
  /** Single-select value (picker mode). */
  value?: Date | null;
  onChange?: (date: Date) => void;
  /** Two-click range selection. When `range` is true, picker stores a start, then an end on second click. */
  range?: boolean;
  rangeStart?: Date | null;
  rangeEnd?: Date | null;
  onRangeChange?: (start: Date | null, end: Date | null) => void;
  /** Today marker. Defaults to `new Date()`. Pass a fixed Date in tests. */
  today?: Date;
  /** Controlled displayed month (any day inside the month). */
  month?: Date;
  onMonthChange?: (month: Date) => void;
  /** Events painted onto cells. Multiple kinds per day are supported; the highest-priority kind wins the background. */
  events?: CalendarEvent[];
  /** 0=Sunday, 1=Monday (default). */
  weekStartsOn?: 0 | 1;
  size?: CalendarSize;
  /** `picker` (single month with prev/next) or `year` (3×4 grid of small months). */
  mode?: CalendarMode;
  ariaLabel?: string;
  testId?: string;
  className?: string;
}

interface CellMeta {
  date: Date | null;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  events: CalendarEvent[];
}

const SIZE_TOKENS: Record<CalendarSize, { cell: number; fontSize: number; header: number }> = {
  xs: { cell: 22, fontSize: 10, header: 22 },
  sm: { cell: 28, fontSize: 11, header: 26 },
  md: { cell: 36, fontSize: 13, header: 32 },
};

const MS_PER_DAY = 86_400_000;

function isSameDay(a: Date | null | undefined, b: Date | null | undefined): boolean {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isWithinRange(d: Date, start: Date | null | undefined, end: Date | null | undefined): boolean {
  if (!start || !end) return false;
  const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const sDay = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const eDay = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  const lo = Math.min(sDay, eDay);
  const hi = Math.max(sDay, eDay);
  return dDay >= lo && dDay <= hi;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function clampMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function isoDate(input: Date | string): Date {
  return input instanceof Date ? input : new Date(input);
}

function chevronLeft(): JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
      <path d="M9 2 L4 7 L9 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function chevronRight(): JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
      <path d="M5 2 L10 7 L5 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Month grid with optional range selection, event overlay, and keyboard
 * navigation. Composes inside a popover for the picker pattern (range
 * filters, leave-request forms) or stands alone in `mode="year"` for the
 * year-overview Leave tab.
 *
 * Keyboard model (when the grid has focus):
 *   ← →             ± 1 day
 *   ↑ ↓             ± 7 days
 *   Home / End      start / end of current week
 *   PageUp / PageDn ± 1 month (also advances the displayed month)
 *   Shift+PgUp/Dn   ± 1 year
 *   Enter / Space   selects the focused day
 *   Esc             bubbles up — the parent popover decides whether to close
 *
 * Focus management is roving-tabindex: exactly one cell at a time has
 * tabIndex=0; arrow keys move focus across cells, the rest are -1. Wrapped
 * in a popover, `useFocusTrap` (sibling primitive) handles Tab cycling
 * inside the popover surface.
 */
export function Calendar({
  value,
  onChange,
  range = false,
  rangeStart,
  rangeEnd,
  onRangeChange,
  today,
  month: monthProp,
  onMonthChange,
  events = [],
  weekStartsOn = 1,
  size = 'md',
  mode = 'picker',
  ariaLabel,
  testId,
  className,
}: CalendarProps): JSX.Element {
  const todayDate = today ?? new Date();
  const todayMonth = clampMonth(todayDate);

  // Controlled month support: parent passes `month`, we mirror; otherwise
  // we manage internally.
  const [internalMonth, setInternalMonth] = useState<Date>(monthProp ?? todayMonth);
  useEffect(() => {
    if (monthProp) setInternalMonth(clampMonth(monthProp));
  }, [monthProp]);
  const month = monthProp ? clampMonth(monthProp) : internalMonth;

  const setMonth = useCallback(
    (next: Date) => {
      const clamped = clampMonth(next);
      setInternalMonth(clamped);
      onMonthChange?.(clamped);
    },
    [onMonthChange],
  );

  // Roving-tabindex focus target. Anchored to today on mount, then follows
  // keyboard navigation. `value`/`rangeStart` updates it when set externally.
  const [focusedDate, setFocusedDate] = useState<Date>(
    value ?? rangeStart ?? new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate()),
  );
  useEffect(() => {
    if (value) setFocusedDate(value);
  }, [value]);
  useEffect(() => {
    if (rangeStart && !rangeEnd) setFocusedDate(rangeStart);
  }, [rangeStart, rangeEnd]);

  // Hover state for range preview (mouse only).
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  // Internal range state used when parent is uncontrolled. Tracks "pending"
  // start when only one click has happened.
  const [pendingStart, setPendingStart] = useState<Date | null>(null);

  // ── Selection handling ────────────────────────────────────────────────
  const handleSelect = useCallback(
    (d: Date) => {
      setFocusedDate(d);
      if (range) {
        // Range mode: two-click pattern.
        if (!rangeStart || (rangeStart && rangeEnd)) {
          // First click of a new range — clear end, set start.
          onRangeChange?.(d, null);
          setPendingStart(d);
        } else {
          // Second click — finalize. Sort so start ≤ end.
          const start = rangeStart;
          const end = d;
          const [lo, hi] = start.getTime() <= end.getTime() ? [start, end] : [end, start];
          onRangeChange?.(lo, hi);
          setPendingStart(null);
        }
      } else {
        onChange?.(d);
      }
    },
    [onChange, onRangeChange, range, rangeEnd, rangeStart],
  );

  // ── Keyboard navigation ───────────────────────────────────────────────
  const moveFocus = useCallback(
    (deltaDays: number) => {
      const next = new Date(
        focusedDate.getFullYear(),
        focusedDate.getMonth(),
        focusedDate.getDate() + deltaDays,
      );
      setFocusedDate(next);
      // Advance displayed month if focus crossed boundary.
      if (next.getMonth() !== month.getMonth() || next.getFullYear() !== month.getFullYear()) {
        setMonth(next);
      }
    },
    [focusedDate, month, setMonth],
  );

  const moveFocusByMonths = useCallback(
    (deltaMonths: number) => {
      const next = new Date(
        focusedDate.getFullYear(),
        focusedDate.getMonth() + deltaMonths,
        focusedDate.getDate(),
      );
      setFocusedDate(next);
      setMonth(next);
    },
    [focusedDate, setMonth],
  );

  const moveFocusByYears = useCallback(
    (deltaYears: number) => {
      const next = new Date(
        focusedDate.getFullYear() + deltaYears,
        focusedDate.getMonth(),
        focusedDate.getDate(),
      );
      setFocusedDate(next);
      setMonth(next);
    },
    [focusedDate, setMonth],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      // Esc bubbles up so a wrapping popover can react.
      if (e.key === 'Escape') return;
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          moveFocus(-1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          moveFocus(1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          moveFocus(-7);
          break;
        case 'ArrowDown':
          e.preventDefault();
          moveFocus(7);
          break;
        case 'Home': {
          e.preventDefault();
          const day = focusedDate.getDay();
          const offset = (day - weekStartsOn + 7) % 7;
          moveFocus(-offset);
          break;
        }
        case 'End': {
          e.preventDefault();
          const day = focusedDate.getDay();
          const offset = 6 - ((day - weekStartsOn + 7) % 7);
          moveFocus(offset);
          break;
        }
        case 'PageUp':
          e.preventDefault();
          if (e.shiftKey) moveFocusByYears(-1);
          else moveFocusByMonths(-1);
          break;
        case 'PageDown':
          e.preventDefault();
          if (e.shiftKey) moveFocusByYears(1);
          else moveFocusByMonths(1);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          handleSelect(focusedDate);
          break;
        default:
          break;
      }
    },
    [focusedDate, handleSelect, moveFocus, moveFocusByMonths, moveFocusByYears, weekStartsOn],
  );

  // ── Cell geometry + event indexing ────────────────────────────────────
  const eventIndex = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((e) => {
      const d = isoDate(e.date);
      if (Number.isNaN(d.getTime())) return;
      const k = dayKey(d);
      const bucket = map.get(k);
      if (bucket) bucket.push(e);
      else map.set(k, [e]);
    });
    return map;
  }, [events]);

  // ── Render: year mode (3×4 grid of small months) ──────────────────────
  if (mode === 'year') {
    const yearStart = new Date(month.getFullYear(), 0, 1);
    const months = Array.from({ length: 12 }, (_, i) => new Date(yearStart.getFullYear(), i, 1));
    return (
      <div
        className={['ds-calendar', 'ds-calendar--year', className].filter(Boolean).join(' ')}
        data-testid={testId}
        aria-label={ariaLabel ?? `${yearStart.getFullYear()}`}
        style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-text)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <button
            type="button"
            aria-label="Previous year"
            className="ds-calendar__nav-btn"
            onClick={() => setMonth(new Date(month.getFullYear() - 1, month.getMonth(), 1))}
          >
            {chevronLeft()}
          </button>
          <div style={{ fontWeight: 600, fontSize: 16 }}>{yearStart.getFullYear()}</div>
          <button
            type="button"
            aria-label="Next year"
            className="ds-calendar__nav-btn"
            onClick={() => setMonth(new Date(month.getFullYear() + 1, month.getMonth(), 1))}
          >
            {chevronRight()}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {months.map((m, i) => (
            <CalendarMonthView
              key={i}
              month={m}
              today={todayDate}
              value={value}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              range={range}
              eventIndex={eventIndex}
              weekStartsOn={weekStartsOn}
              size="xs"
              focusedDate={focusedDate}
              onSelect={handleSelect}
              onHover={setHoverDate}
              hoverDate={hoverDate}
              pendingStart={pendingStart}
              showHeader
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Render: picker mode (single month) ────────────────────────────────
  return (
    <div
      className={['ds-calendar', className].filter(Boolean).join(' ')}
      data-testid={testId}
      style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-text)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <button
          type="button"
          aria-label="Previous month"
          className="ds-calendar__nav-btn"
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
        >
          {chevronLeft()}
        </button>
        <div style={{ fontWeight: 600 }} aria-live="polite">
          {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </div>
        <button
          type="button"
          aria-label="Next month"
          className="ds-calendar__nav-btn"
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
        >
          {chevronRight()}
        </button>
      </div>
      <div onKeyDown={handleKeyDown}>
        <CalendarMonthView
          month={month}
          today={todayDate}
          value={value}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          range={range}
          eventIndex={eventIndex}
          weekStartsOn={weekStartsOn}
          size={size}
          focusedDate={focusedDate}
          onSelect={handleSelect}
          onHover={setHoverDate}
          hoverDate={hoverDate}
          pendingStart={pendingStart}
          ariaLabel={ariaLabel}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Internal: one-month grid renderer. Pure presentational + per-cell button.
// ─────────────────────────────────────────────────────────────────────────

interface CalendarMonthViewProps {
  month: Date;
  today: Date;
  value: Date | null | undefined;
  rangeStart: Date | null | undefined;
  rangeEnd: Date | null | undefined;
  range: boolean;
  eventIndex: Map<string, CalendarEvent[]>;
  weekStartsOn: 0 | 1;
  size: CalendarSize;
  focusedDate: Date;
  onSelect: (d: Date) => void;
  onHover: (d: Date | null) => void;
  hoverDate: Date | null;
  pendingStart: Date | null;
  showHeader?: boolean;
  ariaLabel?: string;
}

function CalendarMonthView({
  month,
  today,
  value,
  rangeStart,
  rangeEnd,
  range,
  eventIndex,
  weekStartsOn,
  size,
  focusedDate,
  onSelect,
  onHover,
  hoverDate,
  pendingStart,
  showHeader = false,
  ariaLabel,
}: CalendarMonthViewProps): JSX.Element {
  const sz = SIZE_TOKENS[size];
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const startWeekday = (first.getDay() - weekStartsOn + 7) % 7;

  const dayHeaders = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const headers: string[] = [];
  for (let i = 0; i < 7; i++) headers.push(dayHeaders[(i + weekStartsOn) % 7]);

  const cells: CellMeta[] = [];
  for (let i = 0; i < 42; i++) {
    const dayNum = i - startWeekday + 1;
    let d: Date | null = null;
    if (dayNum >= 1 && dayNum <= daysInMonth) {
      d = new Date(month.getFullYear(), month.getMonth(), dayNum);
    }
    cells.push({
      date: d,
      isCurrentMonth: d !== null,
      isToday: isSameDay(d, today),
      isWeekend: d ? d.getDay() === 0 || d.getDay() === 6 : false,
      events: d ? eventIndex.get(dayKey(d)) ?? [] : [],
    });
  }

  const monthLabel = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div
      className="ds-calendar__month"
      style={{
        display: 'inline-block',
        fontFamily: 'var(--font-sans)',
        fontSize: sz.fontSize,
        color: 'var(--color-text)',
      }}
    >
      {showHeader && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: sz.header,
            fontWeight: 600,
            fontSize: Math.max(sz.fontSize, 11),
          }}
        >
          {monthLabel}
        </div>
      )}
      <div
        role="grid"
        aria-label={ariaLabel ?? monthLabel}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(7, ${sz.cell}px)`,
          gap: 1,
        }}
      >
        {headers.map((h, i) => (
          <div
            key={`h-${i}`}
            role="columnheader"
            style={{
              textAlign: 'center',
              color: 'var(--color-text-subtle)',
              fontSize: Math.max(8, sz.fontSize - 1),
              padding: '4px 0',
              letterSpacing: '0.04em',
            }}
          >
            {h}
          </div>
        ))}
        {cells.map((meta, i) => (
          <CalendarCell
            key={i}
            meta={meta}
            sz={sz}
            value={value}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            range={range}
            focusedDate={focusedDate}
            hoverDate={hoverDate}
            pendingStart={pendingStart}
            onSelect={onSelect}
            onHover={onHover}
          />
        ))}
      </div>
    </div>
  );
}

interface CalendarCellProps {
  meta: CellMeta;
  sz: { cell: number; fontSize: number; header: number };
  value: Date | null | undefined;
  rangeStart: Date | null | undefined;
  rangeEnd: Date | null | undefined;
  range: boolean;
  focusedDate: Date;
  hoverDate: Date | null;
  pendingStart: Date | null;
  onSelect: (d: Date) => void;
  onHover: (d: Date | null) => void;
}

function CalendarCell({
  meta,
  sz,
  value,
  rangeStart,
  rangeEnd,
  range,
  focusedDate,
  hoverDate,
  pendingStart,
  onSelect,
  onHover,
}: CalendarCellProps): JSX.Element {
  const { date: d, isToday, isWeekend, events } = meta;
  if (!d) {
    return <div style={{ width: sz.cell, height: sz.cell }} aria-hidden="true" />;
  }

  const isHoliday = events.some((e) => e.kind === 'holiday');
  const isApproved = events.some((e) => e.kind === 'approved');
  const isPending = events.some((e) => e.kind === 'pending');
  const isLeave = events.some((e) => e.kind === 'leave');

  const selected = !range && isSameDay(d, value ?? null);
  const isRangeAnchor = isSameDay(d, rangeStart ?? null) || isSameDay(d, rangeEnd ?? null);
  const inRange = range && isWithinRange(d, rangeStart ?? null, rangeEnd ?? null);
  const inHoverRange =
    range && (rangeStart ?? pendingStart) && !rangeEnd && hoverDate
      ? isWithinRange(d, rangeStart ?? pendingStart, hoverDate)
      : false;

  // Background priority (low → high): weekend, kind-event, in-range, selected/anchor.
  let bg = 'transparent';
  let color: string = 'var(--color-text)';
  let border = '1px solid transparent';
  if (isWeekend) {
    bg = 'var(--color-surface-alt)';
    color = 'var(--color-text-subtle)';
  }
  if (isHoliday) {
    bg = 'color-mix(in oklab, var(--color-status-info) 18%, var(--color-surface))';
    color = 'var(--color-status-info)';
  }
  if (isLeave) {
    bg = 'color-mix(in oklab, var(--color-accent) 20%, var(--color-surface))';
    color = 'var(--color-text)';
  }
  if (isApproved) {
    bg = 'color-mix(in oklab, var(--color-status-active) 25%, var(--color-surface))';
    color = 'var(--color-status-active)';
  }
  if (isPending) {
    bg = 'color-mix(in oklab, var(--color-status-warning) 28%, var(--color-surface))';
    color = 'var(--color-status-warning)';
  }
  if (inRange || inHoverRange) {
    bg = 'color-mix(in oklab, var(--color-accent) 18%, var(--color-surface))';
    color = 'var(--color-text)';
  }
  if (selected || isRangeAnchor) {
    bg = 'var(--color-accent)';
    color = 'var(--color-text-inverse, #fff)';
    border = '1px solid var(--color-accent)';
  }
  if (isToday && !selected && !isRangeAnchor) {
    border = '1px solid var(--color-status-warning)';
  }

  const isFocusTarget = isSameDay(d, focusedDate);
  const aria = `${d.toLocaleDateString()}${isHoliday ? ', holiday' : ''}${
    isApproved ? ', leave approved' : ''
  }${isPending ? ', leave pending' : ''}${isLeave ? ', leave' : ''}`;

  const style: CSSProperties = {
    width: sz.cell,
    height: sz.cell,
    background: bg,
    color,
    border,
    borderRadius: 4,
    font: 'inherit',
    fontVariantNumeric: 'tabular-nums',
    cursor: 'pointer',
    position: 'relative',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: selected || isToday || isRangeAnchor ? 600 : 400,
    transition: 'background 120ms',
  };

  return (
    <button
      type="button"
      role="gridcell"
      tabIndex={isFocusTarget ? 0 : -1}
      aria-selected={selected || isRangeAnchor || inRange || inHoverRange ? 'true' : 'false'}
      aria-label={aria}
      data-date={d.toISOString().slice(0, 10)}
      data-today={isToday || undefined}
      data-selected={selected || isRangeAnchor || undefined}
      data-in-range={inRange || inHoverRange || undefined}
      onClick={() => onSelect(d)}
      onMouseEnter={() => onHover(d)}
      onMouseLeave={() => onHover(null)}
      style={style}
    >
      {d.getDate()}
      {events.length > 1 && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: 2,
            right: 2,
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: 'currentColor',
            opacity: 0.7,
          }}
        />
      )}
    </button>
  );
}

// Silence unused import warning if MS_PER_DAY is later removed; keeping as a
// named export avoids dead-code drift if a consumer needs the constant.
export const _MS_PER_DAY = MS_PER_DAY;
