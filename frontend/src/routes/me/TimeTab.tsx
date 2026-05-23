import { useEffect, useMemo, useState } from 'react';

import { SectionCard } from '@/components/common/SectionCard';
import { Timeline, type TimelineSegment } from '@/components/ds';
import { fetchMonthlyTimesheet, type MonthlyTimesheetResponse } from '@/lib/api/my-time';
import { MyTimePage } from '@/routes/my-time/MyTimePage';

/**
 * /me?tab=time — week-timeline strip above the existing monthly time-entry surface.
 *
 * The strip shows the current week (Mon–Sun) with one bar per project,
 * width = day-span the entries cover, height = allocationPercent =
 * project-week-hours / 40 × 100 (40h = full-time week). Uses the lifecycle
 * Timeline (colorMode='lifecycle') with status="assigned" so the bars
 * read in workspace green.
 *
 * Below the strip, the existing MyTimePage handles all the heavy
 * monthly-grid work. No rewrite — additive only.
 */
export function TimeTab(): JSX.Element {
  const today = useMemo(() => new Date(), []);
  const monthKey = useMemo(() => `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`, [today]);
  const [data, setData] = useState<MonthlyTimesheetResponse | null>(null);

  useEffect(() => {
    let active = true;
    fetchMonthlyTimesheet(monthKey)
      .then((res) => {
        if (active) setData(res);
      })
      .catch(() => {
        // strip is decorative; legacy MyTimePage below has its own loading + error states
      });
    return () => {
      active = false;
    };
  }, [monthKey]);

  const weekSegments: TimelineSegment[] = useMemo(() => {
    if (!data) return [];
    // Compute this Monday's date.
    const day = today.getDay(); // 0=Sun..6=Sat
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + mondayOffset);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);

    // Filter entries to this week + group by projectId.
    type ProjectAcc = { projectId: string; projectName: string; projectCode: string; hours: number; minDate: string; maxDate: string };
    const byProject = new Map<string, ProjectAcc>();
    for (const e of data.entries) {
      const d = new Date(e.date);
      if (d < monday || d > sunday) continue;
      const k = e.projectId;
      const cur = byProject.get(k);
      if (cur) {
        cur.hours += e.hours;
        if (e.date < cur.minDate) cur.minDate = e.date;
        if (e.date > cur.maxDate) cur.maxDate = e.date;
      } else {
        byProject.set(k, {
          projectId: e.projectId,
          projectName: e.projectName,
          projectCode: e.projectCode,
          hours: e.hours,
          minDate: e.date,
          maxDate: e.date,
        });
      }
    }

    const out: TimelineSegment[] = [];
    for (const p of byProject.values()) {
      out.push({
        id: p.projectId,
        label: `${p.projectName} · ${p.hours.toFixed(1)}h`,
        startDate: p.minDate,
        endDate: p.maxDate,
        status: 'assigned',
        allocationPercent: Math.round((p.hours / 40) * 100),
        href: `/projects/${p.projectId}`,
      });
    }
    return out.sort((a, b) => (b.allocationPercent ?? 0) - (a.allocationPercent ?? 0));
  }, [data, today]);

  const weeklyTotals = useMemo(() => {
    if (!data) return { reported: 0, expected: 0, variance: 0 };
    const day = today.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + mondayOffset);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
    let reported = 0;
    for (const e of data.entries) {
      const d = new Date(e.date);
      if (d >= monday && d <= sunday) reported += e.hours;
    }
    const expected = 40; // standard week — matches MyTimePage convention
    return { reported, expected, variance: reported - expected };
  }, [data, today]);

  const monday = (() => {
    const day = today.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    return new Date(today.getFullYear(), today.getMonth(), today.getDate() + mondayOffset);
  })();
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <SectionCard title={`This week · ${formatRange(monday, sunday)}`}>
        {weekSegments.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--font-size-compact)' }}>
            No hours logged this week yet. The full monthly grid is below — start logging there.
          </p>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-3)', flexWrap: 'wrap', fontSize: 12 }}>
              <KpiInline label="Reported" value={`${weeklyTotals.reported.toFixed(1)}h`} />
              <KpiInline label="Expected" value={`${weeklyTotals.expected}h`} />
              <KpiInline
                label="Variance"
                value={`${weeklyTotals.variance >= 0 ? '+' : ''}${weeklyTotals.variance.toFixed(1)}h`}
                tone={weeklyTotals.variance < 0 ? 'warning' : weeklyTotals.variance > 4 ? 'info' : 'active'}
              />
            </div>
            <div style={{ height: 140 }}>
              <Timeline
                segments={weekSegments}
                colorMode="lifecycle"
                variant="stacked"
                size="md"
                rangeStart={monday.toISOString().slice(0, 10)}
                rangeEnd={sunday.toISOString().slice(0, 10)}
                showToday
                ariaLabel="This week's logged hours by project"
                onSegmentClick={(seg) => seg.href && (window.location.href = seg.href)}
              />
            </div>
          </>
        )}
      </SectionCard>

      <MyTimePage />
    </div>
  );
}

interface KpiInlineProps {
  label: string;
  value: string;
  tone?: 'active' | 'warning' | 'info';
}

function KpiInline({ label, value, tone }: KpiInlineProps): JSX.Element {
  const color =
    tone === 'warning'
      ? 'var(--color-status-warning)'
      : tone === 'info'
        ? 'var(--color-status-info)'
        : tone === 'active'
          ? 'var(--color-status-active)'
          : 'var(--color-text)';
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 10, color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      <span style={{ fontSize: 18, fontVariantNumeric: 'tabular-nums', fontWeight: 600, color }}>{value}</span>
    </span>
  );
}

function formatRange(start: Date, end: Date): string {
  const fmt = (d: Date): string => d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  return `${fmt(start)} – ${fmt(end)}`;
}
