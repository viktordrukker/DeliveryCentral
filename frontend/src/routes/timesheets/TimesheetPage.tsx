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
import { fetchAssignments } from '@/lib/api/assignments';
import { formatDateRange } from '@/lib/format-date';
import { fetchProjectDirectory } from '@/lib/api/project-registry';
import { fetchMyTimesheetWeek, UpsertEntryInput } from '@/lib/api/timesheets';

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
      return { icon: '\u23F3', color: 'var(--color-warning, #f57c00)' };
    case 'APPROVED':
      return { icon: '\u2713', color: 'var(--color-success, #2e7d32)' };
    case 'REJECTED':
      return { icon: '\u2717', color: 'var(--color-error, #d32f2f)' };
    default:
      return { icon: '\u25CF', color: 'var(--color-text-tertiary, #aaa)' };
  }
}

function getStatusLabel(status: WeekStatus): { label: string; color: string } {
  switch (status) {
    case 'REJECTED':
      return { label: 'Rejected', color: 'var(--color-error, #d32f2f)' };
    case 'SUBMITTED':
      return { label: 'Awaiting approval', color: 'var(--color-warning, #f57c00)' };
    case 'APPROVED':
      return { label: 'Approved \u2713', color: 'var(--color-success, #2e7d32)' };
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
      const [approvedResult, activeResult] = await Promise.all([
        fetchAssignments({ personId: principal.personId, status: 'APPROVED' }),
        fetchAssignments({ personId: principal.personId, status: 'ACTIVE' }),
      ]);
      const allItems = [...approvedResult.items, ...activeResult.items];
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
      const result = await fetchAssignments({ personId: principal.personId, status: 'APPROVED' });
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
        <button
          aria-label="Previous week"
          className="button button--secondary button--sm"
          onClick={() => navigateWeek(-1)}
          type="button"
        >
          {'\u2190'} Prev
        </button>
        <span style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>{formatWeekLabel(weekStart)}</span>
        <button
          aria-label="Next week"
          className="button button--secondary button--sm"
          onClick={() => navigateWeek(1)}
          type="button"
        >
          Next {'\u2192'}
        </button>
        {!isReadOnly && (
          <button
            className="button button--sm"
            disabled={week?.status !== 'DRAFT'}
            onClick={() => void handleSubmit()}
            type="button"
          >
            Submit
          </button>
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

  return (
    <PageContainer testId="timesheet-page" viewport>
      {/* Week Navigation */}
      <div className="timesheet-nav" style={{ position: 'relative' }}>
        <button
          aria-label="Previous week"
          className="button button--secondary"
          onClick={() => navigateWeek(-1)}
          type="button"
        >
          \u2190 Prev
        </button>
        <button
          className="button button--secondary"
          onClick={() => void openCopyPopover()}
          type="button"
          disabled={isReadOnly}
        >
          Copy last week
        </button>
        <span className="timesheet-nav__label">{formatWeekLabel(weekStart)}</span>
        <button
          aria-label="Next week"
          className="button button--secondary"
          onClick={() => navigateWeek(1)}
          type="button"
        >
          Next \u2192
        </button>

        {/* Copy last week popover */}
        {copyPopoverOpen && (
          <div className="copy-week-popover">
            <div style={{ fontWeight: 600, marginBottom: '8px' }}>Copy from previous week?</div>
            {prevWeekData === 'loading' && <div style={{ color: 'var(--color-text-secondary)' }}>Loading...</div>}
            {prevWeekData === 'empty' && <div style={{ color: 'var(--color-text-secondary)' }}>Previous week is empty</div>}
            {prevWeekData && prevWeekData !== 'loading' && prevWeekData !== 'empty' && (
              <div className="copy-week-popover__actions">
                <button className="button" onClick={() => void copyLastWeek(true)} type="button">
                  Copy with hours
                </button>
                <button className="button button--secondary" onClick={() => void copyLastWeek(false)} type="button">
                  Copy projects only
                </button>
              </div>
            )}
            <div className="copy-week-popover__actions" style={{ marginTop: '8px' }}>
              <button className="button button--secondary" onClick={() => setCopyPopoverOpen(false)} type="button">
                Cancel
              </button>
            </div>
          </div>
        )}
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
        <table className="timesheet-grid" role="grid" aria-label="Timesheet grid">
          <thead>
            <tr>
              <th className="col-project">Project</th>
              {visibleDayIndices.map((di) => {
                const date = weekDays[di];
                const isToday = date === todayStr;
                return (
                  <th key={date} className={isToday ? 'col-today' : ''} style={{ width: '72px' }}>
                    <div>{DAY_LABELS[di]}</div>
                    <div style={{ fontSize: '10px', fontWeight: 400, opacity: 0.7 }}>{date.slice(5)}</div>
                  </th>
                );
              })}
              <th style={{ width: '64px' }}>
                Total
                <button
                  type="button"
                  onClick={() => setShowWeekend((p) => !p)}
                  title="Show/hide weekend"
                  style={{
                    marginLeft: '4px',
                    background: 'none',
                    border: '1px solid var(--color-border)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    lineHeight: 1,
                    padding: '1px 4px',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {showWeekend ? '\u2212' : '+'}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {projectIds.length === 0 && (
              <tr>
                <td colSpan={visibleDayIndices.length + 2} className="timesheet-grid__empty" style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No projects added. Click &quot;Add Row&quot; to begin.
                </td>
              </tr>
            )}
            {projectIds.map((projectId, rowIdx) => {
              const statusInfo = getStatusIcon(weekStatus);
              const rowLocked = weekStatus === 'SUBMITTED' || weekStatus === 'APPROVED';
              return (
                <tr key={projectId} className={getRowStatusClass(weekStatus)}>
                  <td className="col-project">
                    <span style={{ display: 'inline-block', width: '16px', height: '16px', textAlign: 'center', fontSize: '12px', color: statusInfo.color, verticalAlign: 'middle', marginRight: '4px' }}>
                      {statusInfo.icon}
                    </span>
                    <span className="project-name" title={projectNameMap.get(projectId) ?? projectId}>
                      {projectNameMap.get(projectId) ?? projectId}
                    </span>
                  </td>
                  {visibleDayIndices.map((di) => {
                    const date = weekDays[di];
                    const cellKey = `${projectId}-${date}`;
                    const stateKey = `${projectId}::${date}`;
                    const val = getCellValue(projectId, date);
                    const isSaving = savingCells.has(cellKey);
                    const hasError = !!cellErrors[stateKey];
                    const isToday = date === todayStr;

                    const wrapperClasses = [
                      'timesheet-cell-wrapper',
                      isSaving ? 'timesheet-cell--saving' : '',
                      hasError ? 'timesheet-cell--error' : '',
                    ].filter(Boolean).join(' ');

                    return (
                      <td key={date} className={isToday ? 'col-today' : ''}>
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
                          <div style={{ fontSize: '10px', color: 'var(--color-error, #d32f2f)', textAlign: 'center' }}>
                            {cellErrors[stateKey]}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td style={{ textAlign: 'center', fontWeight: 600, fontSize: '13px' }}>
                    {rowTotal(projectId).toFixed(1)}h
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td className="col-project" style={{ fontWeight: 700, fontSize: '12px' }}>
                Day Total
              </td>
              {visibleDayIndices.map((di) => {
                const date = weekDays[di];
                const dt = dayTotal(date);
                let color: string | undefined;
                let suffix = '';
                if (dt === 0) {
                  color = 'var(--color-text-tertiary, #aaa)';
                } else if (dt > 10) {
                  color = 'var(--color-error, #d32f2f)';
                  suffix = ' \u26A0';
                } else if (dt > 8) {
                  color = 'var(--color-warning, #f57c00)';
                  suffix = ' \u26A0';
                }
                return (
                  <td key={date} style={{ textAlign: 'center', color }}>
                    {dt === 0 ? '\u2014' : `${dt.toFixed(1)}${suffix}`}
                  </td>
                );
              })}
              <td className={`timesheet-grid__grand-total ${getGrandTotalClass(grandTotal)}`} style={{ textAlign: 'center' }}>
                <strong>{grandTotal.toFixed(1)}h</strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Description popover */}
      {descPopover && !isReadOnly && (
        <DescriptionPopover
          date={descPopover.date}
          initialValue={descPopover.value}
          onCancel={() => setDescPopover(null)}
          onSave={(val) => handleDescriptionSave(descPopover.projectId, descPopover.date, val)}
          projectId={descPopover.projectId}
        />
      )}

      {/* Actions */}
      {!isReadOnly && (
        <div className="timesheet-actions">
          <button
            className="button button--secondary"
            onClick={() => void autoPopulateFromAssignments()}
            type="button"
          >
            Refresh from Assignments
          </button>
          <button
            className="button button--secondary"
            onClick={() => void openAddProjectDialog()}
            type="button"
          >
            + Add Row
          </button>
          <button
            className="button"
            disabled={week?.status !== 'DRAFT'}
            onClick={() => void handleSubmit()}
            type="button"
          >
            Submit for Approval
          </button>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'var(--color-surface)', borderRadius: '8px', boxShadow: '0 4px 24px rgba(0,0,0,0.18)', padding: '24px', minWidth: '320px' }}>
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
              <button className="button button--secondary" onClick={() => setAddProjectOpen(false)} type="button">Cancel</button>
              <button className="button" disabled={!selectedProjectId} onClick={confirmAddProject} type="button">Add</button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

// ─── Description Popover ──────────────────────────────────────────────────────

interface DescriptionPopoverProps {
  date: string;
  initialValue: string;
  onCancel: () => void;
  onSave: (value: string) => void;
  projectId: string;
}

function DescriptionPopover({
  date,
  initialValue,
  onCancel,
  onSave,
  projectId,
}: DescriptionPopoverProps): JSX.Element {
  const [value, setValue] = useState(initialValue);

  return (
    <div className="desc-popover-overlay" role="dialog" aria-modal="true">
      <div className="desc-popover">
        <h4 className="desc-popover__title">
          Description \u2014 {projectId} / {date}
        </h4>
        <textarea
          autoFocus
          className="field__control"
          onChange={(e) => setValue(e.target.value)}
          rows={3}
          value={value}
        />
        <div className="desc-popover__actions">
          <button className="button" onClick={() => onSave(value)} type="button">
            Save
          </button>
          <button className="button button--secondary" onClick={onCancel} type="button">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
