// Calendar.jsx — DS primitive: month-grid date picker / month overview.
// Accessibility model mirrors the existing DatePicker — keyboard nav, ARIA roles,
// focus trap when used inside a popover.
//
// Two modes:
//   • mode='picker'  — single-month picker (default, used inside a popover)
//   • mode='year'    — 3×4 month grid of small calendars, used for the Leave tab
//
// Props (subset, see DS docs):
//   value, onChange                  // selected date or range
//   range                            // boolean — enable range selection
//   today                            // Date — defaults to new Date()
//   events                           // [{ date: Date, kind: 'approved'|'pending'|'holiday'|'leave', label?: string }]
//   weekStartsOn                     // 0=Sun, 1=Mon (default 1)
//   size                             // 'xs' | 'sm' | 'md' (default md)
//   mode                             // 'picker' | 'year'
//   month, onMonthChange             // controlled current month
//   className, style
//
// Status semantics map onto existing color tokens — no new color tokens needed:
//   approved → --color-status-active
//   pending  → --color-status-warning
//   holiday  → --color-status-info
//   weekend  → --color-text-subtle background

const CAL_SIZES = {
  xs: { cell: 22, fontSize: 10, header: 22 },
  sm: { cell: 28, fontSize: 11, header: 26 },
  md: { cell: 36, fontSize: 13, header: 32 },
};

const isSameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const isSameMonth = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
const isBeforeDay = (a, b) => new Date(a.getFullYear(), a.getMonth(), a.getDate()) < new Date(b.getFullYear(), b.getMonth(), b.getDate());
const isWithin = (d, a, b) => !isBeforeDay(d, a) && !isBeforeDay(b, d);

function CalendarMonth({
  month, today, value, rangeStart, rangeEnd, range,
  events = [], onChange, weekStartsOn = 1, size = 'md', onHover, hoverDate,
  showHeader = true, compact = false,
}) {
  const sz = CAL_SIZES[size] || CAL_SIZES.md;
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  // grid starts on the week-start day — pad with prev-month days
  const startWeekday = (first.getDay() - weekStartsOn + 7) % 7;
  const dayHeaders = ['S','M','T','W','T','F','S'];
  const headers = [];
  for (let i = 0; i < 7; i++) headers.push(dayHeaders[(i + weekStartsOn) % 7]);
  // Build a 6-week grid
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const dayNum = i - startWeekday + 1;
    let d = null;
    if (dayNum >= 1 && dayNum <= daysInMonth) d = new Date(month.getFullYear(), month.getMonth(), dayNum);
    cells.push(d);
  }

  // Index events by yyyy-mm-dd for fast lookup
  const eventsByDay = React.useMemo(() => {
    const m = new Map();
    events.forEach((e) => {
      if (!e?.date) return;
      const d = e.date instanceof Date ? e.date : new Date(e.date);
      const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(e);
    });
    return m;
  }, [events]);
  const dayEvents = (d) => {
    if (!d) return [];
    return eventsByDay.get(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`) || [];
  };

  return (
    <div className={'ds-cal-month' + (compact ? ' compact' : '')} style={{
      display:'inline-block',
      fontFamily:'var(--font-sans)', fontSize: sz.fontSize,
      color:'var(--color-text)',
    }}>
      {showHeader && (
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'center',
          height: sz.header, fontWeight: 600,
          color:'var(--color-text)',
          fontSize: Math.max(sz.fontSize, 11),
        }}>
          {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </div>
      )}
      <div role="grid" aria-label={month.toLocaleDateString('en-US', { month:'long', year:'numeric' })}
        style={{
          display:'grid',
          gridTemplateColumns:`repeat(7, ${sz.cell}px)`,
          gap: 1,
        }}>
        {headers.map((h, i) => (
          <div key={i} role="columnheader" style={{
            textAlign:'center', color:'var(--color-text-subtle)',
            fontSize: sz.fontSize - 1,
            padding:'4px 0',
            letterSpacing:'0.04em',
          }}>{h}</div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={i} style={{ width: sz.cell, height: sz.cell }}/>;
          const evs = dayEvents(d);
          const isToday = isSameDay(d, today);
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          const isHoliday = evs.some((e) => e.kind === 'holiday');
          const isApproved = evs.some((e) => e.kind === 'approved');
          const isPending = evs.some((e) => e.kind === 'pending');
          const isLeave = evs.some((e) => e.kind === 'leave');
          const selected = value && isSameDay(d, value);
          const inRange = range && rangeStart && rangeEnd && isWithin(d, rangeStart, rangeEnd);
          const inHoverRange = range && rangeStart && !rangeEnd && hoverDate && isWithin(d, rangeStart, hoverDate);

          // Background priority (low → high): weekend, holiday, in-range, selected
          let bg = 'transparent';
          let color = 'var(--color-text)';
          let border = '1px solid transparent';
          if (isWeekend) { bg = 'var(--color-surface-alt)'; color = 'var(--color-text-subtle)'; }
          if (isHoliday) { bg = 'color-mix(in oklab, var(--color-status-info) 18%, var(--color-surface))'; color = 'var(--color-status-info)'; }
          if (isApproved) { bg = 'color-mix(in oklab, var(--color-status-active) 25%, var(--color-surface))'; color = 'var(--color-status-active)'; }
          if (isPending) { bg = 'color-mix(in oklab, var(--color-status-warning) 28%, var(--color-surface))'; color = 'var(--color-status-warning)'; }
          if (isLeave) { bg = 'color-mix(in oklab, var(--color-accent) 20%, var(--color-surface))'; color = 'var(--color-accent-text)'; }
          if (inRange || inHoverRange) { bg = 'color-mix(in oklab, var(--color-accent) 18%, var(--color-surface))'; color = 'var(--color-accent-text)'; }
          if (selected || isSameDay(d, rangeStart) || isSameDay(d, rangeEnd)) {
            bg = 'var(--color-accent)';
            color = '#fff';
            border = '1px solid var(--color-accent)';
          }
          if (isToday && !selected) border = '1px solid var(--color-status-warning)';

          return (
            <button key={i}
              role="gridcell"
              type="button"
              tabIndex={isToday ? 0 : -1}
              aria-selected={selected || inRange || inHoverRange ? 'true' : 'false'}
              aria-label={`${d.toLocaleDateString()}${isHoliday ? ', holiday' : ''}${isApproved ? ', leave approved' : ''}${isPending ? ', leave pending' : ''}`}
              onClick={() => onChange && onChange(d)}
              onMouseEnter={() => onHover && onHover(d)}
              style={{
                width: sz.cell, height: sz.cell,
                background: bg, color, border,
                borderRadius: 4,
                font:'inherit',
                fontVariantNumeric:'tabular-nums',
                cursor:'pointer',
                position:'relative',
                padding:0,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontWeight: selected || isToday ? 600 : 400,
                transition: 'background 120ms',
              }}>
              {d.getDate()}
              {evs.length > 1 && (
                <span style={{
                  position:'absolute', bottom: 2, right: 2,
                  width: 4, height: 4, borderRadius:'50%',
                  background: 'currentColor', opacity: 0.7,
                }}/>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Calendar({
  value, onChange,
  range = false, rangeStart, rangeEnd,
  today, events = [], weekStartsOn = 1, size = 'md',
  mode = 'picker', month: monthProp, onMonthChange,
  className, style,
}) {
  const todayDate = today || new Date();
  const [internalMonth, setInternalMonth] = React.useState(() => monthProp || todayDate);
  const month = monthProp || internalMonth;
  const setMonth = (m) => { setInternalMonth(m); onMonthChange && onMonthChange(m); };
  const [hoverDate, setHoverDate] = React.useState(null);

  if (mode === 'year') {
    const yearStart = new Date(month.getFullYear(), 0, 1);
    const monthsOfYear = Array.from({ length: 12 }, (_, i) => new Date(yearStart.getFullYear(), i, 1));
    return (
      <div className={'ds-calendar ds-calendar-year ' + (className || '')} style={style}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 12}}>
          <button className="icon-btn" aria-label="Previous year" onClick={() => setMonth(new Date(month.getFullYear()-1, month.getMonth(), 1))}><Icon name="chevron-left"/></button>
          <div style={{fontWeight:600, fontSize: 16}}>{yearStart.getFullYear()}</div>
          <button className="icon-btn" aria-label="Next year" onClick={() => setMonth(new Date(month.getFullYear()+1, month.getMonth(), 1))}><Icon name="chevron-right"/></button>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:14}}>
          {monthsOfYear.map((m, i) => (
            <CalendarMonth key={i}
              month={m} today={todayDate}
              value={value} rangeStart={rangeStart} rangeEnd={rangeEnd} range={range}
              events={events} onChange={onChange}
              weekStartsOn={weekStartsOn}
              size="xs" compact
              onHover={setHoverDate} hoverDate={hoverDate}
              showHeader/>
          ))}
        </div>
      </div>
    );
  }

  // Single-month picker
  return (
    <div className={'ds-calendar ' + (className || '')} style={style}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 8}}>
        <button className="icon-btn icon-btn-sm" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth()-1, 1))}><Icon name="chevron-left"/></button>
        <div style={{fontWeight:600}}>{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
        <button className="icon-btn icon-btn-sm" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth()+1, 1))}><Icon name="chevron-right"/></button>
      </div>
      <CalendarMonth
        month={month} today={todayDate}
        value={value} rangeStart={rangeStart} rangeEnd={rangeEnd} range={range}
        events={events} onChange={onChange}
        weekStartsOn={weekStartsOn}
        size={size}
        onHover={setHoverDate} hoverDate={hoverDate}
        showHeader={false}/>
    </div>
  );
}

window.Calendar = Calendar;
window.CalendarMonth = CalendarMonth;
