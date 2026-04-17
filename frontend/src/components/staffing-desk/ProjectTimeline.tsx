import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import {
  fetchProjectTimeline,
  type ProjectTimelineResponse,
  type ProjectTimelineRow,
  type ProjectWeekData,
  type BenchPerson,
} from '@/lib/api/staffing-desk';
import { getCurrentWeekMonday, addDays } from '@/lib/workload-helpers';

/* ── Styles ── */
const S_TABLE: React.CSSProperties = { borderCollapse: 'collapse', fontSize: 11 };
const S_TH: React.CSSProperties = {
  padding: '4px 2px', fontSize: 9, fontWeight: 600, color: 'var(--color-text-muted)',
  borderBottom: '1px solid var(--color-border)', textAlign: 'center', whiteSpace: 'nowrap', minWidth: 54,
};
const S_MONTH_TH: React.CSSProperties = {
  padding: '3px 0', fontSize: 10, fontWeight: 700, color: 'var(--color-text)',
  borderBottom: '2px solid var(--color-border)', textAlign: 'center',
  background: 'var(--color-surface-alt)',
};
const S_NAME_TH: React.CSSProperties = {
  ...S_TH, position: 'sticky', left: 0, background: 'var(--color-surface-alt)',
  zIndex: 3, textAlign: 'left', minWidth: 180, padding: '4px 8px', fontSize: 11,
};
const S_NAME_TD: React.CSSProperties = {
  padding: '4px 8px', fontWeight: 500, fontSize: 11, position: 'sticky', left: 0,
  background: 'var(--color-surface)', zIndex: 1, borderRight: '1px solid var(--color-border)',
  borderBottom: '1px solid var(--color-border)', verticalAlign: 'top', minWidth: 180,
};
const S_CELL: React.CSSProperties = {
  padding: '2px 2px', verticalAlign: 'top', borderBottom: '1px solid var(--color-border)',
  borderRight: '1px solid var(--color-border)', minWidth: 54, minHeight: 32,
};
const S_SUPPLY_BLOCK: React.CSSProperties = {
  borderRadius: 2, padding: '1px 3px', fontSize: 8, marginBottom: 1,
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  background: 'var(--color-status-active)', color: '#fff', opacity: 0.85,
};
const S_DEMAND_BLOCK: React.CSSProperties = {
  borderRadius: 2, padding: '1px 3px', fontSize: 8, marginBottom: 1,
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  border: '1px dashed var(--color-status-warning)', color: 'var(--color-status-warning)',
  fontStyle: 'italic',
};
const S_BENCH_BLOCK: React.CSSProperties = {
  borderRadius: 2, padding: '1px 3px', fontSize: 8, marginBottom: 1,
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  background: 'var(--color-surface-alt)', color: 'var(--color-text-muted)',
  border: '1px solid var(--color-border)',
};

type Horizon = 13 | 26 | 39 | 52;
const HORIZONS: { label: string; weeks: Horizon }[] = [
  { label: '3m', weeks: 13 },
  { label: '6m', weeks: 26 },
  { label: '9m', weeks: 39 },
  { label: '12m', weeks: 52 },
];

function cellBg(supply: number, demand: number): string {
  if (demand > 0 && supply === 0) return 'rgba(239,68,68,0.12)'; // red — no supply, has demand
  if (demand > 0 && supply < demand) return 'rgba(245,158,11,0.10)'; // amber — understaffed
  if (supply > 0 && demand === 0) return 'rgba(34,197,94,0.08)'; // green — fully staffed
  return 'transparent';
}

/* ── Component ── */

interface SimulatedMove {
  id: string;
  personId: string;
  personName: string;
  allocationPercent: number;
  fromProjectId: string;
  toProjectId: string;
  weekStart: string;
}

interface Props {
  filters: { poolId?: string; projectId?: string };
}

export function ProjectTimeline({ filters }: Props): JSX.Element {
  const [data, setData] = useState<ProjectTimelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [horizon, setHorizon] = useState<Horizon>(13);
  const [weekOffset, setWeekOffset] = useState(0);
  const [simMode, setSimMode] = useState(false);
  const [simulations, setSimulations] = useState<SimulatedMove[]>([]);
  const [dragItem, setDragItem] = useState<{ personId: string; personName: string; allocationPercent: number; fromProjectId: string; weekStart: string } | null>(null);

  const baseMonday = useMemo(() => getCurrentWeekMonday(), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    const from = addDays(baseMonday, weekOffset * 7);

    fetchProjectTimeline({ from, weeks: horizon, poolId: filters.poolId, projectId: filters.projectId })
      .then((r) => { if (active) setData(r); })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : 'Failed to load timeline.'); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [baseMonday, weekOffset, horizon, filters.poolId, filters.projectId]);

  const goToToday = useCallback(() => setWeekOffset(0), []);
  const goPrev = useCallback(() => setWeekOffset((o) => o - 4), []);
  const goNext = useCallback(() => setWeekOffset((o) => o + 4), []);

  const handleSimDrop = useCallback((toProjectId: string, weekStart: string) => {
    if (!dragItem || dragItem.fromProjectId === toProjectId) { setDragItem(null); return; }
    setSimulations((prev) => [...prev, {
      id: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      personId: dragItem.personId,
      personName: dragItem.personName,
      allocationPercent: dragItem.allocationPercent,
      fromProjectId: dragItem.fromProjectId,
      toProjectId,
      weekStart,
    }]);
    setDragItem(null);
  }, [dragItem]);

  const discardSimulations = useCallback(() => { setSimulations([]); setSimMode(false); }, []);
  const removeSimulation = useCallback((id: string) => { setSimulations((prev) => prev.filter((s) => s.id !== id)); }, []);

  // Group weeks by month for header
  const monthHeaders = useMemo(() => {
    if (!data) return [];
    const months: { label: string; span: number }[] = [];
    let currentMonth = '';
    for (const ws of data.weeks) {
      const d = new Date(ws);
      const label = format(d, 'MMM yyyy');
      if (label === currentMonth) {
        months[months.length - 1].span++;
      } else {
        months.push({ label, span: 1 });
        currentMonth = label;
      }
    }
    return months;
  }, [data]);

  const currentWeek = baseMonday;

  if (loading) return <LoadingState variant="skeleton" skeletonType="table" />;
  if (error) return <ErrorState description={error} />;
  if (!data || data.projects.length === 0) return <EmptyState title="No projects" description="No projects with assignments or requests in this period." />;

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        {/* Horizon selector */}
        <div style={{ display: 'inline-flex', border: '1px solid var(--color-border)', borderRadius: 6, overflow: 'hidden' }}>
          {HORIZONS.map((h) => (
            <button
              key={h.weeks}
              type="button"
              className={horizon === h.weeks ? 'button button--sm' : 'button button--secondary button--sm'}
              style={{ borderRadius: 0, border: 'none', minWidth: 40 }}
              onClick={() => setHorizon(h.weeks)}
            >
              {h.label}
            </button>
          ))}
        </div>

        {/* Week navigation */}
        <div style={{ display: 'flex', gap: 'var(--space-1)', alignItems: 'center' }}>
          <button className="button button--secondary button--sm" onClick={goPrev} type="button">&laquo;</button>
          <button className="button button--secondary button--sm" onClick={goToToday} type="button">Today</button>
          <button className="button button--secondary button--sm" onClick={goNext} type="button">&raquo;</button>
        </div>

        {/* Simulate toggle */}
        <div style={{ display: 'flex', gap: 'var(--space-1)', alignItems: 'center' }}>
          <button
            className={simMode ? 'button button--sm' : 'button button--secondary button--sm'}
            onClick={() => setSimMode((v) => !v)}
            type="button"
            style={{ fontSize: 10 }}
          >
            {simMode ? 'Simulating' : 'Simulate'}
          </button>
          {simulations.length > 0 && (
            <>
              <span style={{ fontSize: 10, color: 'var(--color-status-warning)', fontWeight: 600 }}>
                {simulations.length} move{simulations.length > 1 ? 's' : ''}
              </span>
              <button className="button button--sm" type="button" style={{ fontSize: 10 }} onClick={() => { /* TODO: apply simulations as real assignments */ }}>
                Apply
              </button>
              <button className="button button--secondary button--sm" type="button" style={{ fontSize: 10 }} onClick={discardSimulations}>
                Discard
              </button>
            </>
          )}
        </div>

        <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
          {data.projects.length} projects &middot; {data.bench.length} bench
        </span>
      </div>

      {/* Grid */}
      <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 280px)' }}>
        <table style={S_TABLE}>
          {/* Month header row */}
          <thead>
            <tr>
              <th style={{ ...S_NAME_TH, borderBottom: '2px solid var(--color-border)' }} rowSpan={2}>Project</th>
              {monthHeaders.map((m, i) => (
                <th key={`${m.label}-${i}`} colSpan={m.span} style={S_MONTH_TH}>{m.label}</th>
              ))}
            </tr>
            {/* Week header row */}
            <tr>
              {data.weeks.map((w) => (
                <th key={w} style={{ ...S_TH, background: w === currentWeek ? 'var(--color-accent-bg)' : 'var(--color-surface-alt)' }}>
                  {format(new Date(w), 'dd MMM')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Project rows */}
            {data.projects.map((proj) => (
              <ProjectRow
                key={proj.projectId}
                project={proj}
                weeks={data.weeks}
                currentWeek={currentWeek}
                simMode={simMode}
                simulations={simulations.filter((s) => s.toProjectId === proj.projectId)}
                removedSims={simulations.filter((s) => s.fromProjectId === proj.projectId)}
                onDragStart={setDragItem}
                onDrop={handleSimDrop}
                onRemoveSim={removeSimulation}
              />
            ))}

            {/* Bench row */}
            {data.bench.length > 0 && (
              <tr>
                <td style={{ ...S_NAME_TD, background: 'var(--color-surface-alt)', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
                  Bench ({data.bench.length})
                  <div style={{ fontSize: 9, fontWeight: 400 }}>Available &lt;20% alloc</div>
                </td>
                {data.weeks.map((w, wi) => (
                  <td key={w} style={{ ...S_CELL, background: wi === 0 ? 'var(--color-surface-alt)' : undefined }}>
                    {wi === 0 && data.bench.slice(0, 8).map((b) => (
                      <div key={b.personId} style={S_BENCH_BLOCK} title={`${b.personName}: ${b.availablePercent}% free — ${b.skills.join(', ')}`}>
                        {b.personName.split(' ')[0]} {b.availablePercent}%
                      </div>
                    ))}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Project row ── */

function ProjectRow({ project, weeks, currentWeek, simMode, simulations, removedSims, onDragStart, onDrop, onRemoveSim }: {
  currentWeek: string;
  onDragStart: (item: { personId: string; personName: string; allocationPercent: number; fromProjectId: string; weekStart: string }) => void;
  onDrop: (toProjectId: string, weekStart: string) => void;
  onRemoveSim: (id: string) => void;
  project: ProjectTimelineRow;
  removedSims: SimulatedMove[];
  simMode: boolean;
  simulations: SimulatedMove[];
  weeks: string[];
}): JSX.Element {
  return (
    <tr>
      <td style={S_NAME_TD}>
        <div>{project.projectName}</div>
        <div style={{ fontSize: 9, color: 'var(--color-text-muted)', fontWeight: 400, marginTop: 1 }}>
          <span style={{ color: 'var(--color-status-active)' }}>{project.totalAssignments} assigned</span>
          {project.totalOpenRequests > 0 && (
            <span style={{ color: 'var(--color-status-warning)', marginLeft: 6 }}>{project.totalOpenRequests} open</span>
          )}
        </div>
      </td>
      {weeks.map((w) => {
        const wd = project.weekData.find((d) => d.weekStart === w);
        const weekSims = simulations.filter((s) => s.weekStart === w);
        const weekRemoved = removedSims.filter((s) => s.weekStart === w);
        return (
          <WeekCell
            key={w}
            data={wd}
            isCurrent={w === currentWeek}
            simMode={simMode}
            simBlocks={weekSims}
            removedPersonIds={new Set(weekRemoved.map((s) => s.personId))}
            projectId={project.projectId}
            weekStart={w}
            onDragStart={onDragStart}
            onDrop={onDrop}
            onRemoveSim={onRemoveSim}
          />
        );
      })}
    </tr>
  );
}

/* ── Week cell ── */

function WeekCell({ data, isCurrent, simMode, simBlocks, removedPersonIds, projectId, weekStart, onDragStart, onDrop, onRemoveSim }: {
  data?: ProjectWeekData;
  isCurrent: boolean;
  onDragStart: (item: { personId: string; personName: string; allocationPercent: number; fromProjectId: string; weekStart: string }) => void;
  onDrop: (toProjectId: string, weekStart: string) => void;
  onRemoveSim: (id: string) => void;
  projectId: string;
  removedPersonIds: Set<string>;
  simBlocks: SimulatedMove[];
  simMode: boolean;
  weekStart: string;
}): JSX.Element {
  const [dragOver, setDragOver] = useState(false);

  const bg = isCurrent ? 'var(--color-accent-bg)'
    : dragOver ? 'rgba(59,130,246,0.15)'
    : data ? cellBg(data.totalSupplyPercent, data.totalDemandPercent)
    : undefined;

  return (
    <td
      style={{ ...S_CELL, background: bg }}
      onDragOver={simMode ? (e) => { e.preventDefault(); setDragOver(true); } : undefined}
      onDragLeave={simMode ? () => setDragOver(false) : undefined}
      onDrop={simMode ? () => { setDragOver(false); onDrop(projectId, weekStart); } : undefined}
    >
      {/* Real assignments (dim if removed by simulation) */}
      {data?.assignments.slice(0, 3).map((a) => {
        const isRemoved = removedPersonIds.has(a.personId);
        return (
          <div
            key={a.assignmentId}
            draggable={simMode}
            onDragStart={simMode ? () => onDragStart({ personId: a.personId, personName: a.personName, allocationPercent: a.allocationPercent, fromProjectId: projectId, weekStart }) : undefined}
            style={{ ...S_SUPPLY_BLOCK, opacity: isRemoved ? 0.3 : 0.85, textDecoration: isRemoved ? 'line-through' : undefined, cursor: simMode ? 'grab' : undefined }}
            title={`${a.personName}: ${a.allocationPercent}% (${a.status})${simMode ? ' — drag to reassign' : ''}`}
          >
            {a.personName.split(' ')[0]} {a.allocationPercent}%
          </div>
        );
      })}
      {(data?.assignments.length ?? 0) > 3 && (
        <div style={{ fontSize: 7, color: 'var(--color-text-subtle)', textAlign: 'center' }}>+{(data?.assignments.length ?? 0) - 3}</div>
      )}

      {/* Simulated assignments (dotted, removable) */}
      {simBlocks.map((s) => (
        <div
          key={s.id}
          style={{
            ...S_SUPPLY_BLOCK,
            background: 'transparent',
            border: '1px dotted var(--color-accent)',
            color: 'var(--color-accent)',
            opacity: 0.8,
            cursor: 'pointer',
          }}
          title={`Simulated: ${s.personName} ${s.allocationPercent}% — click to remove`}
          onClick={() => onRemoveSim(s.id)}
        >
          {s.personName.split(' ')[0]} {s.allocationPercent}%
        </div>
      ))}

      {/* Demand blocks */}
      {data?.requests.slice(0, 2).map((r) => (
        <div key={r.requestId} style={S_DEMAND_BLOCK} title={`Need: ${r.role} ${r.allocationPercent}% (${r.priority}, ${r.headcountOpen} HC open)`}>
          {r.role.slice(0, 8)} {r.allocationPercent}%
        </div>
      ))}
    </td>
  );
}
