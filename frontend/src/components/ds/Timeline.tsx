import {
  CSSProperties,
  KeyboardEvent,
  ReactNode,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import {
  resolveStatusTone,
  statusToneColor,
  StatusBadge,
  type StatusTone,
} from '@/components/common/StatusBadge';
import { formatDateShort, formatRelative } from '@/lib/format-date';

import { allocateZIndex, getPortalRoot } from './portal-stack';

export type TimelineSize = 'xs' | 'sm' | 'md' | 'lg';
export type TimelineVariant = 'bar' | 'stacked';

export interface TimelineSegment {
  id: string;
  startDate: string;
  endDate: string | null;
  label: string;
  status?: string;
  tone?: StatusTone;
  allocationPercent?: number;
  href?: string;
  meta?: Record<string, ReactNode>;
}

export interface TimelineMarker {
  date: string;
  label?: string;
  tone?: StatusTone;
  variant?: 'line' | 'flag';
}

export interface TimelineHoverContext {
  weeklyTotalPercent: number;
  conflicts: TimelineSegment[];
}

export interface TimelineProps {
  segments: TimelineSegment[];
  size?: TimelineSize;
  variant?: TimelineVariant;
  rangeStart?: string;
  rangeEnd?: string;
  markers?: TimelineMarker[];
  showToday?: boolean;
  showMonthGrid?: boolean;
  showMonthLabels?: boolean;
  showOverallocationLine?: boolean;
  showOverallocationShading?: boolean;
  showLegend?: boolean;
  renderHoverCard?: (s: TimelineSegment, ctx: TimelineHoverContext) => ReactNode;
  onSegmentClick?: (s: TimelineSegment) => void;
  emptyState?: ReactNode;
  ariaLabel?: string;
  testId?: string;
  className?: string;
}

const TRACK_HEIGHT: Record<TimelineSize, number> = { xs: 14, sm: 24, md: 36, lg: 56 };
const LABEL_FONT: Record<TimelineSize, number> = { xs: 0, sm: 8, md: 8, lg: 10 };
const LABEL_HEIGHT: Record<TimelineSize, number> = { xs: 0, sm: 10, md: 12, lg: 14 };
const ALLOC_OPACITY: Record<StatusTone, number> = {
  active: 1,
  warning: 0.95,
  danger: 0.9,
  info: 0.7,
  pending: 0.55,
  neutral: 0.4,
};

const DAY_MS = 86_400_000;

function dayOffset(target: Date, start: Date): number {
  return Math.round((target.getTime() - start.getTime()) / DAY_MS);
}

function clampDay(day: number, total: number): number {
  return Math.max(0, Math.min(total - 1, day));
}

interface NormalizedSpan {
  alloc: number;
  endDay: number;
  segment: TimelineSegment;
  startDay: number;
  tone: StatusTone;
}

interface StackedBlock {
  bottomPercent: number;
  endDay: number;
  heightPercent: number;
  span: NormalizedSpan;
  startDay: number;
}

interface MonthMark {
  dayOffset: number;
  label: string;
}

interface HoverState {
  anchor: DOMRect;
  ctx: TimelineHoverContext;
  segment: TimelineSegment;
}

function defaultRangeStart(now: Date, size: TimelineSize): Date {
  const monthsBack = size === 'xs' || size === 'sm' ? 3 : 6;
  return new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
}

function defaultRangeEnd(now: Date, size: TimelineSize): Date {
  const monthsForward = size === 'xs' || size === 'sm' ? 3 : 12;
  return new Date(now.getFullYear(), now.getMonth() + monthsForward + 1, 0);
}

function computeMonthMarks(rangeStart: Date, rangeEnd: Date): MonthMark[] {
  const marks: MonthMark[] = [];
  const cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
  while (cursor <= rangeEnd) {
    marks.push({
      dayOffset: dayOffset(cursor, rangeStart),
      label: `${cursor.toLocaleString('en', { month: 'short' })} ${String(cursor.getFullYear()).slice(2)}`,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return marks;
}

function smartPlace(
  anchor: DOMRect,
  panel: { width: number; height: number },
  viewport: { width: number; height: number },
  margin = 8,
): { left: number; top: number } {
  const candidates = [
    { left: anchor.right + margin, top: anchor.top + anchor.height / 2 - panel.height / 2 },
    { left: anchor.left - panel.width - margin, top: anchor.top + anchor.height / 2 - panel.height / 2 },
    { left: anchor.left + anchor.width / 2 - panel.width / 2, top: anchor.bottom + margin },
    { left: anchor.left + anchor.width / 2 - panel.width / 2, top: anchor.top - panel.height - margin },
  ];
  for (const c of candidates) {
    if (
      c.left >= margin
      && c.top >= margin
      && c.left + panel.width <= viewport.width - margin
      && c.top + panel.height <= viewport.height - margin
    ) {
      return c;
    }
  }
  const fallback = candidates[0];
  return {
    left: Math.max(margin, Math.min(fallback.left, viewport.width - panel.width - margin)),
    top: Math.max(margin, Math.min(fallback.top, viewport.height - panel.height - margin)),
  };
}

interface DefaultHoverCardProps {
  ctx: TimelineHoverContext;
  segment: TimelineSegment;
}

function DefaultHoverCard({ ctx, segment }: DefaultHoverCardProps): JSX.Element {
  const span = segment.endDate
    ? `${formatDateShort(segment.startDate)} – ${formatDateShort(segment.endDate)}`
    : `${formatDateShort(segment.startDate)} – open`;
  const startedRelative = formatRelative(segment.startDate);
  const endsRelative = segment.endDate ? formatRelative(segment.endDate) : null;
  const headroom = Math.max(0, 100 - ctx.weeklyTotalPercent);
  const overbooked = ctx.weeklyTotalPercent > 100;

  return (
    <div className="ds-timeline__hovercard-body">
      <div className="ds-timeline__hovercard-head">
        <span className="ds-timeline__hovercard-title">{segment.label}</span>
        {segment.status && (
          <StatusBadge status={segment.status} tone={segment.tone} variant="chip" size="small" />
        )}
      </div>
      <dl className="ds-timeline__hovercard-rows">
        {typeof segment.allocationPercent === 'number' && (
          <>
            <dt>Allocation</dt>
            <dd>{segment.allocationPercent}%</dd>
          </>
        )}
        <dt>Span</dt>
        <dd>
          {span}
          <div className="ds-timeline__hovercard-sub">
            {startedRelative}
            {endsRelative ? ` · ends ${endsRelative}` : ''}
          </div>
        </dd>
        {ctx.weeklyTotalPercent > 0 && (
          <>
            <dt>Workload</dt>
            <dd className={overbooked ? 'ds-timeline__hovercard-bad' : undefined}>
              {ctx.weeklyTotalPercent}% total
              {overbooked
                ? ` · over by ${ctx.weeklyTotalPercent - 100}%`
                : ` · ${headroom}% headroom`}
            </dd>
          </>
        )}
        {segment.meta && Object.entries(segment.meta).map(([key, value]) => (
          <div key={key} style={{ display: 'contents' }}>
            <dt>{key}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {segment.href && (
        <div className="ds-timeline__hovercard-cta">View assignment →</div>
      )}
    </div>
  );
}

export function Timeline({
  segments,
  size = 'md',
  variant = 'stacked',
  rangeStart,
  rangeEnd,
  markers,
  showToday = true,
  showMonthGrid,
  showMonthLabels,
  showOverallocationLine = true,
  showOverallocationShading = true,
  showLegend = false,
  renderHoverCard,
  onSegmentClick,
  emptyState,
  ariaLabel,
  testId,
  className,
}: TimelineProps): JSX.Element {
  const trackHeight = TRACK_HEIGHT[size];
  const labelHeight = LABEL_HEIGHT[size];
  const labelFont = LABEL_FONT[size];
  const enableMonthGrid = showMonthGrid ?? (size === 'md' || size === 'lg');
  const enableMonthLabels = showMonthLabels ?? size !== 'xs';

  const trackRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [hover, setHover] = useState<HoverState | null>(null);

  const data = useMemo(() => {
    const now = new Date();
    const start = rangeStart ? new Date(rangeStart) : defaultRangeStart(now, size);
    const end = rangeEnd ? new Date(rangeEnd) : defaultRangeEnd(now, size);
    const totalDays = Math.max(1, dayOffset(end, start) + 1);
    const todayDay = clampDay(dayOffset(now, start), totalDays);

    const spans: NormalizedSpan[] = [];
    for (const seg of segments) {
      const segStart = new Date(seg.startDate);
      const segEnd = seg.endDate ? new Date(seg.endDate) : end;
      if (segStart > end || segEnd < start) continue;
      const tone = seg.tone ?? (seg.status ? resolveStatusTone(seg.status) : 'info');
      spans.push({
        alloc: seg.allocationPercent ?? 100,
        endDay: clampDay(dayOffset(segEnd, start), totalDays),
        segment: seg,
        startDay: clampDay(dayOffset(segStart, start), totalDays),
        tone,
      });
    }

    const monthMarks = computeMonthMarks(start, end);

    const blocks: StackedBlock[] = [];
    let maxAlloc = 100;

    if (variant === 'stacked') {
      const boundaries = new Set<number>();
      for (const s of spans) {
        boundaries.add(s.startDay);
        boundaries.add(s.endDay + 1);
      }
      const sorted = [...boundaries].sort((a, b) => a - b);
      let regionMaxStack = 0;
      for (let i = 0; i < sorted.length - 1; i++) {
        const regionStart = sorted[i];
        const regionEnd = sorted[i + 1] - 1;
        if (regionEnd < 0 || regionStart >= totalDays) continue;
        let cumBottom = 0;
        for (const s of spans) {
          if (s.startDay <= regionEnd && s.endDay >= regionStart) {
            blocks.push({
              bottomPercent: cumBottom,
              endDay: regionEnd,
              heightPercent: s.alloc,
              span: s,
              startDay: regionStart,
            });
            cumBottom += s.alloc;
          }
        }
        regionMaxStack = Math.max(regionMaxStack, cumBottom);
      }
      maxAlloc = Math.max(100, Math.round(regionMaxStack * 1.1));
      for (const b of blocks) {
        b.bottomPercent = (b.bottomPercent / maxAlloc) * 100;
        b.heightPercent = (b.heightPercent / maxAlloc) * 100;
      }
    }

    const conflictRuns: { endDay: number; startDay: number; total: number }[] = [];
    if (variant === 'stacked' && showOverallocationShading) {
      let runStart: number | null = null;
      let runTotal = 0;
      for (let day = 0; day < totalDays; day++) {
        let total = 0;
        for (const s of spans) {
          if (s.startDay <= day && s.endDay >= day) total += s.alloc;
        }
        if (total > 100) {
          if (runStart === null) runStart = day;
          runTotal = Math.max(runTotal, total);
        } else if (runStart !== null) {
          conflictRuns.push({ endDay: day - 1, startDay: runStart, total: runTotal });
          runStart = null;
          runTotal = 0;
        }
      }
      if (runStart !== null) {
        conflictRuns.push({ endDay: totalDays - 1, startDay: runStart, total: runTotal });
      }
    }

    return { blocks, conflictRuns, end, maxAlloc, monthMarks, spans, start, todayDay, totalDays };
  }, [rangeEnd, rangeStart, segments, showOverallocationShading, size, variant]);

  const computeContext = useCallback(
    (segment: TimelineSegment): TimelineHoverContext => {
      const target = data.spans.find((s) => s.segment.id === segment.id);
      if (!target) return { conflicts: [], weeklyTotalPercent: 0 };
      const conflicts: TimelineSegment[] = [];
      let weeklyTotalPercent = 0;
      for (const s of data.spans) {
        if (s.startDay <= target.endDay && s.endDay >= target.startDay) {
          weeklyTotalPercent += s.alloc;
          if (s.segment.id !== segment.id) conflicts.push(s.segment);
        }
      }
      return { conflicts, weeklyTotalPercent };
    },
    [data.spans],
  );

  const openHover = useCallback(
    (segment: TimelineSegment, anchor: DOMRect) => {
      setHover({ anchor, ctx: computeContext(segment), segment });
    },
    [computeContext],
  );

  const closeHover = useCallback(() => setHover(null), []);

  const handleClick = useCallback(
    (segment: TimelineSegment) => {
      onSegmentClick?.(segment);
    },
    [onSegmentClick],
  );

  const handleKey = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, segment: TimelineSegment) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      const ids = data.spans.map((s) => s.segment.id);
      const idx = ids.indexOf(segment.id);
      if (idx < 0) return;
      const nextIdx = event.key === 'ArrowRight'
        ? Math.min(ids.length - 1, idx + 1)
        : Math.max(0, idx - 1);
      const nextId = ids[nextIdx];
      const next = trackRefs.current.get(nextId);
      next?.focus();
    },
    [data.spans],
  );

  if (data.spans.length === 0) {
    return (
      <div
        aria-label={ariaLabel}
        className={['ds-timeline', `ds-timeline--${size}`, className].filter(Boolean).join(' ')}
        data-testid={testId}
      >
        <div
          className="ds-timeline__track ds-timeline__track--empty"
          style={{ height: trackHeight }}
        >
          {emptyState ?? <span className="ds-timeline__empty">No assignments in range</span>}
        </div>
      </div>
    );
  }

  const showLegendComputed = showLegend ?? size === 'lg';

  return (
    <div
      aria-label={ariaLabel}
      className={['ds-timeline', `ds-timeline--${size}`, `ds-timeline--${variant}`, className].filter(Boolean).join(' ')}
      data-testid={testId}
    >
      <div
        className="ds-timeline__track"
        role="group"
        style={{ height: trackHeight }}
      >
        {variant === 'stacked' && enableMonthGrid && Array.from({ length: Math.floor(data.maxAlloc / 50) }, (_, i) => {
          const pct = (i + 1) * 50;
          const yPct = (pct / data.maxAlloc) * 100;
          return (
            <div
              key={`hgrid-${pct}`}
              className="ds-timeline__hgrid"
              style={{ bottom: `${yPct}%` }}
            />
          );
        })}

        {enableMonthGrid && data.monthMarks.map((m) => (
          <div
            key={`vgrid-${m.dayOffset}`}
            className="ds-timeline__vgrid"
            style={{ left: `${(m.dayOffset / data.totalDays) * 100}%` }}
          />
        ))}

        {variant === 'stacked' && data.conflictRuns.map((run, i) => (
          <div
            key={`conflict-${i}`}
            className="ds-timeline__conflict"
            style={{
              left: `${(run.startDay / data.totalDays) * 100}%`,
              width: `${((run.endDay - run.startDay + 1) / data.totalDays) * 100}%`,
            }}
            title={`Overallocated: ${run.total}%`}
          />
        ))}

        {markers?.map((m, i) => {
          const day = clampDay(dayOffset(new Date(m.date), data.start), data.totalDays);
          const color = statusToneColor(m.tone ?? 'danger');
          return (
            <div
              key={`marker-${i}`}
              className={`ds-timeline__marker ds-timeline__marker--${m.variant ?? 'line'}`}
              style={{ borderColor: color, left: `${(day / data.totalDays) * 100}%` }}
            >
              {m.label && size !== 'xs' && (
                <span className="ds-timeline__marker-label" style={{ color }}>{m.label}</span>
              )}
            </div>
          );
        })}

        {showToday && (
          <div
            className="ds-timeline__today"
            style={{ left: `${(data.todayDay / data.totalDays) * 100}%` }}
          />
        )}

        {variant === 'stacked' && showOverallocationLine && data.maxAlloc > 100 && (
          <div
            className="ds-timeline__overline"
            style={{ bottom: `${(100 / data.maxAlloc) * 100}%` }}
          />
        )}

        {variant === 'bar' && data.spans.map((s) => {
          const left = (s.startDay / data.totalDays) * 100;
          const width = Math.max(0.3, ((s.endDay - s.startDay + 1) / data.totalDays) * 100);
          const color = statusToneColor(s.tone);
          const isHovered = hover?.segment.id === s.segment.id;
          const aria = `${s.segment.label}, ${s.segment.status ?? ''}, from ${formatDateShort(s.segment.startDate)} to ${s.segment.endDate ? formatDateShort(s.segment.endDate) : 'open'}`.trim();
          return (
            <button
              key={s.segment.id}
              ref={(node) => {
                if (node) trackRefs.current.set(s.segment.id, node);
                else trackRefs.current.delete(s.segment.id);
              }}
              aria-label={aria}
              className="ds-timeline__bar"
              data-tone={s.tone}
              data-hovered={isHovered || undefined}
              onBlur={closeHover}
              onClick={() => handleClick(s.segment)}
              onFocus={(e) => openHover(s.segment, e.currentTarget.getBoundingClientRect())}
              onKeyDown={(e) => handleKey(e, s.segment)}
              onMouseEnter={(e) => openHover(s.segment, e.currentTarget.getBoundingClientRect())}
              onMouseLeave={closeHover}
              style={{
                background: color,
                left: `${left}%`,
                opacity: ALLOC_OPACITY[s.tone],
                width: `${width}%`,
              }}
              type="button"
            />
          );
        })}

        {variant === 'stacked' && data.blocks.map((b, i) => {
          const left = (b.startDay / data.totalDays) * 100;
          const width = Math.max(0.3, ((b.endDay - b.startDay + 1) / data.totalDays) * 100);
          const color = statusToneColor(b.span.tone);
          const isHovered = hover?.segment.id === b.span.segment.id;
          const aria = `${b.span.segment.label}, ${b.span.segment.status ?? ''}, ${b.span.alloc}%, from ${formatDateShort(b.span.segment.startDate)} to ${b.span.segment.endDate ? formatDateShort(b.span.segment.endDate) : 'open'}`.trim();
          return (
            <button
              key={`block-${i}`}
              ref={(node) => {
                if (node) trackRefs.current.set(b.span.segment.id, node);
              }}
              aria-label={aria}
              className="ds-timeline__block"
              data-tone={b.span.tone}
              data-hovered={isHovered || undefined}
              onBlur={closeHover}
              onClick={() => handleClick(b.span.segment)}
              onFocus={(e) => openHover(b.span.segment, e.currentTarget.getBoundingClientRect())}
              onKeyDown={(e) => handleKey(e, b.span.segment)}
              onMouseEnter={(e) => openHover(b.span.segment, e.currentTarget.getBoundingClientRect())}
              onMouseLeave={closeHover}
              style={{
                background: color,
                bottom: `${b.bottomPercent}%`,
                height: `${Math.max(b.heightPercent, 3)}%`,
                left: `${left}%`,
                opacity: ALLOC_OPACITY[b.span.tone],
                width: `${width}%`,
              }}
              type="button"
            />
          );
        })}
      </div>

      {enableMonthLabels && (
        <div className="ds-timeline__months" style={{ height: labelHeight }}>
          {data.monthMarks.map((m, i) => {
            const showEvery = size === 'xs' ? 3 : size === 'sm' ? 3 : size === 'md' ? 2 : 1;
            if (i % showEvery !== 0) return null;
            return (
              <span
                key={`mlabel-${i}`}
                className="ds-timeline__month-label"
                style={{
                  fontSize: labelFont,
                  left: `${(m.dayOffset / data.totalDays) * 100}%`,
                }}
              >
                {m.label}
              </span>
            );
          })}
        </div>
      )}

      {showLegendComputed && (
        <TimelineLegend segments={data.spans} markers={markers} showToday={showToday} />
      )}

      {hover && <TimelineHoverCard hover={hover} renderBody={renderHoverCard} />}
    </div>
  );
}

interface TimelineLegendProps {
  markers?: TimelineMarker[];
  segments: NormalizedSpan[];
  showToday: boolean;
}

function TimelineLegend({ markers, segments, showToday }: TimelineLegendProps): JSX.Element {
  const tones = new Set<StatusTone>();
  for (const s of segments) tones.add(s.tone);
  return (
    <div className="ds-timeline__legend">
      {[...tones].map((tone) => (
        <span key={tone} className="ds-timeline__legend-item">
          <span
            className="ds-timeline__legend-swatch"
            style={{ background: statusToneColor(tone), opacity: ALLOC_OPACITY[tone] }}
          />
          <span style={{ textTransform: 'capitalize' }}>{tone}</span>
        </span>
      ))}
      {showToday && (
        <span className="ds-timeline__legend-item">
          <span className="ds-timeline__legend-swatch ds-timeline__legend-swatch--line" />
          <span>Today</span>
        </span>
      )}
      {markers?.map((m, i) => m.label ? (
        <span key={`mleg-${i}`} className="ds-timeline__legend-item">
          <span
            className="ds-timeline__legend-swatch ds-timeline__legend-swatch--line"
            style={{ background: statusToneColor(m.tone ?? 'danger') }}
          />
          <span>{m.label}</span>
        </span>
      ) : null)}
    </div>
  );
}

interface TimelineHoverCardProps {
  hover: HoverState;
  renderBody?: (s: TimelineSegment, ctx: TimelineHoverContext) => ReactNode;
}

function TimelineHoverCard({ hover, renderBody }: TimelineHoverCardProps): JSX.Element | null {
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const [zIndex] = useState(() => allocateZIndex());
  const portalRoot = getPortalRoot();

  useLayoutEffect(() => {
    function recompute(): void {
      const panel = panelRef.current;
      if (!panel) return;
      const rect = panel.getBoundingClientRect();
      setPosition(smartPlace(
        hover.anchor,
        { height: rect.height, width: rect.width },
        { height: window.innerHeight, width: window.innerWidth },
      ));
    }
    recompute();
    const onScroll = (): void => recompute();
    window.addEventListener('resize', onScroll);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [hover.anchor, hover.segment.id]);

  if (!portalRoot) return null;

  const style: CSSProperties = {
    left: position?.left ?? -9999,
    top: position?.top ?? -9999,
    zIndex,
  };

  return createPortal(
    <div ref={panelRef} className="ds-timeline__hovercard" role="tooltip" style={style}>
      {renderBody ? renderBody(hover.segment, hover.ctx) : <DefaultHoverCard ctx={hover.ctx} segment={hover.segment} />}
    </div>,
    portalRoot,
  );
}
