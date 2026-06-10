// Timeline.jsx — DS-level date-axis visualization
// Spec — see §7.3 in the design system handoff:
//   • Two variants: 'bar' (one row per segment) | 'stacked' (overlap stacks,
//     height encodes allocationPercent)
//   • Size: xs | sm | md | lg — drives bar height + label decimation
//   • Auto date range when rangeStart/rangeEnd omitted (size-aware ± 3–12mo)
//   • Today line (showToday default on)
//   • Per-date markers[] (vertical lines or flag pins)
//   • Overallocation detection (stacked) — line at 100% + shaded bands
//   • Portal-rendered hover card, viewport-aware, customizable via renderHoverCard
//   • Keyboard nav: ← → walks segments, Enter triggers onSegmentClick
//   • ARIA: role="group" on track, aria-label per bar, role="tooltip" on card
//   • Status-tone coloring driven by StatusBadge tone system
//   • Empty state via emptyState prop
//   • Stateless: segments in, onSegmentClick out (no internal mutation)
//   • Drag-to-edit hooks: onSegmentChange (live) + onSegmentChangeCommit (drop)
//
// TimelineSegment = {
//   id: string,
//   startDate: Date | string,
//   endDate:   Date | string,
//   label?:    string,
//   status?:   'draft' | 'open' | 'proposed' | 'booked' | 'onboarding'
//              | 'assigned' | 'hold' | 'released',
//   allocationPercent?: number,    // 0..200 — drives bar height in stacked variant
//   projectId?: string,            // free-form metadata, passed back via onSegmentClick
//   meta?: unknown,
// }

// ── helpers ──────────────────────────────────────────────────────────────
const _ms = 86400000;
const VALID_STATUSES = new Set(['draft','open','proposed','booked','onboarding','assigned','hold','released']);

// toDate — accepts Date | string | number. Returns a valid Date or null.
// Strings like '2026-02-01' or '2026-02-01T00:00:00' all parse correctly.
const toDate = (d) => {
  if (d == null) return null;
  if (d instanceof Date) return isFinite(d.getTime()) ? d : null;
  const dt = new Date(d);
  return isFinite(dt.getTime()) ? dt : null;
};
const dDiff = (a, b) => {
  const da = toDate(a), db = toDate(b);
  if (!da || !db) return 0;
  return (db - da) / _ms;
};
const dAdd = (d, days) => {
  const dt = toDate(d) || new Date();
  return new Date(dt.getTime() + days * _ms);
};
const dStartOfMonth = (d) => {
  const x = toDate(d) || new Date();
  return new Date(x.getFullYear(), x.getMonth(), 1);
};
const monthLabel = (d) => (toDate(d) || new Date()).toLocaleDateString('en-US', { month: 'short' });
const yearShort = (d) => String((toDate(d) || new Date()).getFullYear()).slice(2);
// clamp — defensive numeric range
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
// normaliseSegment — coerce raw segment input into a stable shape.
//   • drops segments without valid startDate/endDate or where end <= start
//   • coerces status to one of VALID_STATUSES (defaults to 'assigned')
//   • clamps allocationPercent to [0, 1000]
//   • injects a stable id if missing
const normaliseSegment = (s, idx) => {
  if (!s) return null;
  const start = toDate(s.startDate);
  const end = toDate(s.endDate);
  if (!start || !end || end.getTime() <= start.getTime()) return null;
  const status = VALID_STATUSES.has(s.status) ? s.status : 'assigned';
  const alloc = clamp(Number.isFinite(s.allocationPercent) ? s.allocationPercent : 100, 0, 1000);
  return { ...s, id: s.id ?? `s${idx}`, startDate: start, endDate: end, status, allocationPercent: alloc };
};

// SIZE_TOKENS — single source of truth for variant geometry. Edit here, not at callsites.
const SIZE_TOKENS = {
  xs: { trackPx: 10, rowPx: 14, fontSize: 9,  defaultRangeMonths: 3,  labelEveryN: 2 },
  sm: { trackPx: 16, rowPx: 20, fontSize: 10, defaultRangeMonths: 6,  labelEveryN: 2 },
  md: { trackPx: 22, rowPx: 26, fontSize: 11, defaultRangeMonths: 9,  labelEveryN: 1 },
  lg: { trackPx: 28, rowPx: 32, fontSize: 12, defaultRangeMonths: 12, labelEveryN: 1 },
};

// ── HoverCard (portal-rendered, viewport-aware) ───────────────────────────
function TimelineHoverCard({ segment, anchorRect, onClose, renderBody, weeklyTotals }) {
  const [pos, setPos] = React.useState(null);
  const cardRef = React.useRef(null);
  React.useLayoutEffect(() => {
    if (!cardRef.current || !anchorRect) return;
    const r = cardRef.current.getBoundingClientRect();
    const margin = 8;
    // prefer below-and-right; flip up if below the viewport; flip left if right of it
    let top = anchorRect.bottom + margin;
    let left = anchorRect.left;
    if (top + r.height > window.innerHeight - margin) top = anchorRect.top - r.height - margin;
    if (left + r.width > window.innerWidth - margin) left = window.innerWidth - r.width - margin;
    if (left < margin) left = margin;
    setPos({ top, left });
  }, [anchorRect]);

  React.useEffect(() => {
    const r = () => onClose && onClose();
    window.addEventListener('scroll', r, true);
    window.addEventListener('resize', r);
    return () => {
      window.removeEventListener('scroll', r, true);
      window.removeEventListener('resize', r);
    };
  }, [onClose]);

  if (!anchorRect) return null;

  const card = (
    <div
      ref={cardRef}
      role="tooltip"
      style={{
        position:'fixed',
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        background:'var(--color-surface-raised)',
        border:'1px solid var(--color-border)',
        borderRadius:'var(--radius-card)',
        boxShadow:'var(--shadow-dropdown)',
        padding:12,
        minWidth:220,
        maxWidth:320,
        fontFamily:'var(--font-sans)',
        fontSize:12,
        color:'var(--color-text)',
        opacity: pos ? 1 : 0,
        zIndex: 200,
      }}>
      {renderBody
        ? renderBody(segment)
        : (
          <>
            <div style={{fontWeight:600, marginBottom:4}}>{segment.label || segment.status}</div>
            <div style={{color:'var(--color-text-muted)', marginBottom:6, fontFamily:'var(--font-mono)', fontSize:11}}>
              {toDate(segment.startDate).toLocaleDateString()} \u2192 {toDate(segment.endDate).toLocaleDateString()}
            </div>
            {segment.allocationPercent != null && (
              <div style={{display:'flex', justifyContent:'space-between', padding:'4px 0', borderTop:'1px solid var(--color-border-subtle)'}}>
                <span style={{color:'var(--color-text-muted)'}}>Allocation</span>
                <span style={{fontFamily:'var(--font-mono)'}}>{segment.allocationPercent}%</span>
              </div>
            )}
            {weeklyTotals && weeklyTotals.length > 0 && (
              <div style={{padding:'4px 0', borderTop:'1px solid var(--color-border-subtle)'}}>
                <div style={{color:'var(--color-text-muted)', marginBottom:4}}>Σ allocation this week</div>
                <div style={{display:'flex', gap:2, height:18, alignItems:'flex-end'}}>
                  {weeklyTotals.map((p, i) => (
                    <span key={i} style={{
                      flex:1, height: Math.max(2, Math.min(18, p/200*18))+'px',
                      background: p > 150 ? 'var(--timeline-heat-200)' :
                                  p > 120 ? 'var(--color-status-danger)' :
                                  p > 100 ? 'var(--color-status-warning)' : 'var(--color-status-active)',
                      borderRadius:1,
                    }} title={`Wk ${i+1}: ${p}%`}/>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
    </div>
  );
  return ReactDOM.createPortal(card, document.body);
}

// ── Timeline ──────────────────────────────────────────────────────────────
function Timeline({
  segments: segmentsRaw = [],
  variant = 'stacked',
  size = 'md',
  rangeStart,
  rangeEnd,
  showToday = true,
  today,
  markers = [],
  renderHoverCard,
  emptyState,
  onSegmentClick,
  onSegmentChange,           // (segment, { startDate, endDate }) => void  (live during drag)
  onSegmentChangeCommit,     // (segment, { startDate, endDate }) => void  (drop)
  showMonthGrid = true,
  showHeat,                  // backwards-compat alias for showOverallocationBands
  showOverallocationBands,
  className,
  style,
  ariaLabel = 'Timeline',
}) {
  // Normalize once — drops invalid segments, clamps allocations, guarantees ids.
  // Memo by raw array reference so callers can rely on stable identity.
  const segments = React.useMemo(
    () => (Array.isArray(segmentsRaw) ? segmentsRaw.map(normaliseSegment).filter(Boolean) : []),
    [segmentsRaw]
  );
  const safeVariant = variant === 'bar' ? 'bar' : 'stacked';
  const tk = SIZE_TOKENS[size] || SIZE_TOKENS.md;
  const todayDate = toDate(today) || new Date();
  const labelH = showMonthGrid ? 14 : 0;

  // Auto-range when omitted — size-aware around today.
  const computedRange = React.useMemo(() => {
    if (rangeStart && rangeEnd) return { start: toDate(rangeStart), end: toDate(rangeEnd) };
    if (segments.length === 0) {
      const half = tk.defaultRangeMonths * 30 / 2;
      return { start: dAdd(todayDate, -half), end: dAdd(todayDate, half) };
    }
    // Span = min(segments) .. max(segments), padded.
    const starts = segments.map((s) => toDate(s.startDate).getTime());
    const ends = segments.map((s) => toDate(s.endDate).getTime());
    const start = dAdd(new Date(Math.min(...starts)), -14);
    const end = dAdd(new Date(Math.max(...ends)), 14);
    return { start, end };
  }, [rangeStart, rangeEnd, segments, size]);

  const totalDays = Math.max(1, dDiff(computedRange.start, computedRange.end));
  const pctFor = (date) => Math.max(0, Math.min(100, (dDiff(computedRange.start, date) / totalDays) * 100));
  const widthFor = (s, e) => Math.max(0.1, (dDiff(s, e) / totalDays) * 100);

  // Pack segments — two strategies:
  //   • 'bar'     : one row per segment (audit / lifecycle list).
  //   • 'stacked' : true vertical stacking — when bars overlap in time, the
  //                 newer bar lands ON TOP of the prior overlapping bar(s).
  //                 Bar height = alloc/100 × trackPx, so the visual stack
  //                 height ENCODES the Σ allocation. 100% + 50% + 50%
  //                 reads as one full track + a half + a half on top.
  // Per-bucket stacked area: for each time bucket (weekly), compute the
  // active segments and stack them vertically by start order. This gives an
  // aggregate workload chart — at any X, the column from 0 up shows total
  // Σ allocation, painted in the contributing segment colors. A 100% bar
  // sits on the baseline; an additional 50% lands ABOVE it (overbooking).
  const BUCKET_DAYS = 7;
  const stacked = React.useMemo(() => {
    if (safeVariant === 'bar') return null;
    const startMs = computedRange.start.getTime();
    const endMs   = computedRange.end.getTime();
    const bucketMs = BUCKET_DAYS * _ms;
    const totalMs = endMs - startMs;
    const buckets = [];
    for (let t = startMs; t < endMs; t += bucketMs) {
      const bEnd = Math.min(t + bucketMs, endMs);
      const active = segments.filter((s) => {
        const ss = toDate(s.startDate).getTime();
        const ee = toDate(s.endDate).getTime();
        return ss < bEnd && ee > t;
      });
      // Stack order from BOTTOM up: assigned (most committed) → onboarding →
      // booked → proposed → open (vacancy) → hold (paused) → draft → released.
      // Within the same status, fall back to startDate then id for stability.
      const STATUS_ORDER = {
        assigned: 0, onboarding: 1, booked: 2, proposed: 3,
        open: 4, hold: 5, draft: 6, released: 7,
      };
      const sorted = active.slice().sort((a, b) => {
        const ra = STATUS_ORDER[a.status] ?? 99;
        const rb = STATUS_ORDER[b.status] ?? 99;
        if (ra !== rb) return ra - rb;
        const da = toDate(a.startDate) - toDate(b.startDate);
        if (da !== 0) return da;
        return String(a.id).localeCompare(String(b.id));
      });
      let stackY = 0;
      const slices = sorted.map((s) => {
        const alloc = s.allocationPercent ?? (s.status === 'open' || s.status === 'proposed' ? 80 : 100);
        const effAlloc = s.status === 'released' ? Math.min(alloc, 30) : alloc;
        const h = (effAlloc / 100) * tk.trackPx;
        const slice = { segment: s, yBottom: stackY, h, alloc,
          leftPct: ((t - startMs) / totalMs) * 100,
          widthPct: ((bEnd - t) / totalMs) * 100,
        };
        stackY += h;
        return slice;
      });
      buckets.push({ start: t, end: bEnd, slices, totalH: stackY });
    }
    return buckets;
  }, [segments, computedRange.start, computedRange.end, variant, tk.trackPx]);

  // For 'bar' variant — one row per segment.
  const barPacked = safeVariant === 'bar'
    ? segments.map((s, i) => ({ ...s, _yBottom: i * tk.rowPx, _h: tk.rowPx - 4 }))
    : null;

  // Total visual height. Stacked baseline = trackPx (= 100%). Stack exceeding
  // it crosses the 100% line — overbooking signal.
  const maxStackH = safeVariant === 'bar'
    ? (barPacked.length * tk.rowPx)
    : Math.max(tk.trackPx, ...(stacked ? stacked.map((b) => b.totalH) : [tk.trackPx]));
  const tracksH = maxStackH;
  const trackHeight = safeVariant === 'stacked' ? tk.trackPx : tk.rowPx;

  // Months between range for the grid + labels.
  const months = React.useMemo(() => {
    const out = [];
    let cur = dStartOfMonth(computedRange.start);
    const end = computedRange.end;
    while (cur < end) {
      out.push(new Date(cur));
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
    return out;
  }, [computedRange.start, computedRange.end]);

  // ── Overallocation bands (stacked variant only) ───────────────────────
  // Bucket allocation per WEEK across the range — paint a soft band when Σ > 100.
  const showBands = (showOverallocationBands ?? showHeat ?? true) && safeVariant === 'stacked';
  const overlapBands = React.useMemo(() => {
    if (!showBands) return [];
    // weeks
    const weekMs = 7 * _ms;
    const startMs = computedRange.start.getTime();
    const endMs = computedRange.end.getTime();
    const bands = [];
    for (let w = startMs; w < endMs; w += weekMs) {
      const wEnd = Math.min(w + weekMs, endMs);
      let sum = 0;
      segments.forEach((s) => {
        const ss = toDate(s.startDate).getTime();
        const ee = toDate(s.endDate).getTime();
        if (ss < wEnd && ee > w) sum += (s.allocationPercent || 0);
      });
      const cls = sum > 200 ? 'tl-band-200' : sum > 150 ? 'tl-band-150' : sum > 120 ? 'tl-band-120' : sum > 100 ? 'tl-band-100' : '';
      if (cls) bands.push({ start: w, end: wEnd, cls, sum });
    }
    return bands;
  }, [segments, computedRange.start, computedRange.end, showBands]);

  // ── Hover state ───────────────────────────────────────────────────────
  const [hover, setHover] = React.useState(null); // { segment, rect }
  const trackRef = React.useRef(null);
  const barRefs = React.useRef({});

  // Weekly Σ for the hovered week (used by default hover card).
  const hoverWeekly = React.useMemo(() => {
    if (!hover) return null;
    const center = toDate(hover.segment.startDate).getTime();
    const weeks = [];
    for (let k = -1; k < 4; k++) {
      const w0 = center + k * 7 * _ms;
      const w1 = w0 + 7 * _ms;
      let sum = 0;
      segments.forEach((s) => {
        const ss = toDate(s.startDate).getTime();
        const ee = toDate(s.endDate).getTime();
        if (ss < w1 && ee > w0) sum += (s.allocationPercent || 0);
      });
      weeks.push(sum);
    }
    return weeks;
  }, [hover, segments]);

  // ── Keyboard nav ──────────────────────────────────────────────────────
  const [focusIdx, setFocusIdx] = React.useState(-1);
  const sortedForNav = React.useMemo(
    () => [...segments].map((s, i) => ({ s, i })).sort((a, b) => toDate(a.s.startDate) - toDate(b.s.startDate)),
    [segments]
  );
  const onKey = (e) => {
    if (sortedForNav.length === 0) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); setFocusIdx((i) => Math.min(sortedForNav.length - 1, i + 1)); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); setFocusIdx((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const s = sortedForNav[focusIdx]?.s;
      if (s && onSegmentClick) onSegmentClick(s);
    }
  };
  React.useEffect(() => {
    if (focusIdx < 0) return;
    const s = sortedForNav[focusIdx]?.s;
    if (!s) return;
    const el = barRefs.current[s.id];
    if (!el) return;
    el.focus({ preventScroll: true });
    setHover({ segment: s, rect: el.getBoundingClientRect() });
  }, [focusIdx, sortedForNav]);

  // ── Empty ─────────────────────────────────────────────────────────────
  if (segments.length === 0) {
    return (
      <div className={'tl-cmp ' + (className || '')} style={{ minHeight: tracksH + 24, ...style }}>
        {emptyState ?? (
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'center',
            height: tracksH + 24, color:'var(--color-text-subtle)', fontSize: tk.fontSize,
            border:'1px dashed var(--color-border)', borderRadius:'var(--radius-control)',
          }}>No segments in range</div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={trackRef}
      className={'tl-cmp ' + (className || '')}
      role="group"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={onKey}
      style={{
        position:'relative',
        height: tracksH + 16 /* labels */ + 4,
        minWidth: 240,
        outline:'none',
        ...style,
      }}>

      {/* Month grid + labels */}
      {showMonthGrid && months.map((m, i) => {
        const left = pctFor(m);
        const isFirstOfYear = m.getMonth() === 0;
        return (
          <React.Fragment key={i}>
            <div style={{
              position:'absolute', top:0, bottom: 16,
              left: left + '%',
              width: 1, background: isFirstOfYear ? 'var(--timeline-grid-month)' : 'var(--timeline-grid-week)',
              opacity: 0.7,
            }}/>
            {i % tk.labelEveryN === 0 && (
              <div style={{
                position:'absolute',
                bottom: 0, left: left + '%',
                transform:'translateX(2px)',
                fontSize: tk.fontSize - 1,
                color:'var(--color-text-subtle)',
                fontFamily:'var(--font-sans)',
                whiteSpace:'nowrap',
              }}>{monthLabel(m)}{isFirstOfYear ? ' '+yearShort(m) : ''}</div>
            )}
          </React.Fragment>
        );
      })}

      {/* Overallocation bands behind bars */}
      {overlapBands.map((b, i) => (
        <div key={i}
          className={'tl-band ' + b.cls}
          title={`Σ ${b.sum}% across this week`}
          style={{
            position:'absolute', top:0, bottom: (labelH > 0 ? labelH + 2 : 0),
            left: pctFor(b.start) + '%',
            width: widthFor(b.start, b.end) + '%',
          }}/>
      ))}

      {/* Bars — aggregate workload column per time bucket.
          • 'stacked': each bucket renders N rectangles, sorted by start, stacked
             from the bottom. A 100% segment fills the baseline; an overlapping
             50% lands ON TOP (overbooking zone above the 100% line).
          • 'bar': one row per segment (audit / lifecycle history). */}
      {safeVariant === 'bar' && barPacked.map((s, idx) => {
        const left = pctFor(s.startDate);
        const width = widthFor(s.startDate, s.endDate);
        const status = s.status || 'assigned';
        const alloc = s.allocationPercent ?? (s.status === 'open' || s.status === 'proposed' ? 80 : 100);
        return (
          <div
            key={s.id ?? idx}
            ref={(el) => { if (el) barRefs.current[s.id] = el; }}
            className={'row-tl-bar tl-' + status}
            role="button"
            tabIndex={-1}
            aria-label={`${s.label || status}${alloc ? ', '+alloc+'% allocation' : ''}, ${toDate(s.startDate).toLocaleDateString()} to ${toDate(s.endDate).toLocaleDateString()}`}
            style={{
              position:'absolute',
              top: s._yBottom,
              left: left + '%',
              width: width + '%',
              height: s._h,
              fontSize: tk.fontSize,
              cursor: onSegmentClick ? 'pointer' : 'default',
            }}
            onClick={() => onSegmentClick && onSegmentClick(s)}
            onMouseEnter={(e) => setHover({ segment: s, rect: e.currentTarget.getBoundingClientRect() })}
            onMouseLeave={() => setHover(null)}>
            {s._h >= 10 && width > 4 && s.label}
          </div>
        );
      })}
      {safeVariant === 'stacked' && stacked && stacked.flatMap((bucket, bi) =>
        bucket.slices.map((slice, si) => {
          const s = slice.segment;
          const status = s.status || 'assigned';
          return (
            <div
              key={`${bi}-${si}-${s.id}`}
              className={'tl-slice tl-' + status}
              role="button"
              tabIndex={-1}
              aria-label={`${s.label || status}, ${slice.alloc}% allocation`}
              style={{
                position:'absolute',
                bottom: (labelH > 0 ? labelH + 2 : 0) + slice.yBottom,
                left: slice.leftPct + '%',
                width: slice.widthPct + '%',
                height: slice.h,
                cursor: onSegmentClick ? 'pointer' : 'default',
              }}
              onClick={() => onSegmentClick && onSegmentClick(s)}
              onMouseEnter={(e) => setHover({ segment: s, rect: e.currentTarget.getBoundingClientRect() })}
              onMouseLeave={() => setHover(null)}
            />
          );
        })
      )}

      {/* 100% baseline — Y-axis marker. Visible only when the stack
          exceeds it (overbooking signal). */}
      {safeVariant === 'stacked' && tracksH > tk.trackPx + 1 && (
        <div style={{
          position:'absolute', left:0, right:0,
          bottom: (labelH > 0 ? labelH + 2 : 0) + tk.trackPx,
          height: 1,
          borderTop: '1px dashed var(--color-text-subtle)',
          opacity: 0.7,
          pointerEvents: 'none',
        }}>
          <span style={{
            position:'absolute', right: 0, top: -10,
            fontSize: 9, color: 'var(--color-text-subtle)',
            background: 'var(--color-surface)', padding: '0 3px',
            letterSpacing: '0.04em',
          }}>100%</span>
        </div>
      )}

      {/* Per-date markers */}
      {markers.map((m, i) => {
        const left = pctFor(m.date);
        return m.kind === 'flag'
          ? (
            <div key={i} style={{
              position:'absolute', left: left + '%', top: -2,
              transform:'translateX(-50%)',
              color: m.color || 'var(--color-accent)',
              fontSize: 11,
            }} title={m.label}>⚑</div>
          )
          : (
            <div key={i} style={{
              position:'absolute', left: left + '%',
              top:0, bottom:16, width: 1,
              background: m.color || 'var(--color-accent)',
            }} title={m.label}/>
          );
      })}

      {/* Today line */}
      {showToday && (
        <div style={{
          position:'absolute',
          top:0, bottom: (labelH > 0 ? labelH + 2 : 0),
          left: pctFor(todayDate) + '%',
          width:1,
          background:'var(--timeline-today)',
          zIndex:3,
          pointerEvents:'none',
        }}/>
      )}

      {/* Hover card via portal */}
      {hover && (
        <TimelineHoverCard
          segment={hover.segment}
          anchorRect={hover.rect}
          weeklyTotals={hoverWeekly}
          onClose={() => setHover(null)}
          renderBody={renderHoverCard}
        />
      )}
    </div>
  );
}

window.Timeline = Timeline;
