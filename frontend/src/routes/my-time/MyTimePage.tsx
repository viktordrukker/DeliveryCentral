import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';

import { useTitleBarActions } from '@/app/title-bar-context';
import { usePlatformSettings } from '@/app/platform-settings-context';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { TipTrigger } from '@/components/common/TipBalloon';
import {
  fetchMonthlyTimesheet,
  autoFillMonth,
  copyPreviousMonth,
  renameMyTimeRow,
  deleteMyTimeRow,
  type MonthlyTimesheetResponse,
} from '@/lib/api/my-time';
import {
  upsertTimesheetEntry,
  submitTimesheetWeek,
  revokeTimesheetWeek,
  resetTimesheetWeek,
} from '@/lib/api/timesheets';
import { Button, DescriptionList, type DescriptionListItem, Table, type Column } from '@/components/ds';

const NUM = { fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const };
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_ABBR = ['', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']; // index 0 unused, 1=Mon..7=Sun
// Sentinel projectId for bench entries — bench has no project at the domain level,
// but the DB column is non-null, so we route bench rows through a fixed nil-style UUID.
// This makes bench self-contained: a person with zero project assignments can still log bench hours.
const BENCH_PROJECT_ID = '00000000-0000-0000-0000-000000000000';

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
  benchCategory: string;     // '' for non-bench rows
  workLabel: string;         // '' for project auto rows and bench rows; user text for project-custom rows
  /** Project this row sits under in the hierarchy (for grouping). */
  parentProjectId: string | null;
  editable: boolean;
  custom: boolean; // user-added row (no server entry yet)
}

function mStr(y: number, m: number): string { return `${y}-${String(m).padStart(2, '0')}`; }
function dayCount(y: number, m: number): number { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
function dateStr(y: number, m: number, d: number): string { return new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10); }
function dowOf(y: number, m: number, d: number): number { return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); }

export function MyTimePage(): JSX.Element {
  const { setActions } = useTitleBarActions();
  const { settings: platform } = usePlatformSettings();
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

  // Time-entry validation rules (loaded from platform settings).
  const allowSubmitInAdvance = platform?.timeEntry?.allowSubmitInAdvance ?? false;
  const allowFutureDateEntry = platform?.timeEntry?.allowFutureDateEntry ?? false;
  const maxHoursPerDay = platform?.timeEntry?.maxHoursPerDay ?? 12;
  const maxHoursPerWeek = platform?.timeEntry?.maxHoursPerWeek ?? 60;
  const todayStr = new Date().toISOString().slice(0, 10);

  // Confirms for week-level destructive actions.
  const [resetCandidate, setResetCandidate] = useState<{ weekStart: string } | null>(null);
  const [revokeCandidate, setRevokeCandidate] = useState<{ weekStart: string } | null>(null);
  // Inline add — when set, an `add-draft` row appears in place of its trigger.
  const [draftLine, setDraftLine] = useState<
    | { scope: 'bench' }
    | { scope: 'overtime' }
    | { scope: 'project'; projectId: string }
    | null
  >(null);
  const [draftLabel, setDraftLabel] = useState('');
  // Inline label edit — when set, that row's label cell renders as <input>.
  const [editingRowKey, setEditingRowKey] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  // Delete confirm.
  const [deleteCandidate, setDeleteCandidate] = useState<
    | { rowKey: string; label: string; kind: 'BENCH' | 'WORK_LABEL'; projectId?: string; persistedHours: number }
    | null
  >(null);

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
        <Button size="sm" variant="secondary" onClick={() => { if (month === 1) { setYear((y) => y - 1); setMonth(12); } else setMonth((m) => m - 1); }}>{'\u25C2'} Prev</Button>
        <span style={{ fontWeight: 600, fontSize: 14, minWidth: 100, textAlign: 'center' }}>{MONTH_NAMES[month - 1]} {year}</span>
        <Button size="sm" variant="secondary" onClick={() => { if (month === 12) { setYear((y) => y + 1); setMonth(1); } else setMonth((m) => m + 1); }}>Next {'\u25B8'}</Button>
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

  // Build grid rows: project auto + project-custom (under parent) + bench + overtime + leave (auto).
  // Each row's identity tuple is (projectId, benchCategory, workLabel) — matches the DB unique key.
  const gridRows = useMemo((): GridRow[] => {
    if (!data) return [];
    const rows: GridRow[] = [];

    // Collapse multiple assignments to the same project into one auto row per project.
    const projectAssignmentSeen = new Set<string>();
    for (const a of data.assignmentRows.filter((r) => !r.isBench)) {
      if (projectAssignmentSeen.has(a.projectId)) continue;
      projectAssignmentSeen.add(a.projectId);
      rows.push({
        key: `proj:${a.projectId}`,
        label: a.projectName, code: a.projectCode,
        group: 'project', projectId: a.projectId,
        benchCategory: '', workLabel: '',
        parentProjectId: a.projectId,
        editable: true, custom: false,
      });
    }

    // Project-custom rows (user-added work-label rows under a specific project).
    // Server-derived: any entry with workLabel != '' becomes a row keyed by (projectId, workLabel).
    const wlblKeys = new Set<string>();
    for (const e of data.entries) {
      if (!e.workLabel) continue;
      const key = `wlbl:${e.projectId}:${e.workLabel}`;
      if (wlblKeys.has(key)) continue;
      wlblKeys.add(key);
      rows.push({
        key, label: e.workLabel, code: e.projectCode,
        group: 'project', projectId: e.projectId,
        benchCategory: '', workLabel: e.workLabel,
        parentProjectId: e.projectId,
        editable: true, custom: false,
      });
    }
    for (const cr of customRows.filter((r) => r.group === 'project' && r.workLabel.length > 0)) {
      if (!wlblKeys.has(cr.key)) rows.push(cr);
    }

    // Bench rows — labels live in `benchCategory` on entries.
    // Bench has no project; storage uses BENCH_PROJECT_ID sentinel so the DB column stays non-null.
    const benchKeys = new Set<string>();
    for (const e of data.entries) {
      if (!e.benchCategory) continue;
      const key = `bench:${e.benchCategory}`;
      if (benchKeys.has(key)) continue;
      benchKeys.add(key);
      rows.push({
        key, label: e.benchCategory, code: e.benchCategory,
        group: 'bench', projectId: BENCH_PROJECT_ID,
        benchCategory: e.benchCategory, workLabel: '',
        parentProjectId: null,
        editable: true, custom: false,
      });
    }
    for (const cr of customRows.filter((r) => r.group === 'bench')) {
      if (!benchKeys.has(cr.key)) rows.push(cr);
    }

    // Overtime rows (added via button, like project/bench).
    if (showOT) {
      for (const cr of customRows.filter((r) => r.group === 'overtime')) rows.push(cr);
    }

    return rows;
  }, [data, customRows, showOT]);

  // Resolve a row's (projectId, benchCategory, workLabel) identity. Returns null
  // for non-data rows (overtime placeholder rows that have no server entry path).
  function rowIdentity(rowKey: string): { projectId: string; benchCategory: string; workLabel: string } | null {
    const row = gridRows.find((r) => r.key === rowKey);
    if (!row) return null;
    return { projectId: row.projectId, benchCategory: row.benchCategory, workLabel: row.workLabel };
  }

  // Get hours for a cell (from server data + local edits).
  function getCellHours(rowKey: string, ds: string): number {
    const editKey = `${rowKey}:${ds}`;
    if (localEdits.has(editKey)) return localEdits.get(editKey)!;
    if (!data) return 0;
    if (rowKey.startsWith('ot:')) return 0; // overtime is UI-only today
    const id = rowIdentity(rowKey);
    if (!id) return 0;
    const entry = data.entries.find(
      (e) =>
        e.date === ds &&
        e.projectId === id.projectId &&
        e.benchCategory === id.benchCategory &&
        e.workLabel === id.workLabel,
    );
    return entry?.hours ?? 0;
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
    const raw = value === '' ? 0 : parseFloat(value);
    if (isNaN(raw) || raw < 0) return;
    if (raw > maxHoursPerDay) {
      toast.warning(`Daily cap is ${maxHoursPerDay}h — value clamped.`);
    }
    const hours = Math.min(raw, maxHoursPerDay);
    const editKey = `${rowKey}:${ds}`;
    setLocalEdits((prev) => { const next = new Map(prev); next.set(editKey, hours); return next; });

    // Debounce save
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void saveCell(rowKey, ds, hours); }, 800);
  }

  async function saveCell(rowKey: string, ds: string, hours: number): Promise<void> {
    const id = rowIdentity(rowKey);
    if (!id || !id.projectId) {
      toast.error('Cannot save — no project to bind this row to.');
      return;
    }

    // Calculate the Monday of the week containing this date.
    const date = new Date(ds);
    const dow = date.getUTCDay();
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(date);
    monday.setUTCDate(monday.getUTCDate() + mondayOffset);
    const weekStart = monday.toISOString().slice(0, 10);

    try {
      await upsertTimesheetEntry({
        weekStart,
        date: ds,
        projectId: id.projectId,
        hours,
        capex: false,
        benchCategory: id.benchCategory || undefined,
        workLabel: id.workLabel || undefined,
      });
    } catch {
      toast.error('Failed to save entry');
    }
  }

  // Inline add — clicking "+ Add ..." swaps the trigger row for a focused input.
  function startAddLine(scope: 'bench' | 'overtime' | { project: string }): void {
    if (scope === 'overtime') {
      // Overtime preserves the legacy picker-style behavior (no free-text label) so
      // existing assignment-based OT flows keep working until OT is redesigned.
      const allAssignments = data?.assignmentRows ?? [];
      const alreadyAdded = new Set(customRows.filter((r) => r.group === 'overtime').map((r) => r.key));
      const projAvailable = allAssignments.filter((a) => !a.isBench && !alreadyAdded.has(`ot:${a.assignmentId}`));
      if (projAvailable.length > 0) {
        const choice = projAvailable[0];
        setCustomRows((prev) => [...prev, {
          key: `ot:${choice.assignmentId}`,
          label: `OT: ${choice.projectName}`,
          code: choice.projectCode,
          group: 'overtime',
          projectId: choice.projectId,
          benchCategory: '',
          workLabel: '',
          parentProjectId: choice.projectId,
          editable: true,
          custom: true,
        }]);
      } else if (!alreadyAdded.has('ot:bench')) {
        setCustomRows((prev) => [...prev, {
          key: 'ot:bench',
          label: 'OT: Bench / Internal',
          code: 'OT-BENCH',
          group: 'overtime',
          projectId: allAssignments[0]?.projectId ?? '',
          benchCategory: '',
          workLabel: '',
          parentProjectId: null,
          editable: true,
          custom: true,
        }]);
      } else {
        toast.info('All overtime lines already added');
      }
      return;
    }
    setDraftLabel('');
    setDraftLine(typeof scope === 'string' ? { scope } : { scope: 'project', projectId: scope.project });
  }

  function commitDraftLine(): void {
    if (!draftLine) return;
    const label = draftLabel.trim();
    if (!label) { setDraftLine(null); return; }

    if (draftLine.scope === 'bench') {
      const key = `bench:${label}`;
      if (gridRows.some((r) => r.key === key)) {
        toast.info('That line already exists');
        setDraftLine(null);
        return;
      }
      // Bench has no project — use the BENCH sentinel id, not whatever assignment happens to exist.
      setCustomRows((prev) => [...prev, {
        key, label, code: label,
        group: 'bench',
        projectId: BENCH_PROJECT_ID,
        benchCategory: label,
        workLabel: '',
        parentProjectId: null,
        editable: true, custom: true,
      }]);
    } else if (draftLine.scope === 'project') {
      const project = data?.assignmentRows.find((a) => a.projectId === draftLine.projectId);
      if (!project) { toast.error('Cannot find that project to bind the row to.'); setDraftLine(null); return; }
      const key = `wlbl:${project.projectId}:${label}`;
      if (gridRows.some((r) => r.key === key)) {
        toast.info('That line already exists for this project');
        setDraftLine(null);
        return;
      }
      setCustomRows((prev) => [...prev, {
        key, label, code: project.projectCode,
        group: 'project',
        projectId: project.projectId,
        benchCategory: '',
        workLabel: label,
        parentProjectId: project.projectId,
        editable: true, custom: true,
      }]);
    }
    setDraftLine(null);
    setDraftLabel('');
  }

  // Inline rename — Enter on the editing input commits.
  async function commitRename(rowKey: string): Promise<void> {
    const row = gridRows.find((r) => r.key === rowKey);
    if (!row) { setEditingRowKey(null); return; }
    const next = editingLabel.trim();
    setEditingRowKey(null);
    if (!next || next === row.label) return;

    const oldLabel = row.label;
    const isBench = row.group === 'bench';
    const newKey = isBench ? `bench:${next}` : `wlbl:${row.projectId}:${next}`;
    if (gridRows.some((r) => r.key === newKey)) {
      toast.info('A line with that name already exists');
      return;
    }

    // Component state — relabel any draft custom row immediately.
    setCustomRows((prev) => prev.map((r) =>
      r.key !== rowKey ? r : {
        ...r,
        key: newKey,
        label: next,
        benchCategory: isBench ? next : '',
        workLabel: isBench ? '' : next,
      },
    ));

    // Re-key any pending local edits so we don't lose unsaved hours.
    setLocalEdits((prev) => {
      const out = new Map<string, number>();
      for (const [k, v] of prev) {
        if (k.startsWith(`${rowKey}:`)) out.set(`${newKey}:${k.substring(rowKey.length + 1)}`, v);
        else out.set(k, v);
      }
      return out;
    });

    // Backend rename — only if the row already has persisted entries.
    const hasPersisted = (data?.entries ?? []).some(
      (e) => e.projectId === row.projectId && e.benchCategory === row.benchCategory && e.workLabel === row.workLabel,
    );
    if (hasPersisted) {
      try {
        await renameMyTimeRow({
          month: ms,
          kind: isBench ? 'BENCH' : 'WORK_LABEL',
          projectId: isBench ? undefined : row.projectId,
          oldLabel,
          newLabel: next,
        });
        refetch();
      } catch {
        toast.error('Failed to rename row');
      }
    }
  }

  // Trash icon → if persisted, ask to confirm; if draft-only, drop immediately.
  function startDelete(rowKey: string): void {
    const row = gridRows.find((r) => r.key === rowKey);
    if (!row) return;
    const isBench = row.group === 'bench';
    const hours = (data?.entries ?? [])
      .filter((e) => e.projectId === row.projectId && e.benchCategory === row.benchCategory && e.workLabel === row.workLabel)
      .reduce((s, e) => s + e.hours, 0);
    if (hours <= 0) {
      // Component-state-only — drop immediately, no backend call.
      setCustomRows((prev) => prev.filter((r) => r.key !== rowKey));
      setLocalEdits((prev) => {
        const out = new Map<string, number>();
        for (const [k, v] of prev) if (!k.startsWith(`${rowKey}:`)) out.set(k, v);
        return out;
      });
      return;
    }
    setDeleteCandidate({
      rowKey,
      label: row.label,
      kind: isBench ? 'BENCH' : 'WORK_LABEL',
      projectId: isBench ? undefined : row.projectId,
      persistedHours: Math.round(hours * 10) / 10,
    });
  }

  async function confirmDelete(): Promise<void> {
    const c = deleteCandidate;
    if (!c) return;
    setDeleteCandidate(null);
    try {
      await deleteMyTimeRow({ month: ms, kind: c.kind, projectId: c.projectId, label: c.label });
      setCustomRows((prev) => prev.filter((r) => r.key !== c.rowKey));
      setLocalEdits((prev) => {
        const out = new Map<string, number>();
        for (const [k, v] of prev) if (!k.startsWith(`${c.rowKey}:`)) out.set(k, v);
        return out;
      });
      refetch();
    } catch {
      toast.error('Failed to delete row');
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
    // Future-date rule: blocked unless the platform setting allows it.
    if (!allowFutureDateEntry && ds > todayStr) return false;
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
            <Button type="button" variant="secondary" size="sm" onClick={handleAutoFill}>Fill from Assignments</Button>
            <Button type="button" variant="secondary" size="sm" onClick={handleCopyPrevious}>Copy Last Month</Button>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer', marginLeft: 'var(--space-2)' }}>
              <input type="checkbox" checked={showOT} onChange={(e) => setShowOT(e.target.checked)} />
              <span style={{ color: showOT ? 'var(--color-status-warning)' : 'var(--color-text-muted)', fontWeight: showOT ? 600 : 400 }}>Overtime Rows</span>
            </label>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
              {(['calendar', 'leave', 'summary'] as Tab[]).map((t) => (
                <Button key={t} size="sm" variant={tab === t ? 'primary' : 'secondary'} onClick={() => setTab(t)}>
                  {{ calendar: 'Calendar', leave: 'Leave', summary: 'Summary' }[t]}
                </Button>
              ))}
            </div>
          </div>

          {/* ── CALENDAR TAB ── */}
          {tab === 'calendar' && (() => {
            type CalendarRow =
              | { kind: 'section-header'; key: string; group: 'project' | 'bench' | 'overtime'; label: string; tone?: 'warning' }
              | { kind: 'project-header'; key: string; projectId: string; projectName: string; projectCode: string }
              | { kind: 'data'; key: string; row: GridRow }
              | { kind: 'add-trigger'; key: string; scope: 'bench' | 'overtime' | { project: string }; tone?: 'warning' }
              | { kind: 'add-draft'; key: string }
              | { kind: 'leave'; key: string; type: string }
              | { kind: 'footer-day-total'; key: string }
              | { kind: 'footer-gap'; key: string };

            const projectAutoRows = gridRows.filter((r) => r.group === 'project' && r.workLabel.length === 0);
            const projectWorkRows = gridRows.filter((r) => r.group === 'project' && r.workLabel.length > 0);
            const benchRows = gridRows.filter((r) => r.group === 'bench');
            const overtimeRows = gridRows.filter((r) => r.group === 'overtime');
            const leaveTypes = Array.from(new Set(data.leaveDays.filter((l) => l.status === 'APPROVED').map((l) => l.type)));

            // Build the nested calendar tree.
            const calendarRows: CalendarRow[] = [];
            calendarRows.push({ kind: 'section-header', key: 'sh-project', group: 'project', label: 'PROJECT TIME' });

            const projectIds = Array.from(new Set([
              ...projectAutoRows.map((r) => r.projectId),
              ...projectWorkRows.map((r) => r.projectId),
            ]));
            if (projectIds.length === 0) {
              calendarRows.push({ kind: 'add-trigger', key: 'add-no-project', scope: 'bench' });
            }
            for (const pid of projectIds) {
              const auto = projectAutoRows.find((r) => r.projectId === pid);
              const projectName = auto?.label ?? data.assignmentRows.find((a) => a.projectId === pid)?.projectName ?? pid;
              const projectCode = auto?.code ?? data.assignmentRows.find((a) => a.projectId === pid)?.projectCode ?? '';
              calendarRows.push({ kind: 'project-header', key: `ph:${pid}`, projectId: pid, projectName, projectCode });
              if (auto) calendarRows.push({ kind: 'data', key: auto.key, row: auto });
              for (const wr of projectWorkRows.filter((r) => r.projectId === pid)) {
                calendarRows.push({ kind: 'data', key: wr.key, row: wr });
              }
              if (draftLine && draftLine.scope === 'project' && draftLine.projectId === pid) {
                calendarRows.push({ kind: 'add-draft', key: `add-draft-proj:${pid}` });
              } else {
                calendarRows.push({ kind: 'add-trigger', key: `add-trig-proj:${pid}`, scope: { project: pid } });
              }
            }

            calendarRows.push({ kind: 'section-header', key: 'sh-bench', group: 'bench', label: 'BENCH TIME' });
            for (const row of benchRows) calendarRows.push({ kind: 'data', key: row.key, row });
            if (draftLine && draftLine.scope === 'bench') {
              calendarRows.push({ kind: 'add-draft', key: 'add-draft-bench' });
            } else {
              calendarRows.push({ kind: 'add-trigger', key: 'add-trig-bench', scope: 'bench' });
            }

            if (showOT) {
              calendarRows.push({ kind: 'section-header', key: 'sh-ot', group: 'overtime', label: 'OVERTIME (exception-based approval)', tone: 'warning' });
              for (const row of overtimeRows) calendarRows.push({ kind: 'data', key: row.key, row });
              calendarRows.push({ kind: 'add-trigger', key: 'add-trig-ot', scope: 'overtime', tone: 'warning' });
            }
            for (const t of leaveTypes) calendarRows.push({ kind: 'leave', key: `leave-${t}`, type: t });

            // Footer rows live INSIDE the table now so they share the same colgroup widths.
            calendarRows.push({ kind: 'footer-day-total', key: 'footer-day-total' });
            calendarRows.push({ kind: 'footer-gap', key: 'footer-gap' });

            const projectMonthTotal = (projectId: string): number => {
              let total = 0;
              for (const r of gridRows.filter((g) => g.projectId === projectId && g.group === 'project')) {
                for (let i = 0; i < dc; i++) total += getCellHours(r.key, dateStr(year, month, i + 1));
              }
              return Math.round(total * 10) / 10;
            };

            const dayCellRender = (cr: CalendarRow, dayNum: number): React.ReactNode => {
              const ds = dateStr(year, month, dayNum);
              if (cr.kind === 'leave') {
                const isThisLeave = data.leaveDays.some((l) => l.date === ds && l.type === cr.type && l.status === 'APPROVED');
                return isThisLeave ? <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-chart-1)' }}>{STD_HOURS}</span> : '';
              }
              if (cr.kind === 'footer-day-total') {
                const dt = dayTotal(dayNum);
                const dow = dowOf(year, month, dayNum);
                const isWE = dow === 0 || dow === 6;
                return <span style={{ fontSize: 10, fontWeight: 700, color: dt > 0 ? 'var(--color-text)' : 'var(--color-text-subtle)' }}>{isWE ? '' : dt > 0 ? dt : ''}</span>;
              }
              if (cr.kind === 'footer-gap') {
                if (!isWorkingDay(dayNum) || leaveDays.has(ds)) return null;
                const gap = STD_HOURS - dayTotal(dayNum);
                if (gap > 0) return <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-status-danger)' }}>{`-${gap}`}</span>;
                if (gap === 0) return <span style={{ fontSize: 10, color: 'var(--color-status-active)' }}>{'\u2713'}</span>;
                return null;
              }
              if (cr.kind !== 'data') return null;
              const row = cr.row;
              const hours = getCellHours(row.key, ds);
              const editable = isDayEditable(dayNum) && row.editable;
              const hasLeave = leaveDays.has(ds);
              if (row.group === 'project') {
                if (hasLeave) return <span style={{ fontSize: 8, color: 'var(--color-chart-1)' }} title={LEAVE_LABELS[leaveDays.get(ds)!] ?? ''}>{LEAVE_LABELS[leaveDays.get(ds)!]?.charAt(0) ?? 'L'}</span>;
                if (!isWorkingDay(dayNum)) return <span style={{ color: 'var(--color-text-subtle)', fontSize: 11 }}>{'\u2013'}</span>;
                return editable ? (
                  <input type="text" inputMode="decimal" value={hours || ''}
                    onChange={(e) => handleCellChange(row.key, ds, e.target.value)}
                    style={{ width: 34, height: 26, textAlign: 'center', border: 'none', background: 'transparent', fontSize: 13, fontVariantNumeric: 'tabular-nums', outline: 'none', padding: 0 }}
                    onFocus={(e) => e.target.select()} />
                ) : <span style={{ fontSize: 13, ...NUM }}>{hours || ''}</span>;
              }
              if (row.group === 'bench') {
                if (!isWorkingDay(dayNum) || leaveDays.has(ds)) return <span style={{ color: 'var(--color-text-subtle)', fontSize: 11 }}>{'\u2013'}</span>;
                return editable ? (
                  <input type="text" inputMode="decimal" value={hours || ''} onChange={(e) => handleCellChange(row.key, ds, e.target.value)}
                    style={{ width: 34, height: 26, textAlign: 'center', border: 'none', background: 'transparent', fontSize: 13, fontVariantNumeric: 'tabular-nums', outline: 'none', padding: 0 }}
                    onFocus={(e) => e.target.select()} />
                ) : <span style={{ fontSize: 13, ...NUM }}>{hours || ''}</span>;
              }
              // overtime
              if (!isWorkingDay(dayNum)) return <span style={{ color: 'var(--color-text-subtle)', fontSize: 11 }}>{'\u2013'}</span>;
              return editable ? (
                <input type="text" inputMode="decimal" value={hours || ''} onChange={(e) => handleCellChange(row.key, ds, e.target.value)}
                  style={{ width: 34, height: 26, textAlign: 'center', border: 'none', background: 'transparent', fontSize: 13, fontVariantNumeric: 'tabular-nums', outline: 'none', padding: 0, color: 'var(--color-status-warning)' }}
                  onFocus={(e) => e.target.select()} />
              ) : <span style={{ fontSize: 13, ...NUM, color: 'var(--color-status-warning)' }}>{hours || ''}</span>;
            };

            const dayCellBg = (cr: CalendarRow, dayNum: number): string | undefined => {
              const ds = dateStr(year, month, dayNum);
              if (cr.kind === 'leave') {
                const isThisLeave = data.leaveDays.some((l) => l.date === ds && l.type === cr.type && l.status === 'APPROVED');
                return isThisLeave ? 'color-mix(in srgb, var(--color-chart-1) 15%, transparent)' : cellBg(dayNum);
              }
              if (cr.kind === 'footer-day-total') {
                const dow = dowOf(year, month, dayNum);
                return dow === 0 || dow === 6 ? 'var(--color-border)' : 'var(--color-surface-alt)';
              }
              if (cr.kind === 'footer-gap') {
                if (!isWorkingDay(dayNum) || leaveDays.has(ds)) return cellBg(dayNum);
                const gap = STD_HOURS - dayTotal(dayNum);
                return gap > 0 ? 'color-mix(in srgb, var(--color-status-danger) 8%, transparent)' : 'color-mix(in srgb, var(--color-status-danger) 5%, transparent)';
              }
              if (cr.kind === 'project-header') return 'var(--color-surface-alt)';
              if (cr.kind !== 'data') return undefined;
              if (cr.row.group === 'overtime') {
                return isWorkingDay(dayNum) ? 'color-mix(in srgb, var(--color-status-warning) 4%, transparent)' : 'var(--color-border)';
              }
              return cellBg(dayNum);
            };

            const totalRender = (cr: CalendarRow): React.ReactNode => {
              if (cr.kind === 'leave') {
                return data.leaveDays.filter((l) => l.type === cr.type && l.status === 'APPROVED').length * STD_HOURS;
              }
              if (cr.kind === 'footer-day-total') return s.reportedHours;
              if (cr.kind === 'footer-gap') return s.gapHours > 0 ? `-${s.gapHours}` : '\u2713';
              if (cr.kind === 'project-header') {
                const t = projectMonthTotal(cr.projectId);
                return t > 0 ? `${t}` : '';
              }
              if (cr.kind !== 'data') return null;
              const row = cr.row;
              let rowTotal = 0;
              for (let i = 0; i < dc; i++) {
                rowTotal += getCellHours(row.key, dateStr(year, month, i + 1));
              }
              return rowTotal > 0 ? `${Math.round(rowTotal * 10) / 10}` : '';
            };

            return (
              <div style={{ overflow: 'auto' }}>
                <Table
                  variant="compact"
                  tableLayout="fixed"
                  minWidth={200 + dc * 40 + 64}
                  columns={[
                    {
                      key: 'workLine',
                      title: 'Work Line',
                      width: 200,
                      cellStyle: { position: 'sticky', left: 0, background: 'var(--color-surface)', zIndex: 1, whiteSpace: 'nowrap', borderRight: '2px solid var(--color-border)' },
                      headerClassName: 'mytime-sticky-header',
                      render: (cr) => {
                        if (cr.kind === 'data') {
                          const row = cr.row;
                          // Auto project row (assignment-derived) — non-editable label, indent 16.
                          if (row.group === 'project' && row.workLabel.length === 0) {
                            return (
                              <span style={{ paddingLeft: 16, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ color: 'var(--color-text-muted)', fontSize: 9 }}>{row.code}</span>
                                <span style={{ fontWeight: 500 }}>{row.label}</span>
                              </span>
                            );
                          }
                          if (row.group === 'bench' || row.group === 'project') {
                            const isEditing = editingRowKey === row.key;
                            const indent = row.group === 'project' && row.workLabel.length > 0 ? 32 : 16;
                            if (isEditing) {
                              return (
                                <input
                                  autoFocus
                                  value={editingLabel}
                                  onChange={(e) => setEditingLabel(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') { e.preventDefault(); void commitRename(row.key); }
                                    else if (e.key === 'Escape') { e.preventDefault(); setEditingRowKey(null); }
                                  }}
                                  onBlur={() => void commitRename(row.key)}
                                  style={{ width: `calc(100% - ${indent}px)`, height: 26, fontSize: 13, padding: '0 4px', marginLeft: indent, border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-control)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
                                />
                              );
                            }
                            return (
                              <span style={{ paddingLeft: indent, display: 'inline-flex', alignItems: 'center', gap: 4, width: '100%' }}>
                                <span style={{ color: row.group === 'bench' ? 'var(--color-status-neutral)' : 'var(--color-text-subtle)', fontSize: 9 }}>{'\u25CB'}</span>
                                <span
                                  onClick={() => { setEditingRowKey(row.key); setEditingLabel(row.label); }}
                                  style={{ cursor: 'text', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}
                                  title="Click to rename"
                                >{row.label}</span>
                                <button
                                  type="button"
                                  className="mytime-row-delete"
                                  onClick={(e) => { e.stopPropagation(); startDelete(row.key); }}
                                  aria-label={`Delete ${row.label}`}
                                  title="Delete this line"
                                  style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 13, padding: '0 4px', lineHeight: 1 }}
                                >{'\u2715'}</button>
                              </span>
                            );
                          }
                          // overtime (legacy assignment-based)
                          return (
                            <span>
                              <span style={{ color: 'var(--color-status-warning)', fontSize: 9, marginRight: 4 }}>{'\u25B2'}</span>
                              <span>{row.label}</span>
                            </span>
                          );
                        }
                        if (cr.kind === 'project-header') {
                          return (
                            <span style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ color: 'var(--color-text-muted)', fontSize: 9, fontWeight: 400 }}>{cr.projectCode}</span>
                              <span>{cr.projectName}</span>
                            </span>
                          );
                        }
                        if (cr.kind === 'leave') {
                          return (
                            <span>
                              <span style={{ color: 'var(--color-chart-1)', fontSize: 9, marginRight: 4 }}>{'\u25A0'}</span>
                              <span style={{ color: 'var(--color-chart-1)' }}>{LEAVE_LABELS[cr.type] ?? cr.type}</span>
                            </span>
                          );
                        }
                        if (cr.kind === 'footer-day-total') {
                          return <span style={{ fontWeight: 700, fontSize: 10 }}>Day Total</span>;
                        }
                        if (cr.kind === 'footer-gap') {
                          return <span style={{ fontWeight: 600, fontSize: 10, color: 'var(--color-status-danger)' }}>Gap</span>;
                        }
                        return null;
                      },
                    },
                    ...Array.from({ length: dc }, (_, i) => {
                      const d = i + 1;
                      const dow = dowOf(year, month, d);
                      const ds = dateStr(year, month, d);
                      const isWE = dow === 0 || dow === 6;
                      const isH = holidays.has(ds);
                      return {
                        key: `d-${d}`,
                        title: <span title={isH ? holidayNames.get(ds) ?? '' : ''} style={{ display: 'inline-block', background: isWE ? 'var(--color-border)' : isH ? 'color-mix(in srgb, var(--color-status-info) 20%, var(--color-surface-alt))' : undefined, padding: '1px 0', fontSize: 11, width: '100%' }}>
                          <div>{DAY_ABBR[dow === 0 ? 7 : dow]}</div>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{d}</div>
                        </span>,
                        align: 'center' as const,
                        width: 40,
                        cellStyle: { padding: 0 },
                        render: (cr: CalendarRow) => {
                          const bg = dayCellBg(cr, d);
                          return (
                            <div style={{ background: bg, minHeight: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {dayCellRender(cr, d)}
                            </div>
                          );
                        },
                      };
                    }),
                    {
                      key: 'total',
                      title: 'Total',
                      align: 'right',
                      width: 64,
                      cellStyle: { paddingRight: 8 },
                      render: (cr) => {
                        if (cr.kind === 'leave') return <span style={{ ...NUM, fontWeight: 600, fontSize: 13, color: 'var(--color-chart-1)' }}>{totalRender(cr)}</span>;
                        if (cr.kind === 'data' && cr.row.group === 'overtime') return <span style={{ ...NUM, fontWeight: 600, fontSize: 13, color: 'var(--color-status-warning)' }}>{totalRender(cr)}</span>;
                        if (cr.kind === 'data') return <span style={{ ...NUM, fontWeight: 600, fontSize: 13 }}>{totalRender(cr)}</span>;
                        if (cr.kind === 'project-header') return <span style={{ ...NUM, fontWeight: 600, fontSize: 13, color: 'var(--color-text-muted)' }}>{totalRender(cr)}</span>;
                        if (cr.kind === 'footer-day-total') return <span style={{ ...NUM, fontWeight: 700, fontSize: 13 }}>{totalRender(cr)}</span>;
                        if (cr.kind === 'footer-gap') return <span style={{ ...NUM, fontWeight: 700, fontSize: 13, color: s.gapHours > 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)' }}>{totalRender(cr)}</span>;
                        return null;
                      },
                    },
                  ] as Column<CalendarRow>[]}
                  rows={calendarRows}
                  getRowKey={(cr) => cr.key}
                  rowStyle={(cr) => {
                    if (cr.kind === 'data' && cr.row.group === 'overtime') return { background: 'color-mix(in srgb, var(--color-status-warning) 4%, transparent)' };
                    if (cr.kind === 'leave') return { background: 'color-mix(in srgb, var(--color-chart-1) 4%, transparent)' };
                    if (cr.kind === 'project-header') return { background: 'var(--color-surface-alt)' };
                    if (cr.kind === 'footer-day-total') return { background: 'var(--color-surface-alt)', fontWeight: 700 };
                    if (cr.kind === 'footer-gap') return { background: 'color-mix(in srgb, var(--color-status-danger) 5%, transparent)' };
                    return undefined;
                  }}
                  fullSpanRow={(cr) => {
                    if (cr.kind === 'section-header') {
                      const isOT = cr.tone === 'warning';
                      return (
                        <div style={{
                          background: isOT ? 'color-mix(in srgb, var(--color-status-warning) 10%, var(--color-surface-alt))' : 'var(--color-surface-alt)',
                          fontWeight: 700,
                          fontSize: 10,
                          padding: '4px 8px',
                          color: isOT ? 'var(--color-status-warning)' : 'var(--color-text-muted)',
                          letterSpacing: '0.05em',
                        }}>
                          {cr.label}
                        </div>
                      );
                    }
                    if (cr.kind === 'add-trigger') {
                      const isOT = cr.tone === 'warning';
                      const label = cr.scope === 'overtime' ? '+ Add OT line'
                                  : cr.scope === 'bench' ? '+ Add line'
                                  : '+ Add work';
                      const indent = cr.scope === 'bench' ? 16
                                    : typeof cr.scope === 'object' ? 32
                                    : 0;
                      return (
                        <div style={{ paddingLeft: indent, padding: `2px 8px 2px ${8 + indent}px` }}>
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            onClick={() => startAddLine(cr.scope)}
                            style={{
                              fontSize: 10,
                              border: `1px dashed ${isOT ? 'var(--color-status-warning)' : 'var(--color-border)'}`,
                              borderRadius: 3,
                              padding: '1px 8px',
                              color: isOT ? 'var(--color-status-warning)' : 'var(--color-accent)',
                            }}
                          >{label}</Button>
                        </div>
                      );
                    }
                    if (cr.kind === 'add-draft') {
                      const placeholder = draftLine?.scope === 'bench' ? 'Bench activity, e.g. "Self-paced training"'
                                        : draftLine?.scope === 'project' ? 'Work item, e.g. "Bug fixes" or "PROJ-123"'
                                        : 'Add line';
                      const indent = draftLine?.scope === 'bench' ? 16 : 32;
                      return (
                        <div style={{ padding: `4px 8px 4px ${8 + indent}px`, background: 'color-mix(in srgb, var(--color-accent) 5%, var(--color-surface))' }}>
                          <input
                            autoFocus
                            value={draftLabel}
                            onChange={(e) => setDraftLabel(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { e.preventDefault(); commitDraftLine(); }
                              else if (e.key === 'Escape') { e.preventDefault(); setDraftLine(null); }
                            }}
                            onBlur={() => { if (!draftLabel.trim()) setDraftLine(null); else commitDraftLine(); }}
                            placeholder={placeholder}
                            style={{
                              width: '100%', maxWidth: 320, height: 24,
                              fontSize: 11, padding: '0 6px',
                              border: '1px solid var(--color-border-strong)',
                              borderRadius: 'var(--radius-control)',
                              background: 'var(--color-surface)', color: 'var(--color-text)',
                            }}
                          />
                        </div>
                      );
                    }
                    return undefined;
                  }}
                />

              {/* Week status + submit controls */}
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
                {data.weeks.map((w) => {
                  const statusColor = w.status === 'APPROVED' ? 'var(--color-status-active)' : w.status === 'SUBMITTED' ? 'var(--color-status-warning)' : w.status === 'REJECTED' ? 'var(--color-status-danger)' : 'var(--color-border)';
                  // Submit-in-advance gate: block until weekStart + 6 has passed (when setting is off).
                  const wkLastDay = new Date(new Date(w.weekStart).getTime() + 6 * 86400000);
                  const advanceBlocked = !allowSubmitInAdvance && wkLastDay > new Date();
                  const submitTooltip = advanceBlocked
                    ? `Submitting before the week\'s last day (${wkLastDay.toISOString().slice(0,10)}) is disabled. Ask an admin to enable "Allow submit in advance".`
                    : '';
                  return (
                    <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 'var(--radius-control)', border: `2px solid ${statusColor}`, background: `color-mix(in srgb, ${statusColor} 6%, var(--color-surface))`, fontSize: 12 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
                      <span style={{ fontWeight: 500 }}>Week of {w.weekStart}</span>
                      {w.status === 'DRAFT' && (
                        <>
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            disabled={advanceBlocked}
                            title={submitTooltip}
                            style={{ fontSize: 11, marginLeft: 4 }}
                            onClick={async () => {
                              try {
                                if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
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
                              } catch (e) { toast.error(e instanceof Error ? e.message : 'Submit failed'); }
                            }}>
                            Submit
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            style={{ fontSize: 11 }}
                            onClick={() => setResetCandidate({ weekStart: w.weekStart })}
                          >
                            Reset
                          </Button>
                        </>
                      )}
                      {w.status === 'SUBMITTED' && (
                        <>
                          <span style={{ color: 'var(--color-status-warning)', fontWeight: 600, fontSize: 11 }}>Pending approval</span>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            style={{ fontSize: 11, marginLeft: 4 }}
                            onClick={() => setRevokeCandidate({ weekStart: w.weekStart })}
                          >
                            Revoke
                          </Button>
                        </>
                      )}
                      {w.status === 'APPROVED' && (
                        <span style={{ color: 'var(--color-status-active)', fontWeight: 600, fontSize: 11 }}>{'\u2713'} Approved</span>
                      )}
                      {w.status === 'REJECTED' && (
                        <>
                          <span style={{ color: 'var(--color-status-danger)', fontWeight: 600, fontSize: 11 }}>Rejected — edit and resubmit</span>
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            disabled={advanceBlocked}
                            title={submitTooltip}
                            style={{ fontSize: 11, marginLeft: 4 }}
                            onClick={async () => {
                              try {
                                if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
                                await submitTimesheetWeek(w.weekStart);
                                toast.success(`Week of ${w.weekStart} resubmitted`);
                                refetch();
                              } catch (e) { toast.error(e instanceof Error ? e.message : 'Resubmit failed'); }
                            }}>
                            Resubmit
                          </Button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            );
          })()}

          {/* ── LEAVE TAB ── */}
          {tab === 'leave' && (
            <SectionCard title="Leave Requests">
              {data.leaveDays.length > 0 ? (
                <Table
                  variant="compact"
                  columns={[
                    { key: 'date', title: 'Date', getValue: (l) => l.date, render: (l) => l.date },
                    { key: 'type', title: 'Type', getValue: (l) => l.type, render: (l) => <StatusBadge label={LEAVE_LABELS[l.type] ?? l.type} size="small" tone={l.type === 'SICK' ? 'danger' : l.type === 'ANNUAL' ? 'info' : 'neutral'} /> },
                    { key: 'status', title: 'Status', getValue: (l) => l.status, render: (l) => <StatusBadge label={l.status} size="small" tone={l.status === 'APPROVED' ? 'active' : l.status === 'PENDING' ? 'warning' : 'danger'} /> },
                  ] as Column<typeof data.leaveDays[number]>[]}
                  rows={data.leaveDays}
                  getRowKey={(_, i) => `leave-${i}`}
                />
              ) : (
                <EmptyState title="No leave" description="No leave requests for this month." />
              )}
              <div style={{ marginTop: 'var(--space-3)' }}>
                <Button type="button" variant="primary" size="sm" onClick={() => nav('/leave')}>+ New Leave Request</Button>
              </div>
            </SectionCard>
          )}

          {/* ── SUMMARY TAB ── */}
          {tab === 'summary' && (
            <SectionCard title="Monthly Summary">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <DescriptionList items={[
                  { label: 'Working Days', value: <span style={NUM}>{s.workingDays}</span> },
                  { label: 'Expected Hours', value: <span style={NUM}>{s.expectedHours}h</span> },
                  { label: 'Reported Hours', value: <span style={{ ...NUM, fontWeight: 600 }}>{s.reportedHours}h</span> },
                  { label: <span style={{ paddingLeft: 16 }}>Standard</span>, value: <span style={NUM}>{s.standardHours}h</span> },
                  { label: <span style={{ paddingLeft: 16 }}>Overtime</span>, value: <span style={{ ...NUM, color: s.overtimeHours > 0 ? 'var(--color-status-warning)' : undefined }}>{s.overtimeHours}h</span> },
                  { label: <span style={{ paddingLeft: 16 }}>Leave</span>, value: <span style={NUM}>{s.leaveHours}h</span> },
                  { label: <span style={{ paddingLeft: 16 }}>Bench</span>, value: <span style={NUM}>{s.benchHours}h</span> },
                  { label: 'Gap', value: <span style={{ ...NUM, color: s.gapHours > 0 ? 'var(--color-status-danger)' : undefined, fontWeight: 600 }}>{s.gapHours}h ({s.gapDays} days)</span> },
                  { label: 'Utilization', value: <span style={{ ...NUM, fontWeight: 600 }}>{s.utilizationPercent}%</span> },
                ] as DescriptionListItem[]} />
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
            <Button type="button" variant="secondary" size="sm" onClick={refetch} style={{ marginLeft: 'var(--space-2)' }}>{'\u21bb'} Refresh</Button>
          </div>
        </>
      ) : null}

      <ConfirmDialog
        open={deleteCandidate !== null}
        title="Delete this line?"
        message={
          deleteCandidate
            ? `Delete "${deleteCandidate.label}" and its ${deleteCandidate.persistedHours}h of reported hours? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        tone="danger"
        onCancel={() => setDeleteCandidate(null)}
        onConfirm={() => { void confirmDelete(); }}
      />

      <ConfirmDialog
        open={resetCandidate !== null}
        title="Reset this week?"
        message={
          resetCandidate
            ? `Clear every entry for the week of ${resetCandidate.weekStart}? Custom rows you added in the UI stay; only the saved hours are wiped. This cannot be undone.`
            : ''
        }
        confirmLabel="Reset"
        tone="danger"
        onCancel={() => setResetCandidate(null)}
        onConfirm={async () => {
          const c = resetCandidate;
          setResetCandidate(null);
          if (!c) return;
          try {
            await resetTimesheetWeek(c.weekStart);
            toast.success(`Week of ${c.weekStart} reset`);
            // Drop any pending edits inside this week so they don't immediately re-save.
            const wkStart = new Date(c.weekStart);
            const wkEnd = new Date(wkStart.getTime() + 7 * 86400000);
            setLocalEdits((prev) => {
              const out = new Map<string, number>();
              for (const [k, v] of prev) {
                const ds = k.substring(k.lastIndexOf(':') + 1);
                const d = new Date(ds);
                if (!(d >= wkStart && d < wkEnd)) out.set(k, v);
              }
              return out;
            });
            refetch();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Reset failed');
          }
        }}
      />

      <ConfirmDialog
        open={revokeCandidate !== null}
        title="Revoke submission?"
        message={
          revokeCandidate
            ? `Pull the week of ${revokeCandidate.weekStart} back to DRAFT so you can edit it? Your manager will need to approve again after you re-submit.`
            : ''
        }
        confirmLabel="Revoke"
        onCancel={() => setRevokeCandidate(null)}
        onConfirm={async () => {
          const c = revokeCandidate;
          setRevokeCandidate(null);
          if (!c) return;
          try {
            await revokeTimesheetWeek(c.weekStart);
            toast.success(`Week of ${c.weekStart} returned to draft`);
            refetch();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Revoke failed');
          }
        }}
      />
    </PageContainer>
  );
}
