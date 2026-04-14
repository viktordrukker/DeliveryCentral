import { useEffect, useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { startOfWeek, format } from 'date-fns';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { FilterBar } from '@/components/common/FilterBar';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { fetchResourcePools, ResourcePool } from '@/lib/api/resource-pools';
import { fetchTeams } from '@/lib/api/teams';
import { fetchWorkloadPlanning, fetchCapacityForecast, WorkloadPlanningAssignment, WorkloadPlanningResponse, CapacityForecastWeek } from '@/lib/api/workload';
import { httpPatch } from '@/lib/api/http-client';
import { formatDateShort } from '@/lib/format-date';

/* ── Types ─────────────────────────────────────────────────────────────────── */

interface WhatIfAssignment {
  id: string;
  personId: string;
  projectName: string;
  allocationPercent: number;
  validFrom: string;
  validTo: string | null;
}

interface Team {
  id: string;
  name: string;
}

/* ── Date helpers ──────────────────────────────────────────────────────────── */

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function assignmentOverlapsWeek(
  assignment: { validFrom: string; validTo: string | null },
  weekStart: string,
): boolean {
  const weekEnd = addDays(weekStart, 7);
  const start = assignment.validFrom;
  const end = assignment.validTo ?? '9999-12-31';
  return start < weekEnd && end > weekStart;
}

function getTotalAllocationForWeek(
  assignments: WorkloadPlanningAssignment[],
  weekStart: string,
  whatIfAssignments: WhatIfAssignment[],
  personId: string,
): number {
  const real = assignments
    .filter((a) => assignmentOverlapsWeek(a, weekStart))
    .reduce((sum, a) => sum + a.allocationPercent, 0);

  const hypothetical = whatIfAssignments
    .filter((a) => a.personId === personId && assignmentOverlapsWeek(a, weekStart))
    .reduce((sum, a) => sum + a.allocationPercent, 0);

  return real + hypothetical;
}

/* ── Visual helpers ────────────────────────────────────────────────────────── */

const AVATAR_COLORS = ['#1976d2', '#388e3c', '#f57c00', '#7b1fa2', '#c62828', '#00838f', '#558b2f'];

function avatarColor(name: string): string {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function blockStyle(pct: number): { background: string; color: string } {
  if (pct >= 100) return { background: 'rgba(211,47,47,.20)', color: '#b71c1c' };
  if (pct >= 80) return { background: 'rgba(245,124,0,.20)', color: '#e65100' };
  if (pct >= 50) return { background: 'rgba(46,125,50,.26)', color: '#1b5e20' };
  return { background: 'rgba(46,125,50,.14)', color: '#2e7d32' };
}

function getCellBackground(total: number): string {
  if (total === 0) return '#f9fafb';
  if (total > 100) return '#fca5a5';
  if (total >= 80) return '#86efac';
  if (total >= 50) return '#93c5fd';
  return '#bfdbfe';
}

function getCellTextColor(total: number): string {
  if (total === 0) return '#9ca3af';
  if (total > 100) return '#991b1b';
  if (total >= 80) return '#14532d';
  return '#1e40af';
}

/* ── Current week helper ───────────────────────────────────────────────────── */

function getCurrentWeekMonday(): string {
  const d = startOfWeek(new Date(), { weekStartsOn: 1 });
  return format(d, 'yyyy-MM-dd');
}

/* ── Assignment Block (upgraded B2) ────────────────────────────────────────── */

function AssignmentBlock({
  assignment,
  onExtend,
  onShorten,
}: {
  assignment: WorkloadPlanningAssignment;
  onExtend: (id: string) => void;
  onShorten: (id: string) => void;
}): JSX.Element {
  const { background, color } = blockStyle(assignment.allocationPercent);

  return (
    <div
      className="assignment-block"
      style={{ background, color }}
      title={`${assignment.projectName}: ${assignment.allocationPercent}% (${assignment.validFrom} \u2013 ${assignment.validTo ?? 'open-ended'})`}
    >
      <span className="assignment-block__abbr">{assignment.projectName.slice(0, 3).toUpperCase()}</span>
      <span className="assignment-block__pct">{assignment.allocationPercent}%</span>
      <span style={{ display: 'inline-flex', gap: '1px', marginTop: '1px' }}>
        <button
          onClick={() => onShorten(assignment.id)}
          style={{
            background: 'none',
            border: `1px solid ${color}`,
            borderRadius: '2px',
            cursor: 'pointer',
            fontSize: '0.6rem',
            lineHeight: 1,
            padding: '0 2px',
            color,
          }}
          title="Shorten by 1 week"
          type="button"
        >
          \u25C0
        </button>
        <button
          onClick={() => onExtend(assignment.id)}
          style={{
            background: 'none',
            border: `1px solid ${color}`,
            borderRadius: '2px',
            cursor: 'pointer',
            fontSize: '0.6rem',
            lineHeight: 1,
            padding: '0 2px',
            color,
          }}
          title="Extend by 1 week"
          type="button"
        >
          \u25B6
        </button>
      </span>
    </div>
  );
}

/* ── Draggable what-if block (B3) ──────────────────────────────────────────── */

function DraggableWhatIfBlock({
  assignment,
  weekIndex,
  onRemove,
}: {
  assignment: WhatIfAssignment;
  weekIndex: number;
  onRemove: (id: string) => void;
}): JSX.Element {
  const { background, color } = blockStyle(assignment.allocationPercent);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${assignment.id}-${weekIndex}`,
    data: {
      assignmentId: assignment.id,
      personId: assignment.personId,
      weekIndex,
      allocationPercent: assignment.allocationPercent,
      projectName: assignment.projectName,
    },
  });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="assignment-block"
      style={{
        background,
        color,
        border: '1px dashed var(--color-warning, #f59e0b)',
        opacity: isDragging ? 0.5 : 1,
        cursor: 'grab',
        ...style,
      }}
      title={`[What-if] ${assignment.projectName}: ${assignment.allocationPercent}%`}
    >
      <span className="assignment-block__abbr">{assignment.projectName.slice(0, 3).toUpperCase()}</span>
      <span className="assignment-block__pct">{assignment.allocationPercent}%</span>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(assignment.id); }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontWeight: 700, fontSize: '10px', padding: 0 }}
        type="button"
      >
        \u2715
      </button>
    </div>
  );
}

/* ── Droppable cell (B3) ───────────────────────────────────────────────────── */

function PlanningDropCell({
  personId,
  weekIndex,
  wouldConflict,
  children,
}: {
  personId: string;
  weekIndex: number;
  wouldConflict: boolean;
  children: React.ReactNode;
}): JSX.Element {
  const { isOver, setNodeRef } = useDroppable({
    id: `${personId}-${weekIndex}`,
    data: { personId, weekIndex },
  });

  const conflict = isOver && wouldConflict;

  return (
    <td
      ref={setNodeRef}
      className={conflict ? 'planning-cell--conflict' : ''}
      style={{
        background: isOver && !conflict ? 'rgba(17,75,122,.06)' : undefined,
        padding: '4px',
        verticalAlign: 'top',
        minWidth: '80px',
        transition: 'background 0.1s',
      }}
    >
      {children}
    </td>
  );
}

/* ── Component ─────────────────────────────────────────────────────────────── */

export function WorkloadPlanningPage(): JSX.Element {
  const [planning, setPlanning] = useState<WorkloadPlanningResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pools, setPools] = useState<ResourcePool[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [poolId, setPoolId] = useState('');

  const [forecast, setForecast] = useState<CapacityForecastWeek[]>([]);
  const [atRiskSelected, setAtRiskSelected] = useState<CapacityForecastWeek | null>(null);

  // What-if mode
  const [whatIfMode, setWhatIfMode] = useState(false);
  const [whatIfAssignments, setWhatIfAssignments] = useState<WhatIfAssignment[]>([]);
  const [whatIfForm, setWhatIfForm] = useState({
    personId: '',
    projectName: '',
    allocationPercent: 50,
    validFrom: '',
    validTo: '',
  });

  // Week navigation (B5)
  const [weekOffset, setWeekOffset] = useState(0);

  // Person filter (B6)
  const [personFilter, setPersonFilter] = useState('');

  // DnD state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [conflictCells, setConflictCells] = useState<Set<string>>(new Set());

  const currentWeekMonday = getCurrentWeekMonday();

  useEffect(() => {
    void fetchResourcePools()
      .then((r) => setPools(r.items))
      .catch(() => undefined);

    void fetchTeams()
      .then((r) => setTeams(r.items ?? r))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    void fetchWorkloadPlanning({ poolId: poolId || undefined })
      .then((data) => {
        setPlanning(data);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load planning data.');
        setIsLoading(false);
      });
    void fetchCapacityForecast({ weeks: 12, poolId: poolId || undefined })
      .then(setForecast)
      .catch(() => undefined);
  }, [poolId]);

  // Compute displayed weeks from planning data + offset
  const displayedWeeks = useMemo(() => {
    if (!planning) return [];
    // The API returns weeks; we offset into them
    // If offset goes beyond what the API returned, we generate additional weeks
    const base = planning.weeks;
    if (base.length === 0) return [];
    const startDate = new Date(base[0]);
    const offsetStart = new Date(startDate);
    offsetStart.setUTCDate(offsetStart.getUTCDate() + weekOffset * 7);
    const weeks: string[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(offsetStart);
      d.setUTCDate(d.getUTCDate() + i * 7);
      weeks.push(d.toISOString().slice(0, 10));
    }
    return weeks;
  }, [planning, weekOffset]);

  // Filtered people
  const filteredPeople = useMemo(() => {
    if (!planning) return [];
    if (!personFilter) return planning.people;
    const q = personFilter.toLowerCase();
    return planning.people.filter((p) => p.displayName.toLowerCase().includes(q));
  }, [planning, personFilter]);

  function handleExtend(assignmentId: string): void {
    if (!planning) return;
    const assignment = planning.people
      .flatMap((p) => p.assignments)
      .find((a) => a.id === assignmentId);
    if (!assignment) return;

    const newValidTo = addDays(assignment.validTo ?? addDays(new Date().toISOString().slice(0, 10), 84), 7);
    void httpPatch(`/assignments/${assignmentId}`, { validTo: newValidTo })
      .then(() => {
        setPlanning((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            people: prev.people.map((p) => ({
              ...p,
              assignments: p.assignments.map((a) =>
                a.id === assignmentId ? { ...a, validTo: newValidTo } : a,
              ),
            })),
          };
        });
      })
      .catch(() => undefined);
  }

  function handleShorten(assignmentId: string): void {
    if (!planning) return;
    const assignment = planning.people
      .flatMap((p) => p.assignments)
      .find((a) => a.id === assignmentId);
    if (!assignment) return;

    const currentEnd = assignment.validTo ?? addDays(new Date().toISOString().slice(0, 10), 84);
    const newValidTo = addDays(currentEnd, -7);
    if (newValidTo <= assignment.validFrom) return;

    void httpPatch(`/assignments/${assignmentId}`, { validTo: newValidTo })
      .then(() => {
        setPlanning((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            people: prev.people.map((p) => ({
              ...p,
              assignments: p.assignments.map((a) =>
                a.id === assignmentId ? { ...a, validTo: newValidTo } : a,
              ),
            })),
          };
        });
      })
      .catch(() => undefined);
  }

  function handleAddWhatIf(): void {
    if (!whatIfForm.personId || !whatIfForm.projectName || !whatIfForm.validFrom) return;
    setWhatIfAssignments((prev) => [
      ...prev,
      {
        id: `whatif-${Date.now()}`,
        personId: whatIfForm.personId,
        projectName: whatIfForm.projectName,
        allocationPercent: whatIfForm.allocationPercent,
        validFrom: whatIfForm.validFrom,
        validTo: whatIfForm.validTo || null,
      },
    ]);
    setWhatIfForm({ personId: '', projectName: '', allocationPercent: 50, validFrom: '', validTo: '' });
  }

  function handleRemoveWhatIf(id: string): void {
    setWhatIfAssignments((prev) => prev.filter((a) => a.id !== id));
  }

  // DnD handlers (B3)
  function handleDragStart(e: DragStartEvent): void {
    setActiveId(e.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent): void {
    setActiveId(null);
    const { active, over } = event;
    if (!over || !active.data.current) return;

    const data = active.data.current as {
      assignmentId: string;
      personId: string;
      weekIndex: number;
      allocationPercent: number;
      projectName: string;
    };

    const targetPersonId = over.data.current?.personId as string | undefined;
    const targetWeekIndex = over.data.current?.weekIndex as number | undefined;

    if (targetPersonId === undefined || targetWeekIndex === undefined) return;

    // Update what-if assignment in local state
    setWhatIfAssignments((prev) =>
      prev.map((a) => {
        if (a.id !== data.assignmentId) return a;
        // Move to new person and adjust dates to target week
        const targetWeek = displayedWeeks[targetWeekIndex];
        if (!targetWeek) return a;
        const duration = a.validTo ? (new Date(a.validTo).getTime() - new Date(a.validFrom).getTime()) / (1000 * 60 * 60 * 24) : null;
        return {
          ...a,
          personId: targetPersonId,
          validFrom: targetWeek,
          validTo: duration !== null ? addDays(targetWeek, duration) : a.validTo,
        };
      }),
    );

    // Check if target cell total > 100 after the move
    const targetWeek = displayedWeeks[targetWeekIndex];
    if (targetWeek) {
      const person = filteredPeople.find((p) => p.id === targetPersonId);
      if (person) {
        // Calculate new total (the setWhatIfAssignments hasn't resolved yet, so compute manually)
        const updatedWhatIfs = whatIfAssignments.map((a) => {
          if (a.id !== data.assignmentId) return a;
          const dur = a.validTo ? (new Date(a.validTo).getTime() - new Date(a.validFrom).getTime()) / (1000 * 60 * 60 * 24) : null;
          return { ...a, personId: targetPersonId, validFrom: targetWeek, validTo: dur !== null ? addDays(targetWeek, dur) : a.validTo };
        });
        const newTotal = getTotalAllocationForWeek(person.assignments, targetWeek, updatedWhatIfs, targetPersonId);
        if (newTotal > 100) {
          const cellKey = `${targetPersonId}-${targetWeekIndex}`;
          setConflictCells((prev) => new Set(prev).add(cellKey));
          setTimeout(() => {
            setConflictCells((prev) => {
              const next = new Set(prev);
              next.delete(cellKey);
              return next;
            });
          }, 2000);
        }
      }
    }
  }

  // Get the dragged what-if for overlay
  const draggedWhatIf = activeId
    ? whatIfAssignments.find((a) => activeId.startsWith(a.id))
    : null;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Workload"
        subtitle="12-week forward planning view of team assignments, showing allocation per person per week."
        title="Workload Planning Timeline"
      />

      <FilterBar>
        <label className="field">
          <span className="field__label">Resource Pool</span>
          <select
            className="field__control"
            onChange={(e) => setPoolId(e.target.value)}
            value={poolId}
          >
            <option value="">All pools</option>
            {pools.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>

        <label className="field" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="field__label">What-if mode</span>
          <input
            checked={whatIfMode}
            onChange={(e) => setWhatIfMode(e.target.checked)}
            type="checkbox"
          />
        </label>
      </FilterBar>

      {/* Week navigation (B5) */}
      <div style={{ display: 'flex', gap: 'var(--space-2, 8px)', alignItems: 'center', marginBottom: 'var(--space-3, 12px)' }}>
        <button className="button button--secondary" onClick={() => setWeekOffset((o) => o - 1)} type="button">
          \u2190 Prev
        </button>
        <button className="button button--secondary" disabled={weekOffset === 0} onClick={() => setWeekOffset(0)} type="button">
          Today
        </button>
        <button className="button button--secondary" onClick={() => setWeekOffset((o) => o + 1)} type="button">
          Next \u2192
        </button>
      </div>

      {/* Person filter (B6) */}
      <div style={{ marginBottom: 'var(--space-3, 12px)' }}>
        <input
          className="field__control"
          onChange={(e) => setPersonFilter(e.target.value)}
          placeholder="Filter people..."
          style={{ maxWidth: '220px' }}
          type="text"
          value={personFilter}
        />
      </div>

      {whatIfMode ? (
        <div
          style={{
            background: '#fffbeb',
            border: '1px solid #fcd34d',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1rem',
          }}
        >
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 700, color: '#92400e' }}>
            What-If Mode {'\u2014'} Add Hypothetical Assignment
          </h3>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label className="field" style={{ flex: '1 1 140px' }}>
              <span className="field__label">Person</span>
              <select
                className="field__control"
                onChange={(e) => setWhatIfForm((f) => ({ ...f, personId: e.target.value }))}
                value={whatIfForm.personId}
              >
                <option value="">Select person\u2026</option>
                {planning?.people.map((p) => (
                  <option key={p.id} value={p.id}>{p.displayName}</option>
                ))}
              </select>
            </label>

            <label className="field" style={{ flex: '1 1 140px' }}>
              <span className="field__label">Project name</span>
              <input
                className="field__control"
                onChange={(e) => setWhatIfForm((f) => ({ ...f, projectName: e.target.value }))}
                placeholder="Hypothetical project"
                type="text"
                value={whatIfForm.projectName}
              />
            </label>

            <label className="field" style={{ flex: '0 1 80px' }}>
              <span className="field__label">Allocation %</span>
              <input
                className="field__control"
                max={200}
                min={1}
                onChange={(e) => setWhatIfForm((f) => ({ ...f, allocationPercent: Number(e.target.value) }))}
                type="number"
                value={whatIfForm.allocationPercent}
              />
            </label>

            <label className="field" style={{ flex: '1 1 120px' }}>
              <span className="field__label">From</span>
              <input
                className="field__control"
                onChange={(e) => setWhatIfForm((f) => ({ ...f, validFrom: e.target.value }))}
                type="date"
                value={whatIfForm.validFrom}
              />
            </label>

            <label className="field" style={{ flex: '1 1 120px' }}>
              <span className="field__label">To (optional)</span>
              <input
                className="field__control"
                onChange={(e) => setWhatIfForm((f) => ({ ...f, validTo: e.target.value }))}
                type="date"
                value={whatIfForm.validTo}
              />
            </label>

            <button
              className="button button--primary"
              onClick={handleAddWhatIf}
              style={{ alignSelf: 'flex-end' }}
              type="button"
            >
              Add
            </button>
          </div>

          {whatIfAssignments.length > 0 ? (
            <div style={{ marginTop: '0.75rem' }}>
              <strong style={{ fontSize: '0.8rem' }}>Hypothetical assignments:</strong>
              <ul style={{ margin: '4px 0 0', padding: '0 0 0 1.2rem', fontSize: '0.8rem' }}>
                {whatIfAssignments.map((a) => (
                  <li key={a.id} style={{ marginBottom: '2px' }}>
                    {planning?.people.find((p) => p.id === a.personId)?.displayName ?? a.personId}
                    {' \u2014 '}
                    {a.projectName} ({a.allocationPercent}%) {a.validFrom} \u2013 {a.validTo ?? 'open'}
                    {' '}
                    <button
                      onClick={() => handleRemoveWhatIf(a.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontWeight: 700 }}
                      type="button"
                    >
                      \u2715
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {isLoading ? <LoadingState label="Loading planning timeline..." variant="skeleton" skeletonType="chart" /> : null}
      {error ? <ErrorState description={error} /> : null}

      {forecast.length > 0 ? (
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#374151', marginBottom: '0.5rem' }}>
            12-Week Capacity Forecast
          </h3>
          <div className="capacity-chart-wrapper">
            <ResponsiveContainer height={220} width="100%">
              <AreaChart
                data={forecast.map((w) => ({
                  week: w.week.slice(5),
                  bench: w.projectedBench,
                  atRisk: w.atRiskPeople.length,
                  absorption: w.expectedAbsorptionDays,
                  _raw: w,
                }))}
                margin={{ top: 4, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Area
                  dataKey="bench"
                  fill="#bfdbfe"
                  name="On Bench"
                  stroke="#3b82f6"
                  type="monotone"
                />
                <Area
                  dataKey="atRisk"
                  fill="#fca5a5"
                  name="At Risk"
                  onClick={(data: unknown) => {
                    const d = data as { _raw?: CapacityForecastWeek } | undefined;
                    if (d?._raw) setAtRiskSelected(d._raw);
                  }}
                  stroke="#ef4444"
                  style={{ cursor: 'pointer' }}
                  type="monotone"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {atRiskSelected ? (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                borderRadius: '6px',
                padding: '0.75rem',
                marginTop: '0.5rem',
              }}
            >
              <strong style={{ fontSize: '0.8rem' }}>At-risk people \u2014 week of {atRiskSelected.week}</strong>
              {atRiskSelected.atRiskPeople.length === 0 ? (
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#6b7280' }}>None</p>
              ) : (
                <ul style={{ margin: '4px 0 0', padding: '0 0 0 1.2rem', fontSize: '0.8rem' }}>
                  {atRiskSelected.atRiskPeople.map((p) => (
                    <li key={p.personId}>
                      {p.displayName} \u2014 assignment ends {formatDateShort(p.assignmentEndsAt)}
                    </li>
                  ))}
                </ul>
              )}
              <button
                onClick={() => setAtRiskSelected(null)}
                style={{ marginTop: '4px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: '#6b7280' }}
                type="button"
              >
                Dismiss
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {!isLoading && !error && planning ? (
        filteredPeople.length === 0 && !personFilter ? (
          <EmptyState
            description="No assignments found in the next 12 weeks for the current filters."
            title="No planning data"
          />
        ) : (
          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <table
                style={{
                  borderCollapse: 'collapse',
                  fontSize: '0.8rem',
                  width: '100%',
                }}
              >
                <thead>
                  <tr style={{ background: '#f3f4f6' }}>
                    <th
                      style={{
                        position: 'sticky',
                        left: 0,
                        background: '#f3f4f6',
                        zIndex: 2,
                        padding: '8px 12px',
                        textAlign: 'left',
                        borderBottom: '2px solid #e5e7eb',
                        minWidth: '160px',
                      }}
                    >
                      Person
                    </th>
                    {displayedWeeks.map((week) => {
                      const isCurrentWeek = week === currentWeekMonday;
                      return (
                        <th
                          key={week}
                          className={isCurrentWeek ? 'col-today-marker' : ''}
                          style={{
                            padding: '6px 4px',
                            textAlign: 'center',
                            borderBottom: '2px solid #e5e7eb',
                            minWidth: '80px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            color: '#374151',
                          }}
                        >
                          {week.slice(5)}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filteredPeople.map((person) => {
                    // Average allocation across visible weeks (B4)
                    const weekTotals = displayedWeeks.map((w) =>
                      getTotalAllocationForWeek(person.assignments, w, whatIfAssignments, person.id),
                    );
                    const avgPct = weekTotals.length > 0
                      ? Math.round(weekTotals.reduce((s, v) => s + v, 0) / weekTotals.length)
                      : 0;
                    const initial = person.displayName[0]?.toUpperCase() ?? '?';

                    return (
                      <tr key={person.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td
                          style={{
                            position: 'sticky',
                            left: 0,
                            background: 'white',
                            zIndex: 1,
                            padding: '6px 12px',
                            fontWeight: 500,
                            verticalAlign: 'top',
                          }}
                        >
                          <div className="planning-person-cell">
                            <div className="planning-person-avatar" style={{ background: avatarColor(person.displayName) }}>
                              {initial}
                            </div>
                            <div className="planning-person-info">
                              <span className="planning-person-name">{person.displayName}</span>
                              <div className="planning-person-bar" title={`Avg ${avgPct}% across visible weeks`}>
                                <div
                                  className="planning-person-bar__fill"
                                  style={{
                                    width: `${Math.min(avgPct, 100)}%`,
                                    background: avgPct > 95
                                      ? 'var(--color-error, #d32f2f)'
                                      : avgPct > 80
                                        ? 'var(--color-warning, #f57c00)'
                                        : 'var(--color-success, #2e7d32)',
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </td>
                        {displayedWeeks.map((week, weekIdx) => {
                          const total = getTotalAllocationForWeek(person.assignments, week, whatIfAssignments, person.id);
                          const weekAssignments = person.assignments.filter((a) =>
                            assignmentOverlapsWeek(a, week),
                          );
                          const bg = getCellBackground(total);
                          const textColor = getCellTextColor(total);
                          const cellConflictKey = `${person.id}-${weekIdx}`;
                          const hasTemporaryConflict = conflictCells.has(cellConflictKey);

                          const weekWhatIfs = whatIfAssignments.filter(
                            (a) => a.personId === person.id && assignmentOverlapsWeek(a, week),
                          );

                          // Would adding a dragged item cause > 100%?
                          const wouldConflict = activeId
                            ? (() => {
                                const dragData = whatIfAssignments.find((a) => activeId.startsWith(a.id));
                                if (!dragData) return false;
                                return total + dragData.allocationPercent > 100;
                              })()
                            : false;

                          const cellContent = (
                            <>
                              {total > 0 ? (
                                <div
                                  style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    textAlign: 'center',
                                    color: textColor,
                                    marginBottom: '2px',
                                  }}
                                >
                                  {total}%
                                  {total > 100 ? (
                                    <span
                                      style={{
                                        marginLeft: '2px',
                                        fontSize: '0.65rem',
                                        background: '#dc2626',
                                        color: 'white',
                                        borderRadius: '3px',
                                        padding: '0 3px',
                                      }}
                                      title="Over-allocated"
                                    >
                                      !
                                    </span>
                                  ) : null}
                                </div>
                              ) : null}
                              {weekAssignments.map((assignment) => (
                                <AssignmentBlock
                                  assignment={assignment}
                                  key={assignment.id}
                                  onExtend={handleExtend}
                                  onShorten={handleShorten}
                                />
                              ))}
                              {whatIfMode && weekWhatIfs.map((a) => (
                                <DraggableWhatIfBlock
                                  key={a.id}
                                  assignment={a}
                                  weekIndex={weekIdx}
                                  onRemove={handleRemoveWhatIf}
                                />
                              ))}
                            </>
                          );

                          if (whatIfMode) {
                            return (
                              <PlanningDropCell
                                key={week}
                                personId={person.id}
                                weekIndex={weekIdx}
                                wouldConflict={wouldConflict}
                              >
                                <div
                                  className={hasTemporaryConflict ? 'planning-cell--conflict' : ''}
                                  style={{ background: bg, minHeight: '40px' }}
                                >
                                  {cellContent}
                                </div>
                              </PlanningDropCell>
                            );
                          }

                          return (
                            <td
                              key={week}
                              style={{
                                background: bg,
                                padding: '4px',
                                verticalAlign: 'top',
                                minWidth: '80px',
                              }}
                            >
                              {cellContent}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}

                  {filteredPeople.length === 0 && personFilter && (
                    <tr>
                      <td colSpan={displayedWeeks.length + 1} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                        No people match the filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <DragOverlay>
                {draggedWhatIf ? (
                  <div
                    className="assignment-block"
                    style={{
                      ...blockStyle(draggedWhatIf.allocationPercent),
                      border: '1px dashed var(--color-warning, #f59e0b)',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    }}
                  >
                    <span className="assignment-block__abbr">{draggedWhatIf.projectName.slice(0, 3).toUpperCase()}</span>
                    <span className="assignment-block__pct">{draggedWhatIf.allocationPercent}%</span>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>

            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', fontSize: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 14, height: 14, background: '#bfdbfe', display: 'inline-block', borderRadius: 3 }} />
                1\u201349% allocated
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 14, height: 14, background: '#93c5fd', display: 'inline-block', borderRadius: 3 }} />
                50\u201379%
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 14, height: 14, background: '#86efac', display: 'inline-block', borderRadius: 3 }} />
                80\u2013100%
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 14, height: 14, background: '#fca5a5', display: 'inline-block', borderRadius: 3 }} />
                &gt;100% (conflict)
              </span>
              {whatIfMode ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: 14, height: 14, background: '#fef3c7', border: '1px dashed #f59e0b', display: 'inline-block', borderRadius: 3 }} />
                  Hypothetical assignment
                </span>
              ) : null}
            </div>
          </div>
        )
      ) : null}
    </PageContainer>
  );
}
