import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';

import { useAuth } from '@/app/auth-context';
import { useTitleBarActions } from '@/app/title-bar-context';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { TipTrigger } from '@/components/common/TipBalloon';
import { useTimesheetWeek } from '@/features/timesheets/useTimesheetWeek';
import { listProjectPositions } from '@/lib/api/project-positions';
import { mapListResponseToDirectory } from '@/features/lean-migration/position-to-assignment-mapper';
import { formatDateRange } from '@/lib/format-date';
import { fetchProjectDirectory } from '@/lib/api/project-registry';
import { fetchMyTimesheetWeek, UpsertEntryInput } from '@/lib/api/timesheets';
import { Button, IconButton, Modal, Popover, Table, Textarea, Timeline, type Column, type TimelineSegment } from '@/components/ds';

// ISO week helpers ─────────────────────────────────────────────────────────────

function getIsoWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

function addWeeks(dateStr: string, delta: number): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + delta * 7);
  return d.toISOString().slice(0, 10);
}

function getWeekDays(weekStart: string): string[] {
  const days: string[] = [];
  const d = new Date(weekStart);
  for (let i = 0; i < 7; i++) {
    const day = new Date(d);
    day.setUTCDate(d.getUTCDate() + i);
    days.push(day.toISOString().slice(0, 10));
  }
  return days;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatWeekLabel(weekStart: string): string {
  const end = new Date(weekStart);
  end.setUTCDate(end.getUTCDate() + 6);
  return formatDateRange(weekStart, end);
}

function getGrandTotalClass(total: number): string {
  if (total > 50) return 'timesheet-total--red';
  if (total >= 35 && total <= 45) return 'timesheet-total--green';
  return 'timesheet-total--yellow';
}

function getProjectRows(
  entries: Array<{ projectId: string }>,
  activeProjectIds: string[],
): string[] {
  const seen = new Set<string>([...activeProjectIds]);
  entries.forEach((e) => seen.add(e.projectId));
  return Array.from(seen);
}

// Status helpers
type WeekStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

const STATUS_PRIORITY: Record<WeekStatus, number> = {
  APPROVED: 0,
  DRAFT: 1,
  SUBMITTED: 2,
  REJECTED: 3,
};

function getStatusIcon(status: WeekStatus): { icon: string; color: string } {
  switch (status) {
    case 'SUBMITTED':
      return { icon: '\u23F3', color: 'var(--color-status-warning)' };
    case 'APPROVED':
      return { icon: '\u2713', color: 'var(--color-status-active)' };
    case 'REJECTED':
      return { icon: '\u2717', color: 'var(--color-status-danger)' };
    default:
      return { icon: '\u25CF', color: 'var(--color-text-subtle)' };
  }
}

function getStatusLabel(status: WeekStatus): { label: string; color: string } {
  switch (status) {
    case 'REJECTED':
      return { label: 'Rejected', color: 'var(--color-status-danger)' };
    case 'SUBMITTED':
      return { label: 'Awaiting approval', color: 'var(--color-status-warning)' };
    case 'APPROVED':
      return { label: 'Approved \u2713', color: 'var(--color-status-active)' };
    default:
      return { label: 'Draft', color: 'var(--color-text-secondary)' };
  }
}

function getRowStatusClass(status: WeekStatus): string {
  switch (status) {
    case 'SUBMITTED':
      return 'timesheet-row--submitted';
    case 'APPROVED':
      return 'timesheet-row--approved';
    case 'REJECTED':
      return 'timesheet-row--rejected';
    default:
      return '';
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TimesheetPage(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const { principal } = useAuth();
  const { setActions } = useTitleBarActions();
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const initialWeekStart = searchParams.get('weekStart') ?? getIsoWeekStart(today);
  const [weekStart, setWeekStart] = useState(initialWeekStart);

  const { week, isLoading, error, saveStatus, saveEntry, submitWeek } =
    useTimesheetWeek(weekStart);

  // Project name lookup
  const [projectNameMap, setProjectNameMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let active = true;
    void fetchProjectDirectory().then((res) => {
      if (!active) return;
      const map = new Map<string, string>();
      for (const p of res.items) {
        map.set(p.id, p.name);
      }
      setProjectNameMap(map);
    }).catch(() => { /* ignore */ });
    return () => { active = false; };
  }, []);

  // Capex toggles per project
  const [capexByProject, setCapexByProject] = useState<Record<string, boolean>>({});

  // Add project dialog state
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [availableProjects, setAvailableProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projectSearch, setProjectSearch] = useState('');

  // Description popover state
  const [descPopover, setDescPopover] = useState<{
    projectId: string;
    date: string;
    value: string;
  } | null>(null);

  // Debounce ref for auto-save
  const debounceRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Track whether auto-fill has run for this week
  const autoFillRanRef = useRef<string | null>(null);

  // Weekend toggle
  const [showWeekend, setShowWeekend] = useState(false);

  // Copy last week popover
  const [copyPopoverOpen, setCopyPopoverOpen] = useState(false);
  const copyButtonRef = useRef<HTMLButtonElement>(null);
  const [prevWeekData, setPrevWeekData] = useState<'loading' | 'empty' | { projectIds: string[]; entries: Array<{ projectId: string; date: string; hours: number }> } | null>(null);

  // Local cell values for controlled inputs: key = "projectId::date"
  const [localValues, setLocalValues] = useState<Record<string, string>>({});

  // Saving/error state per cell
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set());
  const [cellErrors, setCellErrors] = useState<Record<string, string>>({});

  // Keyboard navigation refs
  const cellRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const weekDays = getWeekDays(weekStart);
  const projectIds = week ? getProjectRows(week.entries, []) : [];
  const isReadOnly = week?.status === 'APPROVED' || week?.status === 'REJECTED';

  // Sync server data into local values when week changes
  useEffect(() => {
    if (!week) return;
    const vals: Record<string, string> = {};
    for (const entry of week.entries) {
      if (entry.hours !== 0) {
        vals[`${entry.projectId}::${entry.date}`] = String(entry.hours);
      }
    }
    setLocalValues(vals);
  }, [week]);

  // Visible day indices based on weekend toggle
  const visibleDayIndices = useMemo(() => {
    if (showWeekend) return [0, 1, 2, 3, 4, 5, 6];
    return [0, 1, 2, 3, 4];
  }, [showWeekend]);

  // Per-project status: each entry belongs to the week, so use week status per row.
  // The week has a single status, but the spec asks for per-row status indicators.
  // We use the week status for all rows.
  const weekStatus: WeekStatus = (week?.status as WeekStatus) ?? 'DRAFT';

  // Auto-fill from assignments on load when DRAFT with no entries
  useEffect(() => {
    if (
      week &&
      week.status === 'DRAFT' &&
      week.entries.length === 0 &&
      principal?.personId &&
      autoFillRanRef.current !== weekStart
    ) {
      autoFillRanRef.current = weekStart;
      void autoPopulateFromAssignments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [week, weekStart, principal?.personId]);

  // Get entry value from week data
  function getHours(projectId: string, date: string): number {
    return week?.entries.find((e) => e.projectId === projectId && e.date === date)?.hours ?? 0;
  }

  function getDescription(projectId: string, date: string): string {
    return week?.entries.find((e) => e.projectId === projectId && e.date === date)?.description ?? '';
  }

  // Get displayed value for a cell (from local state)
  function getCellValue(projectId: string, date: string): string {
    const key = `${projectId}::${date}`;
    return localValues[key] ?? '';
  }

  // Handle cell input change (local state only)
  function handleCellInput(projectId: string, date: string, rawValue: string): void {
    const key = `${projectId}::${date}`;
    // Clear any error on edit
    if (cellErrors[key]) {
      setCellErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
    setLocalValues((prev) => {
      if (rawValue === '' || rawValue === '0') {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: rawValue };
    });
  }

  // Auto-save on blur
  const handleCellBlur = useCallback(
    (projectId: string, date: string) => {
      if (!week || isReadOnly) return;
      const key = `${projectId}::${date}`;
      const rawVal = localValues[key] ?? '';
      const hours = parseFloat(rawVal) || 0;

      const existing = debounceRef.current.get(key);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(() => {
        const cellKey = `${projectId}-${date}`;
        setSavingCells((prev) => new Set(prev).add(cellKey));

        const entry: UpsertEntryInput = {
          weekStart,
          projectId,
          date,
          hours,
          capex: capexByProject[projectId] ?? false,
          description: getDescription(projectId, date),
        };
        void saveEntry(entry)
          .then(() => {
            setSavingCells((prev) => {
              const next = new Set(prev);
              next.delete(cellKey);
              return next;
            });
          })
          .catch(() => {
            setSavingCells((prev) => {
              const next = new Set(prev);
              next.delete(cellKey);
              return next;
            });
            setCellErrors((prev) => ({ ...prev, [key]: 'Save failed' }));
          });
      }, 500);

      debounceRef.current.set(key, timer);
    },
    [week, isReadOnly, weekStart, capexByProject, saveEntry, localValues],
  );

  const handleDescriptionSave = useCallback(
    (projectId: string, date: string, description: string) => {
      if (!week || isReadOnly) return;
      const hours = getHours(projectId, date);
      const entry: UpsertEntryInput = {
        weekStart,
        projectId,
        date,
        hours,
        capex: capexByProject[projectId] ?? false,
        description,
      };
      void saveEntry(entry);
      setDescPopover(null);
    },
    [week, isReadOnly, weekStart, capexByProject, saveEntry],
  );

  // Keyboard navigation
  function handleCellKeyDown(e: React.KeyboardEvent<HTMLInputElement>, rowIdx: number, dayIdx: number): void {
    const maxRow = projectIds.length - 1;
    const maxDay = visibleDayIndices.length - 1;
    // Map visible day position to actual dayIdx for ref lookup
    const visiblePos = visibleDayIndices.indexOf(dayIdx);

    let targetRow = rowIdx;
    let targetVisPos = visiblePos;
    let handled = true;

    switch (e.key) {
      case 'ArrowRight':
        targetVisPos = Math.min(visiblePos + 1, maxDay);
        break;
      case 'ArrowLeft':
        targetVisPos = Math.max(visiblePos - 1, 0);
        break;
      case 'ArrowDown':
        targetRow = Math.min(rowIdx + 1, maxRow);
        break;
      case 'ArrowUp':
        targetRow = Math.max(rowIdx - 1, 0);
        break;
      case 'Enter':
        e.currentTarget.blur();
        targetRow = Math.min(rowIdx + 1, maxRow);
        break;
      case 'Escape': {
        // Revert to last saved value
        const pid = projectIds[rowIdx];
        const date = weekDays[dayIdx];
        const saved = getHours(pid, date);
        const key = `${pid}::${date}`;
        setLocalValues((prev) => {
          if (saved === 0) {
            const next = { ...prev };
            delete next[key];
            return next;
          }
          return { ...prev, [key]: String(saved) };
        });
        e.currentTarget.blur();
        return;
      }
      case 'Tab':
        return; // Allow default
      default:
        handled = false;
    }

    if (handled) {
      e.preventDefault();
      const targetDay = visibleDayIndices[targetVisPos];
      const refKey = `${targetRow}-${targetDay}`;
      const target = cellRefs.current[refKey];
      if (target) {
        target.focus();
        target.select();
      }
    }
  }

  function navigateWeek(delta: number): void {
    const newWeek = addWeeks(weekStart, delta);
    setWeekStart(newWeek);
    setSearchParams({ weekStart: newWeek });
  }

  async function autoPopulateFromAssignments(): Promise<void> {
    if (!principal?.personId) return;
    try {
      // LEAN-P2: APPROVED/ACTIVE legacy statuses map to BOOKED/ASSIGNED/ONBOARDING
      // on the lean aggregate. One fetch covers the full active set.
      const positionsResponse = await listProjectPositions({
        activePersonId: principal.personId,
        fillStatuses: ['BOOKED', 'ASSIGNED', 'ONBOARDING'],
      }).then(mapListResponseToDirectory);
      const allItems = positionsResponse.items;
      const seen = new Set<string>();
      const uniqueItems = allItems.filter((a) => {
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      });

      const activeAssignments = uniqueItems.filter((a) => {
        const from = a.startDate ? new Date(a.startDate) : null;
        const to = a.endDate ? new Date(a.endDate) : null;
        const weekStartDate = new Date(weekStart);
        const weekEndDate = new Date(weekStart);
        weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 6);
        if (from && from > weekEndDate) return false;
        if (to && to < weekStartDate) return false;
        return true;
      });

      if (activeAssignments.length === 0) {
        toast.info('No active assignments found for this week.');
        return;
      }

      const existingProjectIds = new Set(week ? getProjectRows(week.entries, []) : []);
      let addedCount = 0;
      for (const assignment of activeAssignments) {
        const projId = assignment.project.id;
        if (!existingProjectIds.has(projId)) {
          await saveEntry({
            capex: false,
            date: weekDays[0],
            hours: 0,
            projectId: projId,
            weekStart,
          });
          existingProjectIds.add(projId);
          addedCount++;
        }
      }

      if (addedCount > 0) {
        toast.success(`Added ${addedCount} project row${addedCount > 1 ? 's' : ''} from assignments.`);
      } else {
        toast.info('All assigned projects are already in the timesheet.');
      }
    } catch {
      toast.error('Failed to load assignments. Please try again.');
    }
  }

  async function openAddProjectDialog(): Promise<void> {
    if (!principal?.personId) return;
    setAddProjectOpen(true);
    setSelectedProjectId('');
    setProjectSearch('');
    try {
      const result = await listProjectPositions({
        activePersonId: principal.personId,
        fillStatuses: ['BOOKED', 'ASSIGNED', 'ONBOARDING'],
      }).then(mapListResponseToDirectory);
      const existing = new Set(week ? getProjectRows(week.entries, []) : []);
      setAvailableProjects(
        result.items
          .filter((a) => !existing.has(a.project.id))
          .map((a) => ({ id: a.project.id, name: a.project.displayName })),
      );
    } catch {
      setAvailableProjects([]);
    }
  }

  function confirmAddProject(): void {
    if (!selectedProjectId) return;
    const newRowIndex = projectIds.length;
    void saveEntry({
      weekStart,
      projectId: selectedProjectId,
      date: weekDays[0],
      hours: 0,
      capex: false,
    }).then(() => {
      // Focus first cell of new row after render
      setTimeout(() => {
        const refKey = `${newRowIndex}-${visibleDayIndices[0]}`;
        cellRefs.current[refKey]?.focus();
      }, 100);
    });
    setAddProjectOpen(false);
  }

  async function handleSubmit(): Promise<void> {
    try {
      await submitWeek();
      toast.success('Timesheet submitted successfully');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit.');
    }
  }

  // Title bar actions: week navigation + submit
  useEffect(() => {
    setActions(
      <>
        <Button aria-label="Previous week" variant="secondary" size="sm" onClick={() => navigateWeek(-1)} type="button">
          {'\u2190'} Prev
        </Button>
        <span style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>{formatWeekLabel(weekStart)}</span>
        <Button aria-label="Next week" variant="secondary" size="sm" onClick={() => navigateWeek(1)} type="button">
          Next {'\u2192'}
        </Button>
        {!isReadOnly && (
          <Button variant="primary" size="sm" disabled={week?.status !== 'DRAFT'} onClick={() => void handleSubmit()} type="button">
            Submit
          </Button>
        )}
        <TipTrigger />
      </>
    );
    return () => setActions(null);
  }, [setActions, weekStart, isReadOnly, week?.status]);

  // Row totals
  function rowTotal(projectId: string): number {
    return weekDays.reduce((sum, d) => {
      const key = `${projectId}::${d}`;
      return sum + (parseFloat(localValues[key] ?? '') || 0);
    }, 0);
  }

  // Day totals from local state
  function dayTotal(date: string): number {
    return projectIds.reduce((sum, pid) => {
      const key = `${pid}::${date}`;
      return sum + (parseFloat(localValues[key] ?? '') || 0);
    }, 0);
  }

  const grandTotal = weekDays.reduce((sum, d) => sum + dayTotal(d), 0);

  // Week summary
  const weekStartDate = new Date(weekStart + 'T00:00:00');
  const weekEndDate = addDays(weekStartDate, 6);
  const overallStatus = weekStatus;
  const statusLabelInfo = getStatusLabel(overallStatus);

  // Copy last week
  async function openCopyPopover(): Promise<void> {
    setCopyPopoverOpen(true);
    setPrevWeekData('loading');
    try {
      const prevWeekStart = addWeeks(weekStart, -1);
      const prevWeek = await fetchMyTimesheetWeek(prevWeekStart);
      const prevPids = getProjectRows(prevWeek.entries, []);
      if (prevPids.length === 0) {
        setPrevWeekData('empty');
      } else {
        setPrevWeekData({
          projectIds: prevPids,
          entries: prevWeek.entries.map((e) => ({ projectId: e.projectId, date: e.date, hours: e.hours })),
        });
      }
    } catch {
      setPrevWeekData('empty');
    }
  }

  async function copyLastWeek(withHours: boolean): Promise<void> {
    if (!prevWeekData || prevWeekData === 'loading' || prevWeekData === 'empty') return;
    const existingPids = new Set(projectIds);
    const prevDays = getWeekDays(addWeeks(weekStart, -1));

    for (const pid of prevWeekData.projectIds) {
      if (!existingPids.has(pid)) {
        // Add the project row
        await saveEntry({
          weekStart,
          projectId: pid,
          date: weekDays[0],
          hours: 0,
          capex: false,
        });
      }
    }

    if (withHours) {
      // Copy hours: map prev week's day-of-week to this week's day-of-week
      for (const entry of prevWeekData.entries) {
        if (entry.hours <= 0) continue;
        const prevDayIdx = prevDays.indexOf(entry.date);
        if (prevDayIdx < 0 || prevDayIdx >= 7) continue;
        const newDate = weekDays[prevDayIdx];
        const key = `${entry.projectId}::${newDate}`;
        setLocalValues((prev) => ({ ...prev, [key]: String(entry.hours) }));
        await saveEntry({
          weekStart,
          projectId: entry.projectId,
          date: newDate,
          hours: entry.hours,
          capex: false,
        });
      }
    }

    setCopyPopoverOpen(false);
    toast.success(withHours ? 'Copied projects and hours from last week' : 'Copied projects from last week');
  }

  // Filtered projects for add dialog
  const filteredProjects = useMemo(() => {
    if (!projectSearch) return availableProjects;
    const q = projectSearch.toLowerCase();
    return availableProjects.filter((p) => p.name.toLowerCase().includes(q));
  }, [availableProjects, projectSearch]);

  if (isLoading) return <LoadingState label="Loading timesheet..." variant="skeleton" skeletonType="table" />;
  if (error) return <ErrorState description={error} />;

  if (!principal?.personId) {
    return (
      <PageContainer testId="timesheet-page" viewport>
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Personal timesheets require a person identity. Use the &quot;View as&quot; feature to view another user&apos;s timesheet.
        </div>
      </PageContainer>
    );
  }

  // ds-trunk-13 — KPI + hero Timeline header for the redesigned weekly grid.
  const weekKpis = (() => {
    const entries = week?.entries ?? [];
    const filed = entries.reduce((sum, e) => sum + (e.hours || 0), 0);
    const expected = 40;
    const variance = filed - expected;
    const statusLabel =
      week?.status === 'APPROVED'
        ? 'Approved'
        : week?.status === 'SUBMITTED'
          ? 'Awaiting review'
          : week?.status === 'REJECTED'
            ? 'Rejected'
            : 'Draft';
    const statusTone: 'active' | 'warning' | 'danger' | 'neutral' =
      week?.status === 'APPROVED'
        ? 'active'
        : week?.status === 'SUBMITTED'
          ? 'warning'
          : week?.status === 'REJECTED'
            ? 'danger'
            : 'neutral';
    return { filed, expected, variance, statusLabel, statusTone };
  })();

  const heroSegments: TimelineSegment[] = (() => {
    if (!week) return [];
    type Acc = { projectId: string; hours: number; minDate: string; maxDate: string };
    const byProject = new Map<string, Acc>();
    for (const e of week.entries) {
      const cur = byProject.get(e.projectId);
      if (cur) {
        cur.hours += e.hours;
        if (e.date < cur.minDate) cur.minDate = e.date;
        if (e.date > cur.maxDate) cur.maxDate = e.date;
      } else {
        byProject.set(e.projectId, { projectId: e.projectId, hours: e.hours, minDate: e.date, maxDate: e.date });
      }
    }
    const status = week.status === 'APPROVED' ? 'booked' : week.status === 'SUBMITTED' ? 'proposed' : week.status === 'REJECTED' ? 'released' : 'draft';
    const out: TimelineSegment[] = [];
    for (const p of byProject.values()) {
      const projectName = projectNameMap.get(p.projectId) ?? 'Project';
      out.push({
        id: p.projectId,
        label: `${projectName} · ${p.hours.toFixed(1)}h`,
        startDate: p.minDate,
        endDate: p.maxDate,
        status,
        allocationPercent: Math.round((p.hours / 40) * 100),
      });
    }
    return out.sort((a, b) => (b.allocationPercent ?? 0) - (a.allocationPercent ?? 0));
  })();

  const weekEndStr = (() => {
    const d = new Date(weekStart);
    d.setUTCDate(d.getUTCDate() + 6);
    return d.toISOString().slice(0, 10);
  })();

  return (
    <PageContainer testId="timesheet-page" viewport>
      {/* KPI strip + hero Timeline — ds-trunk-13 surface #10 chrome refresh */}
      <div
        className="kpi-strip"
        aria-label="Timesheet summary"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}
      >
        <KpiTile
          label="Filed"
          value={`${weekKpis.filed.toFixed(1)}h`}
          tone={weekKpis.filed === 0 ? 'danger' : weekKpis.variance < -0.5 ? 'warning' : 'active'}
        />
        <KpiTile label="Expected" value={`${weekKpis.expected}h`} tone="neutral" />
        <KpiTile
          label="Variance"
          value={`${weekKpis.variance >= 0 ? '+' : ''}${weekKpis.variance.toFixed(1)}h`}
          tone={weekKpis.variance < -0.5 ? 'warning' : weekKpis.variance > 4 ? 'info' : 'active'}
        />
        <KpiTile label="Status" value={weekKpis.statusLabel} tone={weekKpis.statusTone} />
      </div>

      {heroSegments.length > 0 && (
        <div
          style={{
            marginBottom: 'var(--space-4)',
            padding: 'var(--space-3)',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              This week's logged hours by project
            </span>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              {weekStart} – {weekEndStr}
            </span>
          </div>
          <div style={{ height: 120 }}>
            <Timeline
              segments={heroSegments}
              colorMode="lifecycle"
              variant="stacked"
              size="md"
              rangeStart={weekStart}
              rangeEnd={weekEndStr}
              showToday
              ariaLabel="Logged hours by project for this week"
            />
          </div>
        </div>
      )}

      {/* Week Navigation */}
      <div className="timesheet-nav" style={{ position: 'relative' }}>
        <Button aria-label="Previous week" variant="secondary" onClick={() => navigateWeek(-1)} type="button">
          \u2190 Prev
        </Button>
        <Button
          ref={copyButtonRef}
          variant="secondary"
          onClick={() => void openCopyPopover()}
          type="button"
          disabled={isReadOnly}
        >
          Copy last week
        </Button>
        <span className="timesheet-nav__label">{formatWeekLabel(weekStart)}</span>
        <Button aria-label="Next week" variant="secondary" onClick={() => navigateWeek(1)} type="button">
          Next \u2192
        </Button>

        {/* Phase DS-2-6 — copy-week popover, anchored to "Copy last week" */}
        <Popover
          open={copyPopoverOpen}
          onClose={() => setCopyPopoverOpen(false)}
          anchorRef={copyButtonRef}
          placement="bottom-start"
        >
          <div style={{ padding: 'var(--space-3)', minWidth: 240 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Copy from previous week?</div>
            {prevWeekData === 'loading' && <div style={{ color: 'var(--color-text-muted)' }}>Loading...</div>}
            {prevWeekData === 'empty' && <div style={{ color: 'var(--color-text-muted)' }}>Previous week is empty</div>}
            {prevWeekData && prevWeekData !== 'loading' && prevWeekData !== 'empty' && (
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                <Button variant="primary" size="sm" onClick={() => void copyLastWeek(true)} type="button">
                  Copy with hours
                </Button>
                <Button variant="secondary" size="sm" onClick={() => void copyLastWeek(false)} type="button">
                  Copy projects only
                </Button>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
              <Button variant="ghost" size="sm" onClick={() => setCopyPopoverOpen(false)} type="button">
                Cancel
              </Button>
            </div>
          </div>
        </Popover>
      </div>

      {/* Week Status Summary Bar */}
      <div className="timesheet-week-summary">
        <strong>Week of {format(weekStartDate, 'MMM d')}\u2013{format(weekEndDate, 'd')}</strong>
        <span>\u00B7 {grandTotal.toFixed(1)}h logged</span>
        <span>\u00B7 {projectIds.length} project{projectIds.length !== 1 ? 's' : ''}</span>
        <span>\u00B7 <span style={{ color: statusLabelInfo.color }}>{statusLabelInfo.label}</span></span>
      </div>

      {/* Status + save indicator */}
      <div className="timesheet-status-bar">
        <span className={`badge badge--${week?.status?.toLowerCase() ?? 'draft'}`}>
          {week?.status ?? 'DRAFT'}
        </span>
        {saveStatus === 'saving' && <span className="timesheet-save-indicator">Saving\u2026</span>}
        {saveStatus === 'saved' && <span className="timesheet-save-indicator timesheet-save-indicator--saved">Saved \u2713</span>}
        {saveStatus === 'error' && <span className="timesheet-save-indicator timesheet-save-indicator--error">Save failed</span>}
      </div>

      {/* Grid */}
      <div className="timesheet-grid-wrapper">
        {projectIds.length === 0 ? (
          <div className="timesheet-grid__empty" style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No projects added. Click &quot;Add Row&quot; to begin.
          </div>
        ) : (
          <Table
            variant="compact"
            columns={[
              {
                key: 'project',
                title: 'Project',
                getValue: (projectId) => projectNameMap.get(projectId) ?? projectId,
                render: (projectId) => {
                  const statusInfo = getStatusIcon(weekStatus);
                  return (
                    <>
                      <span style={{ display: 'inline-block', width: '16px', height: '16px', textAlign: 'center', fontSize: '12px', color: statusInfo.color, verticalAlign: 'middle', marginRight: '4px' }}>
                        {statusInfo.icon}
                      </span>
                      <span className="project-name" title={projectNameMap.get(projectId) ?? projectId}>
                        {projectNameMap.get(projectId) ?? projectId}
                      </span>
                    </>
                  );
                },
              },
              ...visibleDayIndices.map((di) => {
                const date = weekDays[di];
                const isToday = date === todayStr;
                return {
                  key: `d-${date}`,
                  title: <><div>{DAY_LABELS[di]}</div><div style={{ fontSize: '10px', fontWeight: 400, opacity: 0.7 }}>{date.slice(5)}</div></>,
                  align: 'center' as const,
                  cellStyle: { width: '72px' },
                  headerClassName: isToday ? 'col-today' : undefined,
                  render: (projectId: string, rowIdx: number) => {
                    const cellKey = `${projectId}-${date}`;
                    const stateKey = `${projectId}::${date}`;
                    const val = getCellValue(projectId, date);
                    const isSaving = savingCells.has(cellKey);
                    const hasError = !!cellErrors[stateKey];
                    const rowLocked = weekStatus === 'SUBMITTED' || weekStatus === 'APPROVED';

                    const wrapperClasses = [
                      'timesheet-cell-wrapper',
                      isSaving ? 'timesheet-cell--saving' : '',
                      hasError ? 'timesheet-cell--error' : '',
                    ].filter(Boolean).join(' ');

                    return (
                      <div className={isToday ? 'col-today' : ''}>
                        <div className={wrapperClasses}>
                          <input
                            ref={(el) => { cellRefs.current[`${rowIdx}-${di}`] = el; }}
                            aria-label={`Hours for project ${projectId} on ${date}`}
                            className="timesheet-cell-input"
                            data-testid={`cell-${projectId}-${date}`}
                            disabled={rowLocked || isReadOnly}
                            max={24}
                            min={0}
                            placeholder="\u2014"
                            step={0.5}
                            type="number"
                            value={val}
                            onChange={(e) => handleCellInput(projectId, date, e.target.value)}
                            onBlur={() => handleCellBlur(projectId, date)}
                            onKeyDown={(e) => handleCellKeyDown(e, rowIdx, di)}
                          />
                        </div>
                        {hasError && (
                          <div style={{ fontSize: '10px', color: 'var(--color-status-danger)', textAlign: 'center' }}>
                            {cellErrors[stateKey]}
                          </div>
                        )}
                      </div>
                    );
                  },
                };
              }),
              {
                key: 'rowTotal',
                title: (
                  <>
                    Total
                    <IconButton
                      aria-label={showWeekend ? 'Hide weekend' : 'Show weekend'}
                      size="sm"
                      onClick={() => setShowWeekend((p) => !p)}
                      title="Show/hide weekend"
                      style={{ marginLeft: '4px', border: '1px solid var(--color-border)', borderRadius: '4px', fontSize: '11px', lineHeight: 1, color: 'var(--color-text-secondary)' }}
                    >
                      {showWeekend ? '\u2212' : '+'}
                    </IconButton>
                  </>
                ),
                align: 'center',
                cellStyle: { width: '64px' },
                getValue: (projectId) => rowTotal(projectId),
                render: (projectId) => <span style={{ fontWeight: 600, fontSize: '13px' }}>{rowTotal(projectId).toFixed(1)}h</span>,
              },
            ] as Column<string>[]}
            rows={projectIds}
            getRowKey={(projectId) => projectId}
            rowClassName={() => getRowStatusClass(weekStatus)}
            footer={
              <div style={{ display: 'grid', gridTemplateColumns: `1fr ${visibleDayIndices.map(() => '72px').join(' ')} 64px`, padding: 'var(--space-2) var(--space-3)', fontWeight: 700, background: 'var(--color-surface-alt)', fontSize: 12 }}>
                <span>Day Total</span>
                {visibleDayIndices.map((di) => {
                  const date = weekDays[di];
                  const dt = dayTotal(date);
                  let color: string | undefined;
                  let suffix = '';
                  if (dt === 0) {
                    color = 'var(--color-text-subtle)';
                  } else if (dt > 10) {
                    color = 'var(--color-status-danger)';
                    suffix = ' \u26A0';
                  } else if (dt > 8) {
                    color = 'var(--color-status-warning)';
                    suffix = ' \u26A0';
                  }
                  return (
                    <span key={date} style={{ textAlign: 'center', color }}>
                      {dt === 0 ? '\u2014' : `${dt.toFixed(1)}${suffix}`}
                    </span>
                  );
                })}
                <span className={`timesheet-grid__grand-total ${getGrandTotalClass(grandTotal)}`} style={{ textAlign: 'center' }}>
                  <strong>{grandTotal.toFixed(1)}h</strong>
                </span>
              </div>
            }
          />
        )}
      </div>

      {/* Phase DS-2-6 — description editor (modal-shaped despite the legacy "popover" name) */}
      <DescriptionPopover
        open={descPopover !== null && !isReadOnly}
        date={descPopover?.date ?? ''}
        initialValue={descPopover?.value ?? ''}
        onCancel={() => setDescPopover(null)}
        onSave={(val) => {
          if (descPopover) handleDescriptionSave(descPopover.projectId, descPopover.date, val);
        }}
        projectId={descPopover?.projectId ?? ''}
      />

      {/* Actions */}
      {!isReadOnly && (
        <div className="timesheet-actions">
          <Button variant="secondary" onClick={() => void autoPopulateFromAssignments()} type="button">
            Refresh from Assignments
          </Button>
          <Button variant="secondary" onClick={() => void openAddProjectDialog()} type="button">
            + Add Row
          </Button>
          <Button variant="primary" disabled={week?.status !== 'DRAFT'} onClick={() => void handleSubmit()} type="button">
            Submit for Approval
          </Button>
        </div>
      )}

      {isReadOnly && (
        <div className="timesheet-readonly-notice">
          This timesheet is <strong>{week?.status}</strong> and cannot be edited.
          {week?.rejectedReason && (
            <span> Rejection reason: {week.rejectedReason}</span>
          )}
        </div>
      )}

      {addProjectOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--color-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'var(--color-surface)', borderRadius: '8px', boxShadow: 'var(--shadow-modal)', padding: '24px', minWidth: '320px' }}>
            <h3 style={{ margin: '0 0 16px' }}>Add Project Row</h3>
            {availableProjects.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>No additional assigned projects available.</p>
            ) : (
              <>
                <label className="field">
                  <span className="field__label">Search projects</span>
                  <input
                    autoFocus
                    className="field__control"
                    onChange={(e) => setProjectSearch(e.target.value)}
                    placeholder="Type to filter..."
                    type="text"
                    value={projectSearch}
                  />
                </label>
                <label className="field" style={{ marginTop: '8px' }}>
                  <span className="field__label">Select a project</span>
                  <select
                    className="field__control"
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    value={selectedProjectId}
                  >
                    <option value="">\u2014 choose \u2014</option>
                    {filteredProjects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <Button variant="secondary" onClick={() => setAddProjectOpen(false)} type="button">Cancel</Button>
              <Button variant="primary" disabled={!selectedProjectId} onClick={confirmAddProject} type="button">Add</Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

// ─── Description Popover ──────────────────────────────────────────────────────

interface DescriptionPopoverProps {
  open: boolean;
  date: string;
  initialValue: string;
  onCancel: () => void;
  onSave: (value: string) => void;
  projectId: string;
}

/**
 * Phase DS-2-6 \u2014 rebuilt on `<Modal>`. Despite the legacy "Popover" name,
 * this is functionally a modal: centered overlay, focus trap, aria-modal.
 * The DS Modal handles backdrop / scroll lock / escape.
 */
function DescriptionPopover({
  open,
  date,
  initialValue,
  onCancel,
  onSave,
  projectId,
}: DescriptionPopoverProps): JSX.Element {
  const [value, setValue] = useState(initialValue);

  // Reset the textarea every time we re-open with new context.
  useEffect(() => {
    if (open) setValue(initialValue);
  }, [open, initialValue]);

  return (
    <Modal
      open={open}
      onClose={onCancel}
      size="sm"
      title={`Description \u2014 ${projectId} / ${date}`}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} type="button">Cancel</Button>
          <Button variant="primary" onClick={() => onSave(value)} type="button" data-autofocus="true">Save</Button>
        </>
      }
    >
      <Textarea
        autoFocus
        rows={3}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </Modal>
  );
}

// ds-trunk-13 — KPI tile used in the timesheet weekly header strip.
function KpiTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'active' | 'warning' | 'danger' | 'info' | 'neutral';
}): JSX.Element {
  const borderColor =
    tone === 'active'
      ? 'var(--color-status-active)'
      : tone === 'warning'
        ? 'var(--color-status-warning)'
        : tone === 'danger'
          ? 'var(--color-status-danger)'
          : tone === 'info'
            ? 'var(--color-status-info)'
            : 'var(--color-border-strong)';
  return (
    <div
      className="kpi-strip__item"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: 'var(--space-3) var(--space-4)',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-card)',
        border: '1px solid var(--color-border)',
        borderLeft: `3px solid ${borderColor}`,
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <span
        style={{
          fontSize: 11,
          color: 'var(--color-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: 'var(--color-text)',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.1,
        }}
      >
        {value}
      </span>
    </div>
  );
}
