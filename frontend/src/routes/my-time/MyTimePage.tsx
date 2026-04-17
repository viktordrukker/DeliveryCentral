import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';

import { useTitleBarActions } from '@/app/title-bar-context';
import { useAuth } from '@/app/auth-context';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { TipBalloon, TipTrigger } from '@/components/common/TipBalloon';
import {
  fetchMonthlyTimesheet,
  autoFillMonth,
  copyPreviousMonth,
  type MonthlyTimesheetResponse,
} from '@/lib/api/my-time';
import { upsertTimesheetEntry, submitTimesheetWeek } from '@/lib/api/timesheets';

const NUM = { fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const };
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_ABBR = ['', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']; // index 0 unused, 1=Mon..7=Sun

const BENCH_CATEGORIES = [
  { code: 'BENCH-EDU', label: 'Courses & Self-Education' },
  { code: 'BENCH-INT', label: 'Internal Project' },
  { code: 'BENCH-PRE', label: 'Pre-Sales Support' },
  { code: 'BENCH-HR', label: 'Interviewing' },
  { code: 'BENCH-MEN', label: 'Mentoring' },
  { code: 'BENCH-ADM', label: 'Administrative' },
  { code: 'BENCH-TRN', label: 'Transition' },
];

const LEAVE_LABELS: Record<string, string> = {
  ANNUAL: 'Vacation', SICK: 'Sick', OT_OFF: 'OT Off', PERSONAL: 'Personal',
  PARENTAL: 'Parental', BEREAVEMENT: 'Bereavement', STUDY: 'Study', OTHER: 'Other',
};

type Tab = 'calendar' | 'leave' | 'summary';

/* ── A single editable row in the grid ── */
interface GridRow {
  key: string;
  label: string;
  code: string;
  group: 'project' | 'bench' | 'overtime' | 'leave' | 'gap';
  projectId: string;
  benchCategory: string | null;
  editable: boolean;
  custom: boolean; // user-added row
}

function mStr(y: number, m: number): string { return `${y}-${String(m).padStart(2, '0')}`; }
function dayCount(y: number, m: number): number { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
function dateStr(y: number, m: number, d: number): string { return new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10); }
function dowOf(y: number, m: number, d: number): number { return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); }

export function MyTimePage(): JSX.Element {
  const { setActions } = useTitleBarActions();
  const nav = useNavigate();
  const [year, setYear] = useState(() => new Date().getUTCFullYear());
  const [month, setMonth] = useState(() => new Date().getUTCMonth() + 1);
  const [tab, setTab] = useState<Tab>('calendar');
  const [data, setData] = useState<MonthlyTimesheetResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [showOT, setShowOT] = useState(false);
  const [customRows, setCustomRows] = useState<GridRow[]>([]);
  const [localEdits, setLocalEdits] = useState<Map<string, number>>(new Map()); // key = rowKey:dateStr → hours
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetch = useCallback(() => setTick((t) => t + 1), []);
  const ms = mStr(year, month);
  const dc = dayCount(year, month);
  const STD_HOURS = 8;

  // Fetch monthly data
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void fetchMonthlyTimesheet(ms)
      .then((d) => { if (active) { setData(d); setLocalEdits(new Map()); setLoading(false); } })
      .catch((e: unknown) => { if (active) { setError(e instanceof Error ? e.message : 'Failed to load'); setLoading(false); } });
    return () => { active = false; };
  }, [ms, tick]);

  // Reset custom rows on month change
  useEffect(() => { setCustomRows([]); setLocalEdits(new Map()); }, [year, month]);

  // Title bar
  useEffect(() => {
    setActions(
      <>
        <button type="button" className="button button--secondary button--sm" onClick={() => { if (month === 1) { setYear((y) => y - 1); setMonth(12); } else setMonth((m) => m - 1); }}>{'\u25C2'} Prev</button>
        <span style={{ fontWeight: 600, fontSize: 14, minWidth: 100, textAlign: 'center' }}>{MONTH_NAMES[month - 1]} {year}</span>
        <button type="button" className="button button--secondary button--sm" onClick={() => { if (month === 12) { setYear((y) => y + 1); setMonth(1); } else setMonth((m) => m + 1); }}>Next {'\u25B8'}</button>
        <TipTrigger />
      </>
    );
    return () => setActions(null);
  }, [setActions, year, month]);

  // Derived lookups
  const holidays = useMemo(() => new Set(data?.holidays.map((h) => h.date) ?? []), [data]);
  const holidayNames = useMemo(() => new Map(data?.holidays.map((h) => [h.date, h.name]) ?? []), [data]);
  const leaveDays = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of data?.leaveDays ?? []) if (l.status === 'APPROVED') map.set(l.date, l.type);
    return map;
  }, [data]);

  // Build grid rows: projects, then bench, then overtime mirror, then leave (auto), then gap (computed)
  const gridRows = useMemo((): GridRow[] => {
    if (!data) return [];
    const rows: GridRow[] = [];

    // Project assignment rows
    for (const a of data.assignmentRows.filter((r) => !r.isBench)) {
      rows.push({ key: `proj:${a.assignmentId}`, label: a.projectName, code: a.projectCode, group: 'project', projectId: a.projectId, benchCategory: null, editable: true, custom: false });
    }

    // Custom project rows (user-added sub-lines)
    for (const cr of customRows.filter((r) => r.group === 'project')) rows.push(cr);

    // Bench rows — always show if any bench data or custom bench rows exist
    const hasBench = data.entries.some((e) => e.benchCategory) || customRows.some((r) => r.group === 'bench');
    if (hasBench || data.assignmentRows.some((r) => r.isBench)) {
      // Show each distinct bench category from entries
      const usedCategories = new Set(data.entries.filter((e) => e.benchCategory).map((e) => e.benchCategory!));
      for (const cat of usedCategories) {
        const info = BENCH_CATEGORIES.find((b) => b.code === cat);
        rows.push({ key: `bench:${cat}`, label: info?.label ?? cat, code: cat, group: 'bench', projectId: '', benchCategory: cat, editable: true, custom: false });
      }
    }
    // Custom bench rows
    for (const cr of customRows.filter((r) => r.group === 'bench')) {
      if (!rows.some((r) => r.key === cr.key)) rows.push(cr);
    }

    // Overtime rows (added via button, like project/bench)
    if (showOT) {
      for (const cr of customRows.filter((r) => r.group === 'overtime')) rows.push(cr);
    }

    return rows;
  }, [data, customRows, showOT]);

  // Get hours for a cell (from server data + local edits)
  function getCellHours(rowKey: string, ds: string): number {
    const editKey = `${rowKey}:${ds}`;
    if (localEdits.has(editKey)) return localEdits.get(editKey)!;
    if (!data) return 0;

    // Parse row key
    if (rowKey.startsWith('proj:')) {
      const assignmentId = rowKey.slice(5);
      const row = data.assignmentRows.find((a) => a.assignmentId === assignmentId);
      if (!row) return 0;
      const entry = data.entries.find((e) => e.date === ds && e.projectId === row.projectId && !e.benchCategory);
      return entry?.hours ?? 0;
    }
    if (rowKey.startsWith('bench:')) {
      const cat = rowKey.slice(6);
      const entry = data.entries.find((e) => e.date === ds && e.benchCategory === cat);
      return entry?.hours ?? 0;
    }
    if (rowKey.startsWith('ot:')) {
      // OT entries stored with a description prefix or separate — for now, no server-side OT rows
      return 0;
    }
    return 0;
  }

  // Compute day totals (all editable rows)
  function dayTotal(d: number): number {
    const ds = dateStr(year, month, d);
    let total = 0;
    for (const row of gridRows) {
      if (row.group === 'leave' || row.group === 'gap') continue;
      total += getCellHours(row.key, ds);
    }
    return Math.round(total * 10) / 10;
  }

  // Handle cell edit
  function handleCellChange(rowKey: string, ds: string, value: string): void {
    const hours = value === '' ? 0 : parseFloat(value);
    if (isNaN(hours) || hours < 0 || hours > 24) return;
    const editKey = `${rowKey}:${ds}`;
    setLocalEdits((prev) => { const next = new Map(prev); next.set(editKey, hours); return next; });

    // Debounce save
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void saveCell(rowKey, ds, hours); }, 800);
  }

  async function saveCell(rowKey: string, ds: string, hours: number): Promise<void> {
    // Determine projectId and benchCategory from rowKey
    let projectId = '';
    let benchCategory: string | undefined;

    if (rowKey.startsWith('proj:') || rowKey.startsWith('custom-proj:')) {
      const assignmentId = rowKey.replace('proj:', '').replace('custom-proj:', '');
      const row = data?.assignmentRows.find((a) => a.assignmentId === assignmentId);
      projectId = row?.projectId ?? '';
      if (!projectId) {
        // Custom project row — find from customRows
        const cr = customRows.find((r) => r.key === rowKey);
        projectId = cr?.projectId ?? '';
      }
    } else if (rowKey.startsWith('bench:') || rowKey.startsWith('custom-bench:')) {
      benchCategory = rowKey.replace('bench:', '').replace('custom-bench:', '');
      // Use the first project or a bench project
      projectId = data?.assignmentRows[0]?.projectId ?? '';
    } else if (rowKey.startsWith('ot:')) {
      const assignmentId = rowKey.slice(3);
      const row = data?.assignmentRows.find((a) => a.assignmentId === assignmentId);
      projectId = row?.projectId ?? '';
    }

    if (!projectId) return;

    // Calculate the Monday of the week containing this date
    const date = new Date(ds);
    const dow = date.getUTCDay();
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(date);
    monday.setUTCDate(monday.getUTCDate() + mondayOffset);
    const weekStart = monday.toISOString().slice(0, 10);

    try {
      await upsertTimesheetEntry({ weekStart, date: ds, projectId, hours, capex: false });
    } catch {
      toast.error('Failed to save entry');
    }
  }

  // Add custom row
  function addCustomRow(group: 'project' | 'bench' | 'overtime'): void {
    if (group === 'bench') {
      const unused = BENCH_CATEGORIES.filter((b) => !gridRows.some((r) => r.benchCategory === b.code));
      if (unused.length === 0) { toast.info('All bench categories already added'); return; }
      const choice = unused[0];
      setCustomRows((prev) => [...prev, {
        key: `custom-bench:${choice.code}`,
        label: choice.label,
        code: choice.code,
        group: 'bench',
        projectId: data?.assignmentRows[0]?.projectId ?? '',
        benchCategory: choice.code,
        editable: true,
        custom: true,
      }]);
    } else if (group === 'overtime') {
      // OT rows — pick any assignment (project or bench) to add overtime for
      const allAssignments = data?.assignmentRows ?? [];
      const alreadyAdded = new Set(customRows.filter((r) => r.group === 'overtime').map((r) => r.key));
      // Project assignments first, then bench
      const projAvailable = allAssignments.filter((a) => !a.isBench && !alreadyAdded.has(`ot:${a.assignmentId}`));
      const benchAvailable = !alreadyAdded.has('ot:bench');

      if (projAvailable.length > 0) {
        const choice = projAvailable[0];
        setCustomRows((prev) => [...prev, {
          key: `ot:${choice.assignmentId}`,
          label: `OT: ${choice.projectName}`,
          code: choice.projectCode,
          group: 'overtime',
          projectId: choice.projectId,
          benchCategory: null,
          editable: true,
          custom: true,
        }]);
      } else if (benchAvailable) {
        setCustomRows((prev) => [...prev, {
          key: 'ot:bench',
          label: 'OT: Bench / Internal',
          code: 'OT-BENCH',
          group: 'overtime',
          projectId: allAssignments[0]?.projectId ?? '',
          benchCategory: 'BENCH-ADM',
          editable: true,
          custom: true,
        }]);
      } else {
        toast.info('All overtime lines already added');
        return;
      }
    } else {
      const label = prompt('Work line description (e.g., "Bug fixes", "Documentation"):');
      if (!label) return;
      const projRow = data?.assignmentRows.find((r) => !r.isBench);
      if (!projRow) { toast.error('No project assignment found'); return; }
      setCustomRows((prev) => [...prev, {
        key: `custom-proj:${projRow.assignmentId}-${Date.now()}`,
        label,
        code: projRow.projectCode,
        group: 'project',
        projectId: projRow.projectId,
        benchCategory: null,
        editable: true,
        custom: true,
      }]);
    }
  }

  // Actions
  async function handleAutoFill(): Promise<void> {
    try {
      const result = await autoFillMonth(ms);
      toast.success(`Filled ${result.filledDays} days (${result.filledHours}h)`);
      refetch();
    } catch { toast.error('Auto-fill failed'); }
  }

  async function handleCopyPrevious(): Promise<void> {
    try {
      const result = await copyPreviousMonth(ms);
      toast.success(`Copied ${result.copiedDays} days (${result.copiedHours}h)`);
      refetch();
    } catch { toast.error('Copy failed'); }
  }


  const s = data?.summary;

  // Cell style helper
  function cellBg(d: number): string | undefined {
    const ds = dateStr(year, month, d);
    const dow = dowOf(year, month, d);
    if (dow === 0 || dow === 6) return 'var(--color-border)';
    if (holidays.has(ds)) return 'color-mix(in srgb, var(--color-status-info) 12%, var(--color-surface))';
    if (leaveDays.has(ds)) return 'color-mix(in srgb, var(--color-chart-1) 10%, var(--color-surface))';
    return undefined;
  }

  function isWorkingDay(d: number): boolean {
    const dow = dowOf(year, month, d);
    if (dow === 0 || dow === 6) return false;
    const ds = dateStr(year, month, d);
    return !holidays.has(ds);
  }

  function isDayEditable(d: number): boolean {
    if (!isWorkingDay(d)) return false;
    const ds = dateStr(year, month, d);
    if (leaveDays.has(ds)) return false;
    // Check week status
    const date = new Date(Date.UTC(year, month - 1, d));
    const weekStatus = data?.weeks.find((w) => {
      const ws = new Date(w.weekStart);
      return date >= ws && date < new Date(ws.getTime() + 7 * 86400000);
    })?.status;
    return !weekStatus || weekStatus === 'DRAFT';
  }

  return (
    <PageContainer testId="my-time-page">
      {loading ? <LoadingState label="Loading your timesheet..." variant="skeleton" skeletonType="page" /> : null}
      {error ? <ErrorState description={error} /> : null}

      {data && s ? (
        <>
          {/* ── KPI Strip ── */}
          <div className="kpi-strip" aria-label="Monthly summary">
            <div className="kpi-strip__item" style={{ borderLeft: '3px solid var(--color-status-active)' }}>
              <span className="kpi-strip__value">{s.reportedHours}h</span>
              <span className="kpi-strip__label">Reported</span>
              <span className="kpi-strip__context" style={{ color: 'var(--color-text-muted)' }}>of {s.expectedHours}h expected</span>
            </div>
            <div className="kpi-strip__item" style={{ borderLeft: `3px solid ${s.overtimeHours > 0 ? 'var(--color-status-warning)' : 'var(--color-status-active)'}` }}>
              <span className="kpi-strip__value">{s.overtimeHours}h</span>
              <span className="kpi-strip__label">Overtime</span>
            </div>
            <div className="kpi-strip__item" style={{ borderLeft: `3px solid ${s.leaveHours > 0 ? 'var(--color-chart-1)' : 'var(--color-status-neutral)'}` }}>
              <span className="kpi-strip__value">{s.leaveHours}h</span>
              <span className="kpi-strip__label">Leave</span>
            </div>
            <div className="kpi-strip__item" style={{ borderLeft: `3px solid ${s.benchHours > 0 ? 'var(--color-status-neutral)' : 'var(--color-status-active)'}` }}>
              <span className="kpi-strip__value">{s.benchHours}h</span>
              <span className="kpi-strip__label">Bench</span>
            </div>
            <div className="kpi-strip__item" style={{ borderLeft: `3px solid ${s.gapDays > 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)'}` }}>
              <span className="kpi-strip__value">{s.gapDays}</span>
              <span className="kpi-strip__label">Gap Days</span>
              <span className="kpi-strip__context" style={{ color: 'var(--color-text-muted)' }}>{s.gapHours}h missing</span>
            </div>
            <div className="kpi-strip__item" style={{ borderLeft: `3px solid ${s.utilizationPercent >= 90 ? 'var(--color-status-active)' : s.utilizationPercent >= 70 ? 'var(--color-status-warning)' : 'var(--color-status-danger)'}` }}>
              <span className="kpi-strip__value">{s.utilizationPercent}%</span>
              <span className="kpi-strip__label">Utilization</span>
              <div className="kpi-strip__progress"><div className="kpi-strip__progress-fill" style={{ width: `${Math.min(s.utilizationPercent, 100)}%`, background: s.utilizationPercent >= 90 ? 'var(--color-status-active)' : 'var(--color-status-warning)' }} /></div>
            </div>
          </div>

          {/* ── Action bar ── */}
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="button" className="button button--secondary button--sm" onClick={handleAutoFill}>Fill from Assignments</button>
            <button type="button" className="button button--secondary button--sm" onClick={handleCopyPrevious}>Copy Last Month</button>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer', marginLeft: 'var(--space-2)' }}>
              <input type="checkbox" checked={showOT} onChange={(e) => setShowOT(e.target.checked)} />
              <span style={{ color: showOT ? 'var(--color-status-warning)' : 'var(--color-text-muted)', fontWeight: showOT ? 600 : 400 }}>Overtime Rows</span>
            </label>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
              {(['calendar', 'leave', 'summary'] as Tab[]).map((t) => (
                <button key={t} type="button" className={`button button--sm ${tab === t ? 'button--primary' : 'button--secondary'}`} onClick={() => setTab(t)}>
                  {{ calendar: 'Calendar', leave: 'Leave', summary: 'Summary' }[t]}
                </button>
              ))}
            </div>
          </div>

          {/* ── CALENDAR TAB ── */}
          {tab === 'calendar' && (
            <div style={{ overflow: 'auto' }}>
              <table className="dash-compact-table" style={{ minWidth: dc * 34 + 220, fontSize: 11, borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ position: 'sticky', left: 0, background: 'var(--color-surface-alt)', zIndex: 3, minWidth: 200, borderRight: '2px solid var(--color-border)' }}>Work Line</th>
                    {Array.from({ length: dc }, (_, i) => {
                      const d = i + 1;
                      const dow = dowOf(year, month, d);
                      const ds = dateStr(year, month, d);
                      const isWE = dow === 0 || dow === 6;
                      const isH = holidays.has(ds);
                      return (
                        <th key={d} style={{ width: 32, textAlign: 'center', background: isWE ? 'var(--color-border)' : isH ? 'color-mix(in srgb, var(--color-status-info) 20%, var(--color-surface-alt))' : 'var(--color-surface-alt)', padding: '1px 0', fontSize: 9 }}
                          title={isH ? holidayNames.get(ds) ?? '' : ''}>
                          <div>{DAY_ABBR[dow === 0 ? 7 : dow]}</div>
                          <div style={{ fontSize: 10, fontWeight: 600 }}>{d}</div>
                        </th>
                      );
                    })}
                    <th style={{ ...NUM, minWidth: 44, background: 'var(--color-surface-alt)' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {/* ── PROJECT ROWS ── */}
                  {gridRows.filter((r) => r.group === 'project').length > 0 && (
                    <tr><td colSpan={dc + 2} style={{ background: 'var(--color-surface-alt)', fontWeight: 700, fontSize: 10, padding: '4px 8px', color: 'var(--color-text-muted)', letterSpacing: '0.05em', position: 'sticky', left: 0 }}>
                      PROJECT TIME
                      <button type="button" onClick={() => addCustomRow('project')} style={{ marginLeft: 8, fontSize: 9, background: 'none', border: '1px dashed var(--color-border)', borderRadius: 3, padding: '1px 6px', cursor: 'pointer', color: 'var(--color-accent)' }}>+ Add Line</button>
                    </td></tr>
                  )}
                  {gridRows.filter((r) => r.group === 'project').map((row) => {
                    let rowTotal = 0;
                    return (
                      <tr key={row.key}>
                        <td style={{ position: 'sticky', left: 0, background: 'var(--color-surface)', zIndex: 1, whiteSpace: 'nowrap', borderRight: '2px solid var(--color-border)' }}>
                          <span style={{ color: 'var(--color-text-muted)', fontSize: 9, marginRight: 4 }}>{row.code}</span>
                          <span style={{ fontWeight: 500 }}>{row.label}</span>
                          {row.custom && <span style={{ fontSize: 8, color: 'var(--color-accent)', marginLeft: 4 }}>custom</span>}
                        </td>
                        {Array.from({ length: dc }, (_, i) => {
                          const d = i + 1;
                          const ds = dateStr(year, month, d);
                          const hours = getCellHours(row.key, ds);
                          rowTotal += hours;
                          const editable = isDayEditable(d) && row.editable;
                          const hasLeave = leaveDays.has(ds);
                          return (
                            <td key={d} style={{ textAlign: 'center', padding: 0, background: cellBg(d) }}>
                              {hasLeave ? (
                                <span style={{ fontSize: 8, color: 'var(--color-chart-1)' }} title={LEAVE_LABELS[leaveDays.get(ds)!] ?? ''}>{LEAVE_LABELS[leaveDays.get(ds)!]?.charAt(0) ?? 'L'}</span>
                              ) : !isWorkingDay(d) ? (
                                <span style={{ color: 'var(--color-text-subtle)', fontSize: 9 }}>{'\u2013'}</span>
                              ) : editable ? (
                                <input
                                  type="text" inputMode="decimal"
                                  value={hours || ''}
                                  onChange={(e) => handleCellChange(row.key, ds, e.target.value)}
                                  style={{ width: 30, height: 22, textAlign: 'center', border: 'none', background: 'transparent', fontSize: 11, fontVariantNumeric: 'tabular-nums', outline: 'none', padding: 0 }}
                                  onFocus={(e) => e.target.select()}
                                />
                              ) : (
                                <span style={{ fontSize: 11, ...NUM }}>{hours || ''}</span>
                              )}
                            </td>
                          );
                        })}
                        <td style={{ ...NUM, fontWeight: 600, fontSize: 11 }}>{rowTotal > 0 ? `${Math.round(rowTotal * 10) / 10}` : ''}</td>
                      </tr>
                    );
                  })}

                  {/* ── BENCH ROWS ── */}
                  <tr><td colSpan={dc + 2} style={{ background: 'var(--color-surface-alt)', fontWeight: 700, fontSize: 10, padding: '4px 8px', color: 'var(--color-text-muted)', letterSpacing: '0.05em', position: 'sticky', left: 0 }}>
                    BENCH TIME
                    <button type="button" onClick={() => addCustomRow('bench')} style={{ marginLeft: 8, fontSize: 9, background: 'none', border: '1px dashed var(--color-border)', borderRadius: 3, padding: '1px 6px', cursor: 'pointer', color: 'var(--color-accent)' }}>+ Add Line</button>
                  </td></tr>
                  {gridRows.filter((r) => r.group === 'bench').map((row) => {
                    let rowTotal = 0;
                    return (
                      <tr key={row.key}>
                        <td style={{ position: 'sticky', left: 0, background: 'var(--color-surface)', zIndex: 1, whiteSpace: 'nowrap', borderRight: '2px solid var(--color-border)', paddingLeft: 16 }}>
                          <span style={{ color: 'var(--color-status-neutral)', fontSize: 9, marginRight: 4 }}>{'\u25CB'}</span>
                          <span>{row.label}</span>
                        </td>
                        {Array.from({ length: dc }, (_, i) => {
                          const d = i + 1;
                          const ds = dateStr(year, month, d);
                          const hours = getCellHours(row.key, ds);
                          rowTotal += hours;
                          const editable = isDayEditable(d);
                          return (
                            <td key={d} style={{ textAlign: 'center', padding: 0, background: cellBg(d) }}>
                              {!isWorkingDay(d) || leaveDays.has(ds) ? (
                                <span style={{ color: 'var(--color-text-subtle)', fontSize: 9 }}>{'\u2013'}</span>
                              ) : editable ? (
                                <input type="text" inputMode="decimal" value={hours || ''} onChange={(e) => handleCellChange(row.key, ds, e.target.value)}
                                  style={{ width: 30, height: 22, textAlign: 'center', border: 'none', background: 'transparent', fontSize: 11, fontVariantNumeric: 'tabular-nums', outline: 'none', padding: 0 }}
                                  onFocus={(e) => e.target.select()} />
                              ) : (
                                <span style={{ fontSize: 11, ...NUM }}>{hours || ''}</span>
                              )}
                            </td>
                          );
                        })}
                        <td style={{ ...NUM, fontWeight: 600, fontSize: 11 }}>{rowTotal > 0 ? `${Math.round(rowTotal * 10) / 10}` : ''}</td>
                      </tr>
                    );
                  })}
                  {gridRows.filter((r) => r.group === 'bench').length === 0 && (
                    <tr><td colSpan={dc + 2} style={{ color: 'var(--color-text-subtle)', fontSize: 10, fontStyle: 'italic', paddingLeft: 16 }}>No bench lines — click "+ Add Line" above</td></tr>
                  )}

                  {/* ── OVERTIME ROWS (toggle-controlled) ── */}
                  {showOT && (
                    <>
                      <tr><td colSpan={dc + 2} style={{ background: 'color-mix(in srgb, var(--color-status-warning) 10%, var(--color-surface-alt))', fontWeight: 700, fontSize: 10, padding: '4px 8px', color: 'var(--color-status-warning)', letterSpacing: '0.05em', position: 'sticky', left: 0 }}>
                        OVERTIME (exception-based approval)
                        <button type="button" onClick={() => addCustomRow('overtime')} style={{ marginLeft: 8, fontSize: 9, background: 'none', border: '1px dashed var(--color-status-warning)', borderRadius: 3, padding: '1px 6px', cursor: 'pointer', color: 'var(--color-status-warning)' }}>+ Add OT Line</button>
                      </td></tr>
                      {gridRows.filter((r) => r.group === 'overtime').map((row) => {
                        let rowTotal = 0;
                        return (
                          <tr key={row.key} style={{ background: 'color-mix(in srgb, var(--color-status-warning) 4%, transparent)' }}>
                            <td style={{ position: 'sticky', left: 0, background: 'color-mix(in srgb, var(--color-status-warning) 4%, var(--color-surface))', zIndex: 1, whiteSpace: 'nowrap', borderRight: '2px solid var(--color-border)' }}>
                              <span style={{ color: 'var(--color-status-warning)', fontSize: 9, marginRight: 4 }}>{'\u25B2'}</span>
                              <span>{row.label}</span>
                            </td>
                            {Array.from({ length: dc }, (_, i) => {
                              const d = i + 1;
                              const ds = dateStr(year, month, d);
                              const hours = getCellHours(row.key, ds);
                              rowTotal += hours;
                              const editable = isDayEditable(d);
                              return (
                                <td key={d} style={{ textAlign: 'center', padding: 0, background: isWorkingDay(d) ? 'color-mix(in srgb, var(--color-status-warning) 4%, transparent)' : 'var(--color-border)' }}>
                                  {!isWorkingDay(d) ? <span style={{ color: 'var(--color-text-subtle)', fontSize: 9 }}>{'\u2013'}</span> : editable ? (
                                    <input type="text" inputMode="decimal" value={hours || ''} onChange={(e) => handleCellChange(row.key, ds, e.target.value)}
                                      style={{ width: 30, height: 22, textAlign: 'center', border: 'none', background: 'transparent', fontSize: 11, fontVariantNumeric: 'tabular-nums', outline: 'none', padding: 0, color: 'var(--color-status-warning)' }}
                                      onFocus={(e) => e.target.select()} />
                                  ) : <span style={{ fontSize: 11, ...NUM, color: 'var(--color-status-warning)' }}>{hours || ''}</span>}
                                </td>
                              );
                            })}
                            <td style={{ ...NUM, fontWeight: 600, fontSize: 11, color: 'var(--color-status-warning)' }}>{rowTotal > 0 ? `${Math.round(rowTotal * 10) / 10}` : ''}</td>
                          </tr>
                        );
                      })}
                      {gridRows.filter((r) => r.group === 'overtime').length === 0 && (
                        <tr><td colSpan={dc + 2} style={{ color: 'var(--color-text-subtle)', fontSize: 10, fontStyle: 'italic', paddingLeft: 16, background: 'color-mix(in srgb, var(--color-status-warning) 2%, transparent)' }}>No overtime lines — click "+ Add OT Line" to report overtime hours</td></tr>
                      )}
                    </>
                  )}

                  {/* ── LEAVE ROW (auto-populated, read-only) ── */}
                  {Array.from(new Set(data.leaveDays.filter((l) => l.status === 'APPROVED').map((l) => l.type))).map((type) => (
                    <tr key={`leave-${type}`} style={{ background: 'color-mix(in srgb, var(--color-chart-1) 4%, transparent)' }}>
                      <td style={{ position: 'sticky', left: 0, background: 'color-mix(in srgb, var(--color-chart-1) 4%, var(--color-surface))', zIndex: 1, whiteSpace: 'nowrap', borderRight: '2px solid var(--color-border)' }}>
                        <span style={{ color: 'var(--color-chart-1)', fontSize: 9, marginRight: 4 }}>{'\u25A0'}</span>
                        <span style={{ color: 'var(--color-chart-1)' }}>{LEAVE_LABELS[type] ?? type}</span>
                      </td>
                      {Array.from({ length: dc }, (_, i) => {
                        const d = i + 1;
                        const ds = dateStr(year, month, d);
                        const isThisLeave = data.leaveDays.some((l) => l.date === ds && l.type === type && l.status === 'APPROVED');
                        return (
                          <td key={d} style={{ textAlign: 'center', padding: 0, background: isThisLeave ? 'color-mix(in srgb, var(--color-chart-1) 15%, transparent)' : cellBg(d) }}>
                            {isThisLeave ? <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-chart-1)' }}>{STD_HOURS}</span> : ''}
                          </td>
                        );
                      })}
                      <td style={{ ...NUM, fontWeight: 600, fontSize: 11, color: 'var(--color-chart-1)' }}>
                        {data.leaveDays.filter((l) => l.type === type && l.status === 'APPROVED').length * STD_HOURS}
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* ── FOOTER: Day total + Gap row ── */}
                <tfoot>
                  <tr style={{ fontWeight: 600 }}>
                    <td style={{ position: 'sticky', left: 0, background: 'var(--color-surface-alt)', zIndex: 2, borderRight: '2px solid var(--color-border)', fontSize: 10 }}>Day Total</td>
                    {Array.from({ length: dc }, (_, i) => {
                      const d = i + 1;
                      const dt = dayTotal(d);
                      const dow = dowOf(year, month, d);
                      const isWE = dow === 0 || dow === 6;
                      return (
                        <td key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, background: isWE ? 'var(--color-border)' : 'var(--color-surface-alt)', color: dt > 0 ? 'var(--color-text)' : 'var(--color-text-subtle)' }}>
                          {isWE ? '' : dt > 0 ? dt : ''}
                        </td>
                      );
                    })}
                    <td style={{ ...NUM, fontWeight: 700, fontSize: 11, background: 'var(--color-surface-alt)' }}>{s.reportedHours}</td>
                  </tr>
                  {/* GAP ROW — fixed, non-editable, auto-calculated */}
                  <tr style={{ background: 'color-mix(in srgb, var(--color-status-danger) 5%, transparent)' }}>
                    <td style={{ position: 'sticky', left: 0, background: 'color-mix(in srgb, var(--color-status-danger) 5%, var(--color-surface))', zIndex: 2, borderRight: '2px solid var(--color-border)', fontSize: 10, fontWeight: 600, color: 'var(--color-status-danger)' }}>Gap</td>
                    {Array.from({ length: dc }, (_, i) => {
                      const d = i + 1;
                      const ds = dateStr(year, month, d);
                      if (!isWorkingDay(d) || leaveDays.has(ds)) return <td key={d} style={{ background: cellBg(d) }} />;
                      const dt = dayTotal(d);
                      const gap = STD_HOURS - dt;
                      return (
                        <td key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: gap > 0 ? 700 : 400, color: gap > 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)', background: gap > 0 ? 'color-mix(in srgb, var(--color-status-danger) 8%, transparent)' : undefined }}>
                          {gap > 0 ? `-${gap}` : gap === 0 ? '\u2713' : ''}
                        </td>
                      );
                    })}
                    <td style={{ ...NUM, fontWeight: 700, fontSize: 11, color: s.gapHours > 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)' }}>{s.gapHours > 0 ? `-${s.gapHours}` : '\u2713'}</td>
                  </tr>
                </tfoot>
              </table>

              {/* Week status + submit controls */}
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
                {data.weeks.map((w) => {
                  const statusColor = w.status === 'APPROVED' ? 'var(--color-status-active)' : w.status === 'SUBMITTED' ? 'var(--color-status-warning)' : w.status === 'REJECTED' ? 'var(--color-status-danger)' : 'var(--color-border)';
                  return (
                    <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 'var(--radius-control)', border: `2px solid ${statusColor}`, background: `color-mix(in srgb, ${statusColor} 6%, var(--color-surface))`, fontSize: 11 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
                      <span style={{ fontWeight: 500 }}>Week of {w.weekStart}</span>
                      {w.status === 'DRAFT' && (
                        <button type="button" className="button button--primary button--sm" style={{ fontSize: 10, marginLeft: 4 }}
                          onClick={async () => {
                            try {
                              if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
                              // Flush any pending edits for this week
                              for (const [editKey, hrs] of localEdits) {
                                const [, ds] = editKey.split(':').length > 2 ? [editKey.substring(0, editKey.lastIndexOf(':')), editKey.substring(editKey.lastIndexOf(':') + 1)] : editKey.split(':');
                                if (!ds) continue;
                                const d = new Date(ds);
                                const wkStart = new Date(w.weekStart);
                                if (d >= wkStart && d < new Date(wkStart.getTime() + 7 * 86400000)) {
                                  const rk = editKey.substring(0, editKey.lastIndexOf(':'));
                                  await saveCell(rk, ds, hrs);
                                }
                              }
                              await submitTimesheetWeek(w.weekStart);
                              toast.success(`Week of ${w.weekStart} submitted`);
                              refetch();
                            } catch { toast.error('Submit failed'); }
                          }}>
                          Submit
                        </button>
                      )}
                      {w.status === 'SUBMITTED' && (
                        <span style={{ color: 'var(--color-status-warning)', fontWeight: 600, fontSize: 10 }}>Pending approval</span>
                      )}
                      {w.status === 'APPROVED' && (
                        <span style={{ color: 'var(--color-status-active)', fontWeight: 600, fontSize: 10 }}>{'\u2713'} Approved</span>
                      )}
                      {w.status === 'REJECTED' && (
                        <>
                          <span style={{ color: 'var(--color-status-danger)', fontWeight: 600, fontSize: 10 }}>Rejected — edit and resubmit</span>
                          <button type="button" className="button button--primary button--sm" style={{ fontSize: 10, marginLeft: 4 }}
                            onClick={async () => {
                              try {
                                if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
                                await submitTimesheetWeek(w.weekStart);
                                toast.success(`Week of ${w.weekStart} resubmitted`);
                                refetch();
                              } catch { toast.error('Resubmit failed'); }
                            }}>
                            Resubmit
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── LEAVE TAB ── */}
          {tab === 'leave' && (
            <SectionCard title="Leave Requests">
              {data.leaveDays.length > 0 ? (
                <table className="dash-compact-table">
                  <thead><tr><th>Date</th><th>Type</th><th>Status</th></tr></thead>
                  <tbody>
                    {data.leaveDays.map((l, i) => (
                      <tr key={i}>
                        <td>{l.date}</td>
                        <td><StatusBadge label={LEAVE_LABELS[l.type] ?? l.type} size="small" tone={l.type === 'SICK' ? 'danger' : l.type === 'ANNUAL' ? 'info' : 'neutral'} /></td>
                        <td><StatusBadge label={l.status} size="small" tone={l.status === 'APPROVED' ? 'active' : l.status === 'PENDING' ? 'warning' : 'danger'} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState title="No leave" description="No leave requests for this month." />
              )}
              <div style={{ marginTop: 'var(--space-3)' }}>
                <button type="button" className="button button--primary button--sm" onClick={() => nav('/leave')}>+ New Leave Request</button>
              </div>
            </SectionCard>
          )}

          {/* ── SUMMARY TAB ── */}
          {tab === 'summary' && (
            <SectionCard title="Monthly Summary">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <table className="dash-compact-table">
                  <tbody>
                    <tr><td>Working Days</td><td style={NUM}>{s.workingDays}</td></tr>
                    <tr><td>Expected Hours</td><td style={NUM}>{s.expectedHours}h</td></tr>
                    <tr><td>Reported Hours</td><td style={{ ...NUM, fontWeight: 600 }}>{s.reportedHours}h</td></tr>
                    <tr><td style={{ paddingLeft: 16 }}>Standard</td><td style={NUM}>{s.standardHours}h</td></tr>
                    <tr><td style={{ paddingLeft: 16 }}>Overtime</td><td style={{ ...NUM, color: s.overtimeHours > 0 ? 'var(--color-status-warning)' : undefined }}>{s.overtimeHours}h</td></tr>
                    <tr><td style={{ paddingLeft: 16 }}>Leave</td><td style={NUM}>{s.leaveHours}h</td></tr>
                    <tr><td style={{ paddingLeft: 16 }}>Bench</td><td style={NUM}>{s.benchHours}h</td></tr>
                    <tr><td>Gap</td><td style={{ ...NUM, color: s.gapHours > 0 ? 'var(--color-status-danger)' : undefined, fontWeight: 600 }}>{s.gapHours}h ({s.gapDays} days)</td></tr>
                    <tr><td>Utilization</td><td style={{ ...NUM, fontWeight: 600 }}>{s.utilizationPercent}%</td></tr>
                  </tbody>
                </table>
                <div style={{ height: Math.max(180, s.byProject.length * 32 + 40) }}>
                  {s.byProject.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={s.byProject} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}h`} />
                        <YAxis type="category" dataKey="projectCode" tick={{ fontSize: 10 }} width={70} axisLine={false} tickLine={false} />
                        <Tooltip formatter={(v) => `${v}h`} />
                        <Bar dataKey="hours" name="Hours" radius={[0, 3, 3, 0]}>
                          {s.byProject.map((p, i) => (
                            <Cell key={i} fill={p.projectCode === 'BENCH' ? 'var(--color-status-neutral)' : `var(--color-chart-${(i % 8) + 1})`} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState title="No data" description="No hours reported." />
                  )}
                </div>
              </div>
            </SectionCard>
          )}

          {/* ── Data Freshness ── */}
          <div className="data-freshness">
            {MONTH_NAMES[month - 1]} {year} · {s.workingDays} working days · {data.holidays.length} holidays
            <button type="button" className="button button--secondary button--sm" onClick={refetch} style={{ marginLeft: 'var(--space-2)' }}>{'\u21bb'} Refresh</button>
          </div>
        </>
      ) : null}
    </PageContainer>
  );
}
