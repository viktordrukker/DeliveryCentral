import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useAuth } from '@/app/auth-context';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { useTimesheetWeek } from '@/features/timesheets/useTimesheetWeek';
import { fetchAssignments } from '@/lib/api/assignments';
import { fetchProjectDirectory } from '@/lib/api/project-registry';
import { UpsertEntryInput } from '@/lib/api/timesheets';

// ISO week helpers ─────────────────────────────────────────────────────────────

function getIsoWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay();
  // ISO week starts Monday (1). Sunday = 0 → treat as 7.
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

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatWeekLabel(weekStart: string): string {
  const d = new Date(weekStart);
  const end = new Date(weekStart);
  end.setUTCDate(d.getUTCDate() + 6);
  const startStr = `${MONTH_ABBR[d.getUTCMonth()]} ${d.getUTCDate()}`;
  const endStr = `${MONTH_ABBR[end.getUTCMonth()]} ${end.getUTCDate()}, ${end.getUTCFullYear()}`;
  return `${startStr} – ${endStr}`;
}

function getGrandTotalClass(total: number): string {
  if (total > 50) return 'timesheet-total--red';
  if (total >= 35 && total <= 45) return 'timesheet-total--green';
  return 'timesheet-total--yellow';
}

// Collect unique project IDs from entries + provided active projects
function getProjectRows(
  entries: Array<{ projectId: string }>,
  activeProjectIds: string[],
): string[] {
  const seen = new Set<string>([...activeProjectIds]);
  entries.forEach((e) => seen.add(e.projectId));
  return Array.from(seen);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TimesheetPage(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const { principal } = useAuth();
  const today = new Date();
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
    }).catch(() => { /* ignore – UUIDs will show as fallback */ });
    return () => { active = false; };
  }, []);

  // Capex toggles per project (local state, default false)
  const [capexByProject, setCapexByProject] = useState<Record<string, boolean>>({});

  // Add project row dialog state
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [availableProjects, setAvailableProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  // Description popover state
  const [descPopover, setDescPopover] = useState<{
    projectId: string;
    date: string;
    value: string;
  } | null>(null);

  // Debounce ref for auto-save
  const debounceRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const weekDays = getWeekDays(weekStart);

  // Derive project rows
  const projectIds = week ? getProjectRows(week.entries, []) : [];

  const isReadOnly = week?.status === 'APPROVED' || week?.status === 'REJECTED';

  // Get entry value
  function getHours(projectId: string, date: string): number {
    return week?.entries.find((e) => e.projectId === projectId && e.date === date)?.hours ?? 0;
  }

  function getDescription(projectId: string, date: string): string {
    return week?.entries.find((e) => e.projectId === projectId && e.date === date)?.description ?? '';
  }

  // Auto-save on blur
  const handleCellChange = useCallback(
    (projectId: string, date: string, hours: number) => {
      if (!week || isReadOnly) return;

      const key = `${projectId}::${date}`;
      const existing = debounceRef.current.get(key);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(() => {
        const entry: UpsertEntryInput = {
          weekStart,
          projectId,
          date,
          hours,
          capex: capexByProject[projectId] ?? false,
          description: getDescription(projectId, date),
        };
        void saveEntry(entry);
      }, 500);

      debounceRef.current.set(key, timer);
    },
    [week, isReadOnly, weekStart, capexByProject, saveEntry],
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
      // Deduplicate by assignment id
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
    void saveEntry({
      weekStart,
      projectId: selectedProjectId,
      date: weekDays[0],
      hours: 0,
      capex: false,
    });
    setAddProjectOpen(false);
  }

  async function handleSubmit(): Promise<void> {
    try {
      await submitWeek();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit.');
    }
  }

  // Row totals
  function rowTotal(projectId: string): number {
    return weekDays.reduce((sum, d) => sum + getHours(projectId, d), 0);
  }

  // Day totals
  function dayTotal(date: string): number {
    return projectIds.reduce((sum, pid) => sum + getHours(pid, date), 0);
  }

  const grandTotal = weekDays.reduce((sum, d) => sum + dayTotal(d), 0);

  if (isLoading) return <LoadingState label="Loading timesheet..." />;
  if (error) return <ErrorState description={error} />;

  if (!principal?.personId) {
    return (
      <PageContainer testId="timesheet-page" viewport>
        <PageHeader eyebrow="My Work" title="My Timesheet" />
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Personal timesheets require a person identity. Use the &quot;View as&quot; feature to view another user&apos;s timesheet.
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer testId="timesheet-page" viewport>
      <PageHeader
        eyebrow="My Work"
        title="My Timesheet"
        subtitle={formatWeekLabel(weekStart)}
      />

      {/* Week Navigation */}
      <div className="timesheet-nav">
        <button
          aria-label="Previous week"
          className="button button--secondary"
          onClick={() => navigateWeek(-1)}
          type="button"
        >
          ← Prev
        </button>
        <span className="timesheet-nav__label">{formatWeekLabel(weekStart)}</span>
        <button
          aria-label="Next week"
          className="button button--secondary"
          onClick={() => navigateWeek(1)}
          type="button"
        >
          Next →
        </button>
      </div>

      {/* Status + save indicator */}
      <div className="timesheet-status-bar">
        <span className={`badge badge--${week?.status?.toLowerCase() ?? 'draft'}`}>
          {week?.status ?? 'DRAFT'}
        </span>
        {saveStatus === 'saving' && <span className="timesheet-save-indicator">Saving…</span>}
        {saveStatus === 'saved' && <span className="timesheet-save-indicator timesheet-save-indicator--saved">Saved ✓</span>}
        {saveStatus === 'error' && <span className="timesheet-save-indicator timesheet-save-indicator--error">Save failed</span>}
      </div>

      {/* Grid */}
      <div className="timesheet-grid-wrapper">
        <table className="timesheet-grid" role="grid" aria-label="Timesheet grid">
          <thead>
            <tr>
              <th className="timesheet-grid__project-col">Project</th>
              <th className="timesheet-grid__capex-col">CAPEX</th>
              {weekDays.map((date, i) => (
                <th key={date} className="timesheet-grid__day-col">
                  <div>{DAY_LABELS[i]}</div>
                  <div className="timesheet-grid__date">{date.slice(5)}</div>
                </th>
              ))}
              <th className="timesheet-grid__total-col">Total</th>
            </tr>
          </thead>
          <tbody>
            {projectIds.length === 0 && (
              <tr>
                <td colSpan={weekDays.length + 3} className="timesheet-grid__empty">
                  No projects added. Click "Add Row" to begin.
                </td>
              </tr>
            )}
            {projectIds.map((projectId) => (
              <tr key={projectId}>
                <td className="timesheet-grid__project-col">
                  <span className="timesheet-grid__project-label" title={projectId}>
                    {projectNameMap.get(projectId) ?? projectId}
                  </span>
                </td>
                <td className="timesheet-grid__capex-col">
                  <input
                    aria-label={`CAPEX toggle for ${projectId}`}
                    checked={capexByProject[projectId] ?? false}
                    disabled={isReadOnly}
                    onChange={(e) =>
                      setCapexByProject((prev) => ({
                        ...prev,
                        [projectId]: e.target.checked,
                      }))
                    }
                    title="Check if this work is Capital Expenditure (CAPEX). Unchecked = Operating Expenditure (OPEX)"
                    type="checkbox"
                  />
                </td>
                {weekDays.map((date) => {
                  const cellKey = `${projectId}::${date}`;
                  return (
                    <td key={date} className="timesheet-grid__cell">
                      <input
                        aria-label={`Hours for project ${projectId} on ${date}`}
                        className="timesheet-grid__hours-input"
                        data-testid={`cell-${projectId}-${date}`}
                        defaultValue={getHours(projectId, date)}
                        disabled={isReadOnly}
                        key={cellKey}
                        max={24}
                        min={0}
                        onBlur={(e) =>
                          handleCellChange(projectId, date, parseFloat(e.target.value) || 0)
                        }
                        step={0.5}
                        type="number"
                      />
                      <button
                        aria-label={`Add description for ${projectId} on ${date}`}
                        className="timesheet-grid__desc-btn"
                        onClick={() =>
                          setDescPopover({
                            projectId,
                            date,
                            value: getDescription(projectId, date),
                          })
                        }
                        title={getDescription(projectId, date) || 'Add description'}
                        type="button"
                      >
                        {getDescription(projectId, date) ? '✏️' : '💬'}
                      </button>
                    </td>
                  );
                })}
                <td className="timesheet-grid__total-col">
                  <strong>{rowTotal(projectId).toFixed(1)}h</strong>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="timesheet-grid__footer-label">
                Day Total
              </td>
              {weekDays.map((date) => (
                <td key={date} className="timesheet-grid__day-total">
                  {dayTotal(date).toFixed(1)}
                </td>
              ))}
              <td className={`timesheet-grid__grand-total ${getGrandTotalClass(grandTotal)}`}>
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
            Auto-fill from Assignments
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
              <label className="field">
                <span className="field__label">Select a project</span>
                <select
                  className="field__control"
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  value={selectedProjectId}
                >
                  <option value="">— choose —</option>
                  {availableProjects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </label>
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
          Description — {projectId} / {date}
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
