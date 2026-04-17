import { useEffect, useMemo, useState } from 'react';

import {
  fetchAssignments,
  type AssignmentDirectoryItem,
} from '@/lib/api/assignments';

/* ── Types ── */

interface TimelineBlock {
  alloc: number;
  bottomOffset: number;
  endDay: number;
  name: string;
  startDay: number;
  status: string;
}

interface MonthMark {
  dayOffset: number;
  label: string;
}

export interface PlannedAssignment {
  allocationPercent: number;
  endDate: string;
  projectName: string;
  startDate: string;
}

interface HoverBlock {
  block: TimelineBlock;
  x: number;
}

/** Pre-loaded assignment data — avoids per-row API calls in table views */
export interface PreloadedAssignment {
  allocationPercent: number;
  endDate: string | null;
  projectName: string;
  startDate: string;
  status: string;
}

export interface WorkloadTimelineProps {
  /** Compact mode: shorter height, no legend, smaller labels — for table embedding */
  compact?: boolean;
  /** Pre-loaded assignments — when provided, skips the API fetch entirely */
  preloadedAssignments?: PreloadedAssignment[];
  personId: string;
  personStatus?: string;
  personTerminatedAt?: string | null;
  planned?: PlannedAssignment;
}

/* ── Helpers ── */

function statusColor(s: string): string {
  const u = s.toUpperCase();
  if (u === 'PLANNED_NEW') return 'var(--color-status-danger)';
  if (u === 'ACTIVE' || u === 'APPROVED') return 'var(--color-status-active)';
  if (u === 'REQUESTED') return 'var(--color-status-pending)';
  return 'var(--color-status-info)';
}

function statusOpacity(s: string): number {
  const u = s.toUpperCase();
  if (u === 'PLANNED_NEW') return 0.8;
  if (u === 'ACTIVE' || u === 'APPROVED') return 1;
  if (u === 'REQUESTED') return 0.45;
  return 0.6;
}

const CHART_HEIGHT_FULL = 56;
const CHART_HEIGHT_COMPACT = 36;

/* ── Component ── */

export function WorkloadTimeline({ compact, preloadedAssignments, personId, personStatus, personTerminatedAt, planned }: WorkloadTimelineProps): JSX.Element {
  const CHART_HEIGHT = compact ? CHART_HEIGHT_COMPACT : CHART_HEIGHT_FULL;
  const [fetchedAssignments, setFetchedAssignments] = useState<AssignmentDirectoryItem[]>([]);
  const [loading, setLoading] = useState(!preloadedAssignments);
  const [hover, setHover] = useState<HoverBlock | null>(null);

  // Only fetch from API if no preloaded data was provided
  useEffect(() => {
    if (preloadedAssignments) return;
    let active = true;
    setLoading(true);
    void fetchAssignments({ personId, pageSize: 200 })
      .then((r) => { if (active) setFetchedAssignments(r.items); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [personId, preloadedAssignments]);

  // Normalize both data shapes into a common format for the timeline
  const assignments: Array<{ allocationPercent: number; endDate: string | null; projectName: string; startDate: string; status: string }> = useMemo(() => {
    if (preloadedAssignments) {
      return preloadedAssignments;
    }
    return fetchedAssignments.map((a) => ({
      allocationPercent: a.allocationPercent,
      endDate: a.endDate,
      projectName: a.project.displayName,
      startDate: a.startDate,
      status: a.approvalState,
    }));
  }, [preloadedAssignments, fetchedAssignments]);

  const { blocks, deactivationDay, months, totalDays, todayOffset } = useMemo(() => {
    const now = new Date();
    const rangeStart = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 13, 0);
    const total = Math.round((rangeEnd.getTime() - rangeStart.getTime()) / 86400000) + 1;
    const today = Math.round((now.getTime() - rangeStart.getTime()) / 86400000);

    function dayOf(d: Date): number {
      return Math.max(0, Math.min(total - 1, Math.round((d.getTime() - rangeStart.getTime()) / 86400000)));
    }

    const mks: MonthMark[] = [];
    for (let offset = -6; offset <= 12; offset++) {
      const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      mks.push({ dayOffset: dayOf(d), label: `${d.toLocaleString('en', { month: 'short' })} ${String(d.getFullYear()).slice(2)}` });
    }

    type RawSpan = { alloc: number; endDay: number; name: string; startDay: number; status: string };
    const spans: RawSpan[] = [];
    for (const a of assignments) {
      const aStart = new Date(a.startDate);
      const aEnd = a.endDate ? new Date(a.endDate) : rangeEnd;
      if (aStart > rangeEnd || aEnd < rangeStart) continue;
      spans.push({ alloc: a.allocationPercent, endDay: dayOf(aEnd), name: a.projectName, startDay: dayOf(aStart), status: a.status });
    }
    if (planned?.startDate) {
      const pStart = new Date(planned.startDate);
      const pEnd = planned.endDate ? new Date(planned.endDate) : rangeEnd;
      if (pStart <= rangeEnd && pEnd >= rangeStart) {
        spans.push({ alloc: planned.allocationPercent, endDay: dayOf(pEnd), name: `${planned.projectName} (new)`, startDay: dayOf(pStart), status: 'PLANNED_NEW' });
      }
    }

    const boundaries = new Set<number>();
    for (const s of spans) { boundaries.add(s.startDay); boundaries.add(s.endDay + 1); }
    const sorted = [...boundaries].sort((a, b) => a - b);

    const bks: TimelineBlock[] = [];
    for (let bi = 0; bi < sorted.length - 1; bi++) {
      const regionStart = sorted[bi];
      const regionEnd = sorted[bi + 1] - 1;
      if (regionEnd < 0 || regionStart >= total) continue;
      let cumBottom = 0;
      for (const s of spans) {
        if (s.startDay <= regionEnd && s.endDay >= regionStart) {
          bks.push({ alloc: s.alloc, bottomOffset: cumBottom, endDay: regionEnd, name: s.name, startDay: regionStart, status: s.status });
          cumBottom += s.alloc;
        }
      }
    }

    let deacDay: number | null = null;
    if (personStatus && personStatus !== 'ACTIVE') {
      if (personTerminatedAt) {
        deacDay = dayOf(new Date(personTerminatedAt));
      } else {
        const endDates = assignments.filter((a) => a.endDate).map((a) => new Date(a.endDate!).getTime());
        if (endDates.length > 0) deacDay = dayOf(new Date(Math.max(...endDates)));
      }
    }

    return { blocks: bks, deactivationDay: deacDay, months: mks, totalDays: total, todayOffset: today };
  }, [assignments, planned?.startDate, planned?.endDate, planned?.allocationPercent, planned?.projectName, personStatus, personTerminatedAt]);

  if (loading) return <div style={{ fontSize: compact ? 9 : 11, color: 'var(--color-text-muted)', padding: compact ? '2px 0' : '4px 0', height: compact ? CHART_HEIGHT : undefined }}>Loading workload...</div>;

  const rawMax = Math.max(100, ...blocks.map((b) => b.bottomOffset + b.alloc));
  const maxAlloc = Math.round(rawMax * 1.1);

  return (
    <div style={{ marginBottom: compact ? 0 : 'var(--space-2)' }}>
      {!compact && (
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 4 }}>
          Workload Timeline
          <span style={{ fontWeight: 400, marginLeft: 8 }}>0%–{maxAlloc}% allocation</span>
        </div>
      )}

      <div
        style={{ position: 'relative', height: CHART_HEIGHT, background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: 4, overflow: 'visible' }}
      >
        {Array.from({ length: Math.floor(maxAlloc / 50) }, (_, i) => {
          const pct = (i + 1) * 50;
          const yPct = (pct / maxAlloc) * 100;
          return (
            <div key={`hgrid-${pct}`} style={{
              position: 'absolute', left: 0, right: 0, bottom: `${yPct}%`,
              borderTop: '1px solid var(--color-border)', opacity: 0.3, zIndex: 0,
            }}>
              <span style={{ position: 'absolute', left: 2, top: -10, fontSize: 7, color: 'var(--color-text-subtle)' }}>{pct}%</span>
            </div>
          );
        })}

        {months.map((m, i) => (
          <div key={i} style={{
            position: 'absolute', left: `${(m.dayOffset / totalDays) * 100}%`, top: 0, bottom: 0,
            borderLeft: '1px solid var(--color-border)', opacity: 0.5,
          }} />
        ))}

        {deactivationDay !== null && (
          <div style={{
            position: 'absolute', left: `${(deactivationDay / totalDays) * 100}%`, top: 0, bottom: 0,
            borderLeft: '3px solid var(--color-status-danger)', zIndex: 4,
          }}>
            <span style={{ position: 'absolute', top: 1, left: 4, fontSize: 7, color: 'var(--color-status-danger)', whiteSpace: 'nowrap', fontWeight: 700 }}>
              {personStatus?.toLowerCase() ?? 'inactive'}
            </span>
          </div>
        )}

        <div style={{
          position: 'absolute', left: `${(todayOffset / totalDays) * 100}%`, top: 0, bottom: 0,
          borderLeft: '2px solid var(--color-accent)', zIndex: 3,
        }} />

        {blocks.map((b, i) => {
          const leftPct = (b.startDay / totalDays) * 100;
          const widthPct = Math.max(0.3, ((b.endDay - b.startDay + 1) / totalDays) * 100);
          const heightPct = (b.alloc / maxAlloc) * 100;
          const bottomPct = (b.bottomOffset / maxAlloc) * 100;
          return (
            <div
              key={i}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const parent = e.currentTarget.parentElement?.getBoundingClientRect();
                setHover({ block: b, x: rect.left - (parent?.left ?? 0) + rect.width / 2 });
              }}
              onMouseLeave={() => setHover(null)}
              style={{
                position: 'absolute',
                left: `${leftPct}%`,
                width: `${widthPct}%`,
                bottom: `${bottomPct}%`,
                height: `${Math.max(heightPct, 3)}%`,
                background: statusColor(b.status),
                opacity: hover?.block === b ? 1 : statusOpacity(b.status),
                borderRadius: '2px 2px 0 0',
                minWidth: 3,
                zIndex: hover?.block === b ? 5 : 2,
                cursor: 'default',
                outline: hover?.block === b ? '2px solid var(--color-accent)' : 'none',
                outlineOffset: -1,
                transition: 'opacity 100ms, outline 100ms',
              }}
            />
          );
        })}

        {maxAlloc > 100 && (
          <div style={{
            position: 'absolute', left: 0, right: 0,
            bottom: `${(100 / maxAlloc) * 100}%`,
            borderTop: '1px dashed var(--color-status-danger)', opacity: 0.5,
          }}>
            <span style={{ position: 'absolute', right: 2, top: -10, fontSize: 8, color: 'var(--color-status-danger)' }}>100%</span>
          </div>
        )}

        {hover && (
          <div style={{
            position: 'absolute', top: 0, right: 'calc(100% + 5px)',
            width: 180, padding: '6px 10px',
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 6, fontSize: 11, zIndex: 20, pointerEvents: 'none',
            boxShadow: 'var(--shadow-dropdown)',
          }}>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>{hover.block.name}</div>
            <div style={{ color: 'var(--color-text-muted)' }}>Allocation: {hover.block.alloc}%</div>
            <div style={{ color: 'var(--color-text-muted)' }}>Status: {hover.block.status}</div>
            <div style={{ color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums' }}>
              Day {hover.block.startDay + 1} – {hover.block.endDay + 1}
            </div>
          </div>
        )}
      </div>

      {/* Month labels — always shown but smaller in compact */}
      <div style={{ position: 'relative', height: compact ? 10 : 12, marginTop: compact ? 1 : 2 }}>
        {months.map((m, i) => (
          <span key={i} style={{
            position: 'absolute', left: `${(m.dayOffset / totalDays) * 100}%`,
            fontSize: compact ? 7 : 8, color: 'var(--color-text-subtle)', whiteSpace: 'nowrap',
            transform: 'translateX(-50%)',
          }}>
            {compact ? (i % 3 === 0 ? m.label : '') : (i % 2 === 0 ? m.label : '')}
          </span>
        ))}
      </div>

      {/* Legend — only in full mode */}
      {!compact && (
        <div style={{ display: 'flex', gap: 'var(--space-3)', fontSize: 9, color: 'var(--color-text-muted)', marginTop: 2, flexWrap: 'wrap' }}>
          <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--color-status-active)', marginRight: 3, verticalAlign: 'middle' }} />Approved</span>
          <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--color-status-pending)', opacity: 0.45, marginRight: 3, verticalAlign: 'middle' }} />Requested</span>
          <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--color-status-info)', opacity: 0.6, marginRight: 3, verticalAlign: 'middle' }} />Draft</span>
          <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--color-status-danger)', opacity: 0.8, marginRight: 3, verticalAlign: 'middle' }} />This assignment</span>
          <span style={{ marginLeft: 'auto', fontStyle: 'italic' }}>
            Blue = today{deactivationDay !== null ? ' · Red = deactivated' : ''}
          </span>
        </div>
      )}
    </div>
  );
}
