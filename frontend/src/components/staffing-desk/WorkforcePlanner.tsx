import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PlannerBenchSidebar } from '@/components/staffing-desk/PlannerBenchSidebar';
import { PlannerApplyDrawer } from '@/components/staffing-desk/PlannerApplyDrawer';
import { PlannerAutoMatchPreviewModal } from '@/components/staffing-desk/PlannerAutoMatchPreviewModal';
import { PlannerForceAssignPopover, type PendingForceAssign } from '@/components/staffing-desk/PlannerForceAssignPopover';
import { PlannerCellDetailPopover, type CellDetail } from '@/components/staffing-desk/PlannerCellDetailPopover';
import { PlannerExtendAssignmentModal, type ExtendTarget } from '@/components/staffing-desk/PlannerExtendAssignmentModal';
import { PlannerAnomalyTable } from '@/components/staffing-desk/PlannerAnomalyTable';
import { PlannerDraftAssignmentModal } from '@/components/staffing-desk/PlannerDraftAssignmentModal';
import { PlannerWhyNotModal } from '@/components/staffing-desk/PlannerWhyNotModal';
import { PlannerScenariosMenu } from '@/components/staffing-desk/PlannerScenariosMenu';
import {
  fetchWorkforcePlanner,
  fetchAutoMatch,
  applyPlan,
  type WorkforcePlannerResponse,
  type AutoMatchStrategy,
  type CellClass,
  type PlannerBenchPerson,
  type PlannerDemandBlock,
  type PlannerProjectRow,
  type PlannerProjectWeek,
  type ProjectStatusFilter,
  type PriorityFilter,
} from '@/lib/api/staffing-desk';
import { useAuth } from '@/app/auth-context';
import { getCurrentWeekMonday, addDays } from '@/lib/workload-helpers';
import { usePlannerSimulation, type ForceAssignReason } from '@/features/staffing-desk/usePlannerSimulation';
import { useOutsideClick } from '@/hooks/useOutsideClick';

interface Props { poolId?: string; orgUnitId?: string }

type Horizon = 13 | 26 | 39 | 52;
const HORIZONS: { label: string; weeks: Horizon }[] = [
  { label: '3m', weeks: 13 }, { label: '6m', weeks: 26 }, { label: '9m', weeks: 39 }, { label: '12m', weeks: 52 },
];

type HeatLayer = 'coverage' | 'cost' | 'match' | 'risk';
const LAYERS: { value: HeatLayer; label: string }[] = [
  { value: 'coverage', label: 'Coverage' },
  { value: 'cost', label: 'Cost' },
  { value: 'match', label: 'Match' },
  { value: 'risk', label: 'Risk' },
];

const ALL_STATUSES: readonly ProjectStatusFilter[] = ['ACTIVE', 'DRAFT', 'ON_HOLD', 'CLOSED', 'COMPLETED', 'ARCHIVED'];
const ALL_PRIORITIES: readonly PriorityFilter[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];

function FilterChip<T extends string>({ label, options, values, onChange }: {
  label: string;
  options: readonly T[];
  values: T[];
  onChange: (next: T[]) => void;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const wrapRef = useOutsideClick<HTMLDivElement>(open, close);
  const allSelected = values.length === options.length;
  const summary = values.length === 0 ? 'none' : allSelected ? 'all' : values.length === 1 ? values[0] : `${values.length} selected`;
  return (
    <div ref={wrapRef} style={{ position: 'relative' }} data-filter-chip>
      <button
        type="button"
        className="button button--secondary button--sm"
        onClick={() => setOpen((v) => !v)}
        style={{ fontSize: 10 }}
      >
        {label}: {summary} ▾
      </button>
      {open && (
        <div
          style={{
            position: 'absolute', top: 28, left: 0, zIndex: 60,
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 6, boxShadow: 'var(--shadow-dropdown)',
            padding: 6, minWidth: 160, fontSize: 11,
          }}
        >
          {options.map((opt) => {
            const checked = values.includes(opt);
            return (
              <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 4px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    if (checked) onChange(values.filter((v) => v !== opt));
                    else onChange([...values, opt]);
                  }}
                />
                <span>{opt.replace(/_/g, ' ').toLowerCase()}</span>
              </label>
            );
          })}
          <div style={{ display: 'flex', gap: 4, marginTop: 4, borderTop: '1px solid var(--color-border)', paddingTop: 4 }}>
            <button type="button" className="button button--secondary button--sm" onClick={() => onChange([...options])} style={{ fontSize: 9, flex: 1 }}>All</button>
            <button type="button" className="button button--secondary button--sm" onClick={() => onChange([])} style={{ fontSize: 9, flex: 1 }}>None</button>
            <button type="button" className="button button--sm" onClick={() => setOpen(false)} style={{ fontSize: 9, flex: 1 }}>Apply</button>
          </div>
        </div>
      )}
    </div>
  );
}

function costHeatColor(weeklyCost: number, maxWeeklyCost: number): string {
  if (maxWeeklyCost <= 0 || weeklyCost <= 0) return 'transparent';
  const ratio = Math.min(1, weeklyCost / maxWeeklyCost);
  // green (low) → amber (mid) → red (high)
  if (ratio < 0.33) return `rgba(34,197,94,${0.05 + ratio * 0.15})`;
  if (ratio < 0.66) return `rgba(245,158,11,${0.05 + (ratio - 0.33) * 0.18})`;
  return `rgba(239,68,68,${0.08 + (ratio - 0.66) * 0.22})`;
}

function matchHeatColor(avgScore: number): string {
  if (avgScore <= 0) return 'transparent';
  if (avgScore >= 0.7) return 'rgba(34,197,94,0.12)';
  if (avgScore >= 0.4) return 'rgba(245,158,11,0.12)';
  return 'rgba(239,68,68,0.14)';
}

/* ── Styles ── */
const S_TOOLBAR: React.CSSProperties = { display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap', padding: 'var(--space-2) var(--space-2)', borderBottom: '1px solid var(--color-border)', fontSize: 11 };
const S_TABLE: React.CSSProperties = { borderCollapse: 'collapse', fontSize: 11 };
const S_MONTH_TH: React.CSSProperties = { padding: '3px 0', fontSize: 10, fontWeight: 700, borderBottom: '2px solid var(--color-border)', textAlign: 'center', background: 'var(--color-surface-alt)' };
const S_WEEK_TH: React.CSSProperties = { padding: '3px 2px', fontSize: 8, fontWeight: 600, color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)', textAlign: 'center', minWidth: 52, background: 'var(--color-surface-alt)' };
const S_NAME_TH: React.CSSProperties = { position: 'sticky', left: 0, background: 'var(--color-surface-alt)', zIndex: 3, textAlign: 'left', minWidth: 160, padding: '4px 8px', fontSize: 11, fontWeight: 600, borderBottom: '2px solid var(--color-border)' };
const S_NAME_TD: React.CSSProperties = { padding: '4px 8px', fontWeight: 500, fontSize: 11, position: 'sticky', left: 0, background: 'var(--color-surface)', zIndex: 1, borderRight: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', verticalAlign: 'top', minWidth: 160 };
const S_CELL: React.CSSProperties = { padding: '2px 2px', verticalAlign: 'top', borderBottom: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)', minWidth: 52, minHeight: 28 };
// Legend:
//   EXISTING assignment (APPROVED / ACTIVE / REQUESTED) → green fill
//   DRAFT assignment → blue fill
//   MISSING assignment (unfilled demand)              → yellow dashed border, no fill
//   PROPOSED by simulation (auto-match / drag / extend) → yellow fill
const S_EXISTING: React.CSSProperties = { borderRadius: 2, padding: '1px 3px', fontSize: 8, marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: 'var(--color-status-active)', color: '#fff' };
const S_DRAFT: React.CSSProperties = { borderRadius: 2, padding: '1px 3px', fontSize: 8, marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: 'var(--color-accent)', color: '#fff' };
const S_MISSING: React.CSSProperties = { borderRadius: 2, padding: '1px 3px', fontSize: 8, marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', border: '1px dashed var(--color-status-warning)', color: 'var(--color-status-warning)', background: 'transparent', fontStyle: 'italic' };
const S_PROPOSED: React.CSSProperties = { borderRadius: 2, padding: '1px 3px', fontSize: 8, marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: 'var(--color-status-warning)', color: '#fff', cursor: 'pointer' };
const S_PROPOSED_DASHED: React.CSSProperties = { ...S_PROPOSED, background: 'transparent', border: '1px dashed var(--color-status-warning)', color: 'var(--color-status-warning)' };
// Kept: hire-intent phantom (purple, distinct from legend — different concept: new role slot)
const S_PHANTOM: React.CSSProperties = { borderRadius: 2, padding: '1px 3px', fontSize: 8, marginBottom: 1, border: '1px dotted rgb(168,85,247)', color: 'rgb(168,85,247)', background: 'rgba(168,85,247,0.08)' };
const S_REMOVED: React.CSSProperties = { ...S_EXISTING, opacity: 0.3, textDecoration: 'line-through' };
const S_SUMMARY: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-1) var(--space-2)', borderTop: '2px solid var(--color-border)', background: 'var(--color-surface-alt)', fontSize: 10, fontWeight: 600, color: 'var(--color-text-muted)' };

function cellBg(supply: number, demand: number): string {
  if (demand > 0 && supply === 0) return 'rgba(239,68,68,0.10)';
  if (demand > 0 && supply < demand) return 'rgba(245,158,11,0.08)';
  if (supply > 0) return 'rgba(34,197,94,0.06)';
  return 'transparent';
}

function classifyBenchDrop(person: PlannerBenchPerson, demand: PlannerDemandBlock | null): {
  cellClass: CellClass;
  matchScore: number;
  matchedSkills: string[];
  mismatchedSkills: string[];
  effectiveAllocationPercent: number;
  blockedReason: string | null;
} {
  const effectiveAlloc = demand ? Math.min(demand.allocationPercent, 100) : Math.max(1, person.availablePercent);

  if (effectiveAlloc > person.availablePercent) {
    return {
      cellClass: 'BLOCKED',
      matchScore: 0,
      matchedSkills: [],
      mismatchedSkills: demand?.skills ?? [],
      effectiveAllocationPercent: effectiveAlloc,
      blockedReason: `${person.displayName} has ${person.availablePercent}% free — demand asks ${effectiveAlloc}%.`,
    };
  }

  const reqSkills = demand?.skills ?? [];
  if (reqSkills.length === 0) {
    return {
      cellClass: 'ACCEPTABLE',
      matchScore: 0.6,
      matchedSkills: [],
      mismatchedSkills: [],
      effectiveAllocationPercent: effectiveAlloc,
      blockedReason: null,
    };
  }

  const personSkills = new Set(person.skills);
  const matched: string[] = [];
  const missing: string[] = [];
  for (const sk of reqSkills) {
    if (personSkills.has(sk)) matched.push(sk);
    else missing.push(sk);
  }
  const score = matched.length / reqSkills.length;
  const cellClass: CellClass = score >= 0.7 ? 'SUGGESTED' : score >= 0.4 ? 'ACCEPTABLE' : 'MISMATCH';

  return { cellClass, matchScore: score, matchedSkills: matched, mismatchedSkills: missing, effectiveAllocationPercent: effectiveAlloc, blockedReason: null };
}

// All sim-proposed moves render as yellow fill (legend). Cell class only affects the icon badge.
function proposedStyle(): React.CSSProperties { return S_PROPOSED; }
function cellClassBadge(cellClass: CellClass): string {
  if (cellClass === 'MISMATCH') return '!';
  if (cellClass === 'BLOCKED') return '⛔';
  return '';
}

export function WorkforcePlanner({ poolId, orgUnitId }: Props): JSX.Element {
  const { principal } = useAuth();
  const [data, setData] = useState<WorkforcePlannerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [horizon, setHorizon] = useState<Horizon>(13);
  const [weekOffset, setWeekOffset] = useState(0);
  const [includeDrafts, setIncludeDrafts] = useState(false);
  const [projectStatuses, setProjectStatuses] = useState<ProjectStatusFilter[]>(['ACTIVE']);
  const [priorities, setPriorities] = useState<PriorityFilter[]>(['URGENT', 'HIGH', 'MEDIUM', 'LOW']);
  const [simulating, setSimulating] = useState(false);
  const [autoMatchLoading, setAutoMatchLoading] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [dragItem, setDragItem] = useState<{ personId: string; personName: string; staffingRole: string; allocationPercent: number; fromProjectId: string; weekStart: string } | null>(null);
  const [benchDragItem, setBenchDragItem] = useState<PlannerBenchPerson | null>(null);
  const [pendingForceAssign, setPendingForceAssign] = useState<PendingForceAssign | null>(null);
  const [layer, setLayer] = useState<HeatLayer>('coverage');
  const [cellDetail, setCellDetail] = useState<CellDetail | null>(null);
  const [extendTarget, setExtendTarget] = useState<ExtendTarget | null>(null);
  const [draftContext, setDraftContext] = useState<{ projectId: string; projectName: string; startDate: string } | null>(null);
  const [whyNotDemandId, setWhyNotDemandId] = useState<string | null>(null);

  const sim = usePlannerSimulation();
  const baseMonday = useMemo(() => getCurrentWeekMonday(), []);

  const fetchData = useCallback(() => {
    setLoading(true); setError(null);
    const from = addDays(baseMonday, weekOffset * 7);
    fetchWorkforcePlanner({
      from,
      weeks: horizon,
      includeDrafts: projectStatuses.includes('DRAFT'),
      poolId,
      orgUnitId,
      projectStatuses,
      priorities,
    })
      .then(setData).catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load.')).finally(() => setLoading(false));
  }, [baseMonday, weekOffset, horizon, projectStatuses, priorities, poolId, orgUnitId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAutoMatch = useCallback(async (strategy: AutoMatchStrategy, minSkillMatch: number) => {
    setAutoMatchLoading(true);
    try {
      const result = await fetchAutoMatch({
        strategy,
        minSkillMatch,
        from: addDays(baseMonday, weekOffset * 7),
        weeks: horizon,
        projectStatuses,
        priorities,
        poolId,
        orgUnitId,
      });
      sim.openPreview(result);
      setSimulating(true);
      if (result.suggestions.length === 0) {
        toast.info(`No candidates under ${strategy.toLowerCase()} — try another strategy.`);
      } else {
        toast.success(`${result.summary.assignedCount} candidate(s) · ${result.summary.coverageLiftPercent.toFixed(1)}% coverage · avg match ${Math.round(result.summary.avgMatchScore * 100)}%`);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Auto-match failed.');
    } finally {
      setAutoMatchLoading(false);
    }
  }, [sim, baseMonday, weekOffset, horizon, projectStatuses, priorities, poolId, orgUnitId]);

  const commitBenchMove = useCallback((params: {
    person: PlannerBenchPerson;
    demand: PlannerDemandBlock | null;
    toProjectId: string;
    weekStart: string;
    cellClass: CellClass;
    matchScore: number;
    matchedSkills: string[];
    mismatchedSkills: string[];
    allocationPercent: number;
    reason?: ForceAssignReason;
  }) => {
    sim.addMove({
      personId: params.person.personId,
      personName: params.person.displayName,
      staffingRole: params.demand?.role ?? '',
      fromProjectId: '__bench__',
      toProjectId: params.toProjectId,
      weekStart: params.weekStart,
      allocationPercent: params.allocationPercent,
      cellClass: params.cellClass,
      matchScore: params.matchScore,
      matchedSkills: params.matchedSkills,
      mismatchedSkills: params.mismatchedSkills,
      reason: params.reason,
    });
  }, [sim]);

  const handleCellDrop = useCallback((projectId: string, projectName: string, weekStart: string, demand: PlannerDemandBlock | null) => {
    if (dragItem) {
      // Cross-project move: no force-assign popover, no classification
      sim.addMove({
        personId: dragItem.personId,
        personName: dragItem.personName,
        staffingRole: dragItem.staffingRole,
        fromProjectId: dragItem.fromProjectId,
        toProjectId: projectId,
        weekStart: dragItem.weekStart,
        allocationPercent: dragItem.allocationPercent,
        cellClass: 'ACCEPTABLE',
        matchScore: 0.6,
        matchedSkills: [],
        mismatchedSkills: [],
      });
      setDragItem(null);
      return;
    }
    if (benchDragItem) {
      const classification = classifyBenchDrop(benchDragItem, demand);
      if (classification.cellClass === 'MISMATCH' || classification.cellClass === 'BLOCKED') {
        setPendingForceAssign({
          person: benchDragItem,
          demand,
          projectId,
          projectName,
          weekStart,
          cellClass: classification.cellClass,
          matchScore: classification.matchScore,
          matchedSkills: classification.matchedSkills,
          mismatchedSkills: classification.mismatchedSkills,
          effectiveAllocationPercent: classification.effectiveAllocationPercent,
          blockedReason: classification.blockedReason,
        });
      } else {
        commitBenchMove({
          person: benchDragItem,
          demand,
          toProjectId: projectId,
          weekStart,
          cellClass: classification.cellClass,
          matchScore: classification.matchScore,
          matchedSkills: classification.matchedSkills,
          mismatchedSkills: classification.mismatchedSkills,
          allocationPercent: classification.effectiveAllocationPercent,
        });
      }
      setBenchDragItem(null);
    }
  }, [dragItem, benchDragItem, sim, commitBenchMove]);

  const confirmForceAssign = useCallback((reason: ForceAssignReason) => {
    if (!pendingForceAssign) return;
    commitBenchMove({
      person: pendingForceAssign.person,
      demand: pendingForceAssign.demand,
      toProjectId: pendingForceAssign.projectId,
      weekStart: pendingForceAssign.weekStart,
      cellClass: pendingForceAssign.cellClass,
      matchScore: pendingForceAssign.matchScore,
      matchedSkills: pendingForceAssign.matchedSkills,
      mismatchedSkills: pendingForceAssign.mismatchedSkills,
      allocationPercent: pendingForceAssign.effectiveAllocationPercent,
      reason,
    });
    toast.success(`Force-assigned ${pendingForceAssign.person.displayName} — reason: ${reason.type.toLowerCase()}`);
    setPendingForceAssign(null);
  }, [pendingForceAssign, commitBenchMove]);

  const noteForMove = useCallback((moveId: string): string | undefined => {
    const m = sim.moves.find((x) => x.id === moveId);
    if (!m || !m.reason) return undefined;
    const base = `Force-assign: ${m.reason.type}`;
    const extras: string[] = [];
    if (m.cellClass === 'MISMATCH') extras.push(`${Math.round(m.matchScore * 100)}% skill match`);
    if (m.cellClass === 'BLOCKED') extras.push(`over-allocation override`);
    if (m.mismatchedSkills.length > 0) extras.push(`missing: ${m.mismatchedSkills.join(', ')}`);
    if (m.reason.note) extras.push(`— ${m.reason.note}`);
    return `${base}${extras.length ? ' (' + extras.join('; ') + ')' : ''}`;
  }, [sim.moves]);

  const handleApply = useCallback(async (dispatchIds: string[], hireIds: string[], releaseIds: string[], extensionIds: string[]) => {
    const dispatches = [
      ...sim.moves.filter((m) => dispatchIds.includes(m.id)).map((m) => ({
        personId: m.personId, projectId: m.toProjectId, staffingRole: m.staffingRole,
        allocationPercent: m.allocationPercent, startDate: m.weekStart,
        note: noteForMove(m.id),
      })),
      ...sim.suggestions.filter((s) => s.accepted && dispatchIds.includes(s.id)).map((s) => ({
        personId: s.benchPersonId, projectId: s.targetProjectId, staffingRole: s.demandRole,
        allocationPercent: s.allocationPercent, startDate: s.weekStart,
        note: s.cellClass === 'MISMATCH' ? `Auto-match accepted (MISMATCH) — missing: ${s.mismatchedSkills.join(', ')}` : undefined,
      })),
    ];
    const hireRequests = sim.hireIntents.filter((h) => hireIds.includes(h.id)).map((h) => ({
      projectId: h.projectId, role: h.role, skills: h.skills, allocationPercent: h.allocationPercent,
      headcount: h.count, priority: h.priority, startDate: h.startDate, endDate: h.endDate,
    }));
    const releases = sim.releases.filter((r) => releaseIds.includes(r.id)).map((r) => ({ personId: r.personId }));
    const extensions = sim.extensions.filter((e) => extensionIds.includes(e.id)).map((e) => {
      const noteParts: string[] = [`Extended to ${e.newValidTo}`];
      if (e.conflicts.length > 0) noteParts.push(`Anomalies: ${e.conflicts.map((c) => `${c.kind}: ${c.message}`).join('; ')}`);
      if (e.reason) noteParts.push(`Reason: ${e.reason.type}${e.reason.note ? ` — ${e.reason.note}` : ''}`);
      return { assignmentId: e.assignmentId, newValidTo: e.newValidTo, note: noteParts.join(' · ') };
    });

    try {
      const result = await applyPlan({ actorId: principal?.personId ?? '', dispatches, hireRequests, releases, extensions });
      toast.success(`Created ${result.assignmentsCreated} assignments, ${result.staffingRequestsCreated} requests, ${result.extensionsUpdated} extensions.`);
      if (result.releasesNoted > 0) toast.info(`${result.releasesNoted} release(s) noted for HR.`);
      if (result.errors.length > 0) toast.error(`${result.errors.length} error(s): ${result.errors[0]}`);
      sim.reset(); setApplyOpen(false); fetchData();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Apply failed.');
    }
  }, [sim, principal, fetchData, noteForMove]);

  const handleBenchDragStart = useCallback((person: PlannerBenchPerson) => {
    setBenchDragItem(person);
    setDragItem(null);
  }, []);

  const monthHeaders = useMemo(() => {
    if (!data) return [];
    const months: { label: string; span: number }[] = [];
    let cur = '';
    for (const ws of data.weeks) {
      const label = format(new Date(ws), 'MMM yy');
      if (label === cur) months[months.length - 1].span++; else { months.push({ label, span: 1 }); cur = label; }
    }
    return months;
  }, [data]);

  const modifiedProjects = useMemo(() => data ? sim.getModifiedProjects(data.projects) : [], [data, sim.getModifiedProjects, sim.moves, sim.suggestions, sim.hireIntents]);
  const supplyDelta = sim.getSupplyDelta();
  const costDelta = data ? sim.getCostDelta(data.budget.avgCostPerFte) : 0;
  const currentWeek = baseMonday;

  const maxWeeklyCellCost = useMemo(() => {
    let max = 0;
    for (const p of modifiedProjects) {
      for (const wd of p.weekData) {
        const cost = wd.assignments.reduce((s, a) => s + ((a.costPerMonth ?? 0) / 4.33), 0);
        if (cost > max) max = cost;
      }
    }
    return max;
  }, [modifiedProjects]);

  const benchCandidatesFor = useCallback((demand: PlannerDemandBlock | null): Array<{ person: PlannerBenchPerson; score: number; cellClass: CellClass }> => {
    if (!data) return [];
    const dispatchedIds = new Set([
      ...sim.suggestions.filter((s) => s.accepted).map((s) => s.benchPersonId),
      ...sim.moves.filter((m) => m.fromProjectId === '__bench__').map((m) => m.personId),
    ]);
    const results: Array<{ person: PlannerBenchPerson; score: number; cellClass: CellClass }> = [];
    for (const person of data.supply.benchPeople) {
      if (dispatchedIds.has(person.personId)) continue;
      const c = classifyBenchDrop(person, demand);
      if (c.cellClass === 'BLOCKED' || c.cellClass === 'MISMATCH') continue;
      results.push({ person, score: c.matchScore, cellClass: c.cellClass });
    }
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 3);
  }, [data, sim.suggestions, sim.moves]);

  function cellBackground(
    projectRow: PlannerProjectRow,
    wd: PlannerProjectWeek | undefined,
    weekStart: string,
  ): string | undefined {
    if (weekStart === currentWeek) return 'var(--color-accent-bg)';
    if (!wd) return undefined;
    switch (layer) {
      case 'cost': {
        const cost = wd.assignments.reduce((s, a) => s + ((a.costPerMonth ?? 0) / 4.33), 0);
        return costHeatColor(cost, maxWeeklyCellCost);
      }
      case 'match': {
        const moves = sim.moves.filter((m) => m.toProjectId === projectRow.projectId && m.weekStart === weekStart);
        const suggestions = sim.suggestions.filter((s) => s.targetProjectId === projectRow.projectId && s.weekStart === weekStart);
        const scores: number[] = [];
        for (const m of moves) scores.push(m.matchScore);
        for (const s of suggestions) scores.push(s.matchScore);
        if (scores.length === 0) return cellBg(wd.totalSupplyPercent, wd.totalDemandPercent);
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        return matchHeatColor(avg);
      }
      case 'risk': {
        const moves = sim.moves.filter((m) => m.toProjectId === projectRow.projectId && m.weekStart === weekStart);
        const hasOverride = moves.some((m) => m.cellClass === 'MISMATCH' || m.cellClass === 'BLOCKED');
        const overrunsEnd = projectRow.endsOn && weekStart > projectRow.endsOn.slice(0, 10);
        const zeroSupplyWithDemand = wd.totalSupplyPercent === 0 && wd.totalDemandPercent > 0;
        if (hasOverride || overrunsEnd || zeroSupplyWithDemand) return 'rgba(239,68,68,0.18)';
        if (wd.totalSupplyPercent > 0 && wd.totalDemandPercent > wd.totalSupplyPercent) return 'rgba(245,158,11,0.10)';
        return 'transparent';
      }
      case 'coverage':
      default:
        return cellBg(wd.totalSupplyPercent, wd.totalDemandPercent);
    }
  }

  // Keyboard shortcuts — ignore when typing into inputs/textareas/selects
  useEffect(() => {
    const isEditable = (el: EventTarget | null): boolean => {
      if (!el || !(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
    };
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (e.key === 'Escape') {
        if (pendingForceAssign) { setPendingForceAssign(null); return; }
        if (sim.preview) { sim.discardPreview(); return; }
        if (cellDetail) { setCellDetail(null); return; }
        if (applyOpen) { setApplyOpen(false); return; }
        return;
      }
      if (isEditable(e.target)) return;
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (sim.canUndo) { e.preventDefault(); sim.undo(); }
        return;
      }
      if (mod && e.key === 'Enter') {
        if (sim.hasChanges) { e.preventDefault(); setApplyOpen(true); }
        return;
      }
      if (e.key === 'ArrowLeft' && e.altKey) { e.preventDefault(); setWeekOffset((o) => o - 4); }
      if (e.key === 'ArrowRight' && e.altKey) { e.preventDefault(); setWeekOffset((o) => o + 4); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sim, pendingForceAssign, cellDetail, applyOpen]);

  if (loading) return <LoadingState variant="skeleton" skeletonType="table" />;
  if (error) return <ErrorState description={error} />;
  if (!data) return <EmptyState title="No data" description="No projects found." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)' }}>
      {/* Toolbar */}
      <div style={S_TOOLBAR}>
        <div style={{ display: 'inline-flex', border: '1px solid var(--color-border)', borderRadius: 6, overflow: 'hidden' }}>
          {HORIZONS.map((h) => (
            <button key={h.weeks} type="button" className={horizon === h.weeks ? 'button button--sm' : 'button button--secondary button--sm'} style={{ borderRadius: 0, border: 'none', minWidth: 36, fontSize: 10 }} onClick={() => setHorizon(h.weeks)}>{h.label}</button>
          ))}
        </div>
        <button className="button button--secondary button--sm" onClick={() => setWeekOffset((o) => o - 4)} type="button" style={{ fontSize: 10 }}>&laquo;</button>
        <button className="button button--secondary button--sm" onClick={() => setWeekOffset(0)} type="button" style={{ fontSize: 10 }}>Today</button>
        <button className="button button--secondary button--sm" onClick={() => setWeekOffset((o) => o + 4)} type="button" style={{ fontSize: 10 }}>&raquo;</button>
        <FilterChip
          label="Status"
          options={ALL_STATUSES}
          values={projectStatuses}
          onChange={(v) => {
            setProjectStatuses(v as ProjectStatusFilter[]);
            setIncludeDrafts(v.includes('DRAFT'));
          }}
        />
        <FilterChip
          label="Priority"
          options={ALL_PRIORITIES}
          values={priorities}
          onChange={(v) => setPriorities(v as PriorityFilter[])}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
          <span style={{ color: 'var(--color-text-muted)' }}>Layer</span>
          <select
            value={layer}
            onChange={(e) => setLayer(e.target.value as HeatLayer)}
            className="field__control"
            style={{ fontSize: 10, padding: '2px 4px' }}
            data-testid="planner-layer-select"
          >
            {LAYERS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </label>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--space-1)', alignItems: 'center' }}>
          <PlannerScenariosMenu
            simulation={sim}
            horizonFrom={addDays(baseMonday, weekOffset * 7)}
            horizonWeeks={horizon}
            onLoaded={() => setSimulating(true)}
          />
          <button className={simulating ? 'button button--sm' : 'button button--secondary button--sm'} onClick={() => setSimulating((v) => !v)} type="button" style={{ fontSize: 10 }}>
            {simulating ? 'Simulating' : 'Simulate'}
          </button>
          {sim.canUndo && <button className="button button--secondary button--sm" onClick={sim.undo} type="button" style={{ fontSize: 10 }} title={sim.lastActionLabel ?? ''}>↩</button>}
          {sim.hasChanges && (
            <>
              <button className="button button--sm" onClick={() => setApplyOpen(true)} type="button" style={{ fontSize: 10 }}>Apply</button>
              <button className="button button--secondary button--sm" onClick={sim.reset} type="button" style={{ fontSize: 10 }}>Reset</button>
            </>
          )}
        </div>
      </div>

      {/* Main: Sidebar + Grid */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Bench Sidebar */}
        <PlannerBenchSidebar
          benchPeople={data.supply.benchPeople}
          unmatchedDemand={sim.unmatchedDemand}
          simulation={sim}
          simulating={simulating}
          onAutoMatch={(strategy, min) => void handleAutoMatch(strategy, min)}
          autoMatchLoading={autoMatchLoading}
          supplyDelta={supplyDelta}
          totalFte={data.supply.totalFte}
          onDragStart={handleBenchDragStart}
          onWhyNot={(demandId) => setWhyNotDemandId(demandId)}
        />

        {/* Project Grid */}
        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto' }}>
          <table style={S_TABLE}>
            <thead>
              <tr>
                <th style={S_NAME_TH} rowSpan={2}>Project</th>
                {monthHeaders.map((m, i) => <th key={`${m.label}-${i}`} colSpan={m.span} style={S_MONTH_TH}>{m.label}</th>)}
                <th style={{ ...S_MONTH_TH, minWidth: 108, position: 'sticky', right: 0, zIndex: 3 }} rowSpan={2}>Δ FTE</th>
              </tr>
              <tr>
                {data.weeks.map((w) => (
                  <th key={w} style={{ ...S_WEEK_TH, background: w === currentWeek ? 'var(--color-accent-bg)' : 'var(--color-surface-alt)' }}>
                    {format(new Date(w), 'dd')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modifiedProjects.map((proj) => (
                <tr key={proj.projectId}>
                  <td style={{ ...S_NAME_TD, opacity: proj.status === 'DRAFT' ? 0.7 : 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {proj.status === 'DRAFT' && <StatusBadge label="DRAFT" tone="info" variant="chip" size="small" />}
                      <span>{proj.projectName}</span>
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--color-text-muted)', fontWeight: 400 }}>
                      <span style={{ color: proj.filledHc >= proj.requiredHc ? 'var(--color-status-active)' : 'var(--color-status-warning)' }}>
                        {proj.filledHc}/{proj.requiredHc} HC
                      </span>
                      {proj.endsOn && <span style={{ color: 'var(--color-status-danger)', marginLeft: 4 }}>closes {format(new Date(proj.endsOn), 'dd MMM')}</span>}
                    </div>
                  </td>
                  {data.weeks.map((w) => {
                    const wd = proj.weekData.find((d) => d.weekStart === w);
                    const isClosing = proj.endsOn && w <= proj.endsOn.slice(0, 10) && addDays(w, 7) > proj.endsOn.slice(0, 10);
                    const movesFrom = sim.moves.filter((m) => m.fromProjectId === proj.projectId && m.weekStart === w);
                    const removedIds = new Set(movesFrom.map((m) => m.personId));
                    const weekSuggestions = sim.suggestions.filter((s) => s.targetProjectId === proj.projectId && (s.coverageWeeks?.includes(w) || s.weekStart === w));
                    const primaryDemand = wd?.demands?.[0] ?? null;

                    const hasContent = (wd?.assignments.length ?? 0) > 0 || (wd?.demands.length ?? 0) > 0;
                    const showChips = simulating && layer !== 'cost' && wd && wd.demands.length > 0 && wd.assignments.length === 0;
                    const chips = showChips ? benchCandidatesFor(primaryDemand) : [];

                    return (
                      <td
                        key={w}
                        style={{ ...S_CELL, background: cellBackground(proj, wd, w), cursor: hasContent ? 'pointer' : undefined }}
                        onDragOver={simulating ? (e) => e.preventDefault() : undefined}
                        onDrop={simulating ? () => handleCellDrop(proj.projectId, proj.projectName, w, primaryDemand) : undefined}
                        onClick={hasContent && wd ? (e) => {
                          if ((e.target as HTMLElement).closest('[data-stop-cell-click]')) return;
                          setCellDetail({
                            projectId: proj.projectId,
                            projectName: proj.projectName,
                            weekStart: w,
                            assignments: wd.assignments,
                            demands: wd.demands,
                            totalSupplyPercent: wd.totalSupplyPercent,
                            totalDemandPercent: wd.totalDemandPercent,
                          });
                        } : undefined}
                        onDoubleClick={(e) => {
                          if ((e.target as HTMLElement).closest('[data-stop-cell-click]')) return;
                          setDraftContext({ projectId: proj.projectId, projectName: proj.projectName, startDate: w });
                        }}
                      >
                        {isClosing && <div style={{ fontSize: 8, color: 'var(--color-status-danger)', fontWeight: 700, textAlign: 'center' }}>⚠</div>}

                        {/* Real + simulated assignments — cap at 6, overflow surfaced via +N more */}
                        {wd?.assignments.slice(0, 6).map((a) => {
                          const isRemoved = removedIds.has(a.personId);
                          if (a.status === 'SUGGESTED') {
                            const sug = weekSuggestions.find((s) => s.benchPersonId === a.personId);
                            if (!sug) return null;
                            const tipLines = [sug.rationale];
                            if (sug.mismatchedSkills.length > 0) tipLines.push(`missing: ${sug.mismatchedSkills.join(', ')}`);
                            // All sim-proposed items render yellow (legend). Pending ones retain the ✓/✗ chips.
                            const badge = cellClassBadge(sug.cellClass);
                            return sug.accepted ? (
                              <div key={a.assignmentId} style={proposedStyle()} title={`${a.personName} accepted — ${tipLines.join(' — ')}`}>
                                {a.personName.split(' ')[0]} {a.allocationPercent}% {badge || '✓'}
                              </div>
                            ) : (
                              <div key={a.assignmentId} style={{ ...S_PROPOSED_DASHED, display: 'flex', alignItems: 'center', gap: 2 }}>
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }} title={tipLines.join(' — ')}>
                                  {a.personName.split(' ')[0]} {Math.round(sug.matchScore * 100)}% {badge}
                                </span>
                                <span data-stop-cell-click style={{ cursor: 'pointer', fontWeight: 700 }} onClick={(e) => { e.stopPropagation(); sim.acceptSuggestion(sug.id); }} title="Accept">✓</span>
                                <span data-stop-cell-click style={{ cursor: 'pointer', fontWeight: 700, color: 'var(--color-status-danger)' }} onClick={(e) => { e.stopPropagation(); sim.rejectSuggestion(sug.id); }} title="Reject">✗</span>
                              </div>
                            );
                          }
                          if (a.status === 'SIMULATED') {
                            const move = sim.moves.find((m) => m.id === a.assignmentId);
                            const moveClass = move?.cellClass ?? 'ACCEPTABLE';
                            const badge = cellClassBadge(moveClass);
                            const tip = move ? [
                              `${a.personName} (${moveClass.toLowerCase()})`,
                              move.reason ? `Reason: ${move.reason.type}${move.reason.note ? ` — ${move.reason.note}` : ''}` : null,
                              move.mismatchedSkills.length > 0 ? `Missing: ${move.mismatchedSkills.join(', ')}` : null,
                            ].filter(Boolean).join(' · ') : `Simulated: ${a.personName}`;
                            return (
                              <div key={a.assignmentId} data-stop-cell-click style={proposedStyle()} onClick={(e) => { e.stopPropagation(); sim.removeMove(a.assignmentId); }} title={`${tip} — click to remove`}>
                                {a.personName.split(' ')[0]} {a.allocationPercent}% {badge}
                              </div>
                            );
                          }
                          if (a.status === 'PHANTOM_HIRE') {
                            return <div key={a.assignmentId} style={S_PHANTOM} title={`Hire intent: ${a.staffingRole}`}>NEW {a.staffingRole.slice(0, 6)}</div>;
                          }
                          if (a.status === 'EXTENDED') {
                            const ext = sim.extensions.find((e) => a.assignmentId.startsWith(`ext-${e.id}-`));
                            const hasAnomalies = (ext?.conflicts.length ?? 0) > 0;
                            const tip = ext ? `Extension: ${ext.personName} through ${ext.newValidTo}${hasAnomalies ? ' — ' + ext.conflicts.map((c) => c.message).join('; ') : ''}` : `Extension: ${a.personName}`;
                            return (
                              <div
                                key={a.assignmentId}
                                data-stop-cell-click
                                style={S_PROPOSED_DASHED}
                                onClick={(e) => { e.stopPropagation(); if (ext) sim.removeExtension(ext.id); }}
                                title={`${tip} — click to remove extension`}
                              >
                                {a.personName.split(' ')[0]} ⟶ {hasAnomalies ? '!' : ''}
                              </div>
                            );
                          }
                          if (a.status === 'DRAFT') {
                            return (
                              <div
                                key={a.assignmentId}
                                draggable={simulating && !isRemoved}
                                onDragStart={simulating ? () => setDragItem({ personId: a.personId, personName: a.personName, staffingRole: a.staffingRole, allocationPercent: a.allocationPercent, fromProjectId: proj.projectId, weekStart: w }) : undefined}
                                style={isRemoved ? { ...S_REMOVED, background: 'var(--color-accent)' } : { ...S_DRAFT, cursor: simulating ? 'grab' : undefined }}
                                title={`DRAFT · ${a.personName}: ${a.allocationPercent}% ${a.staffingRole}`}
                              >
                                {a.personName.split(' ')[0]} {a.allocationPercent}% ·D
                              </div>
                            );
                          }
                          return (
                            <div
                              key={a.assignmentId}
                              draggable={simulating && !isRemoved}
                              onDragStart={simulating ? () => setDragItem({ personId: a.personId, personName: a.personName, staffingRole: a.staffingRole, allocationPercent: a.allocationPercent, fromProjectId: proj.projectId, weekStart: w }) : undefined}
                              style={isRemoved ? S_REMOVED : { ...S_EXISTING, cursor: simulating ? 'grab' : undefined }}
                              title={`${a.personName}: ${a.allocationPercent}% ${a.staffingRole}`}
                            >
                              {a.personName.split(' ')[0]} {a.allocationPercent}%
                            </div>
                          );
                        })}

                        {/* Assignment overflow — click to see all in the cell detail popover */}
                        {wd && wd.assignments.length > 6 && (
                          <div
                            data-stop-cell-click
                            onClick={(e) => {
                              e.stopPropagation();
                              setCellDetail({
                                projectId: proj.projectId,
                                projectName: proj.projectName,
                                weekStart: w,
                                assignments: wd.assignments,
                                demands: wd.demands,
                                totalSupplyPercent: wd.totalSupplyPercent,
                                totalDemandPercent: wd.totalDemandPercent,
                              });
                            }}
                            style={{
                              fontSize: 8, fontWeight: 700, textAlign: 'center',
                              color: 'var(--color-accent)', cursor: 'pointer',
                              padding: '1px 3px', marginBottom: 1,
                              background: 'rgba(59,130,246,0.10)', borderRadius: 2,
                            }}
                            title={`${wd.assignments.length - 6} more: ${wd.assignments.slice(6).map((a) => a.personName).join(', ')}`}
                          >
                            +{wd.assignments.length - 6} more
                          </div>
                        )}

                        {/* Demand blocks (MISSING — yellow dashed, no fill) — cap at 4, overflow via badge */}
                        {wd?.demands.slice(0, 4).map((d, i) => (
                          <div key={`${d.requestId ?? d.rolePlanId ?? i}`} style={S_MISSING} title={`Missing: ${d.role} ${d.allocationPercent}% ×${d.headcountOpen}${d.skills.length ? ' — ' + d.skills.join(', ') : ''}`}>
                            {d.role.slice(0, 8)} {d.headcountOpen}HC
                          </div>
                        ))}
                        {wd && wd.demands.length > 4 && (
                          <div
                            data-stop-cell-click
                            onClick={(e) => {
                              e.stopPropagation();
                              setCellDetail({
                                projectId: proj.projectId,
                                projectName: proj.projectName,
                                weekStart: w,
                                assignments: wd.assignments,
                                demands: wd.demands,
                                totalSupplyPercent: wd.totalSupplyPercent,
                                totalDemandPercent: wd.totalDemandPercent,
                              });
                            }}
                            style={{
                              fontSize: 8, fontWeight: 700, textAlign: 'center',
                              color: 'var(--color-status-warning)', cursor: 'pointer',
                              padding: '1px 3px', marginBottom: 1,
                              background: 'rgba(245,158,11,0.10)', borderRadius: 2,
                            }}
                            title={`${wd.demands.length - 4} more unmet demands`}
                          >
                            +{wd.demands.length - 4} demand
                          </div>
                        )}

                        {/* Inline bench chips — top 3 candidates on empty demand cells */}
                        {chips.length > 0 && (
                          <div style={{ display: 'flex', gap: 2, marginTop: 2, flexWrap: 'wrap' }}>
                            {chips.map((c) => {
                              const initials = c.person.displayName.split(' ').map((s) => s[0]).slice(0, 2).join('');
                              const tone = c.cellClass === 'SUGGESTED' ? 'var(--color-status-active)' : 'var(--color-status-warning)';
                              return (
                                <button
                                  key={c.person.personId}
                                  data-stop-cell-click
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    commitBenchMove({
                                      person: c.person,
                                      demand: primaryDemand,
                                      toProjectId: proj.projectId,
                                      weekStart: w,
                                      cellClass: c.cellClass,
                                      matchScore: c.score,
                                      matchedSkills: primaryDemand?.skills.filter((s) => c.person.skills.includes(s)) ?? [],
                                      mismatchedSkills: primaryDemand?.skills.filter((s) => !c.person.skills.includes(s)) ?? [],
                                      allocationPercent: primaryDemand ? Math.min(primaryDemand.allocationPercent, c.person.availablePercent) : c.person.availablePercent,
                                    });
                                    toast.success(`Assigned ${c.person.displayName} (${Math.round(c.score * 100)}% match)`);
                                  }}
                                  title={`${c.person.displayName} · ${Math.round(c.score * 100)}% match · ${c.person.availablePercent}% free — click to assign`}
                                  style={{
                                    background: 'transparent',
                                    border: `1px solid ${tone}`,
                                    color: tone,
                                    fontSize: 8,
                                    fontWeight: 600,
                                    padding: '0 3px',
                                    borderRadius: 3,
                                    cursor: 'pointer',
                                    lineHeight: 1.6,
                                  }}
                                >
                                  {initials}·{Math.round(c.score * 100)}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  {(() => {
                    const baseProj = data.projects.find((p) => p.projectId === proj.projectId);
                    const baselineFte = baseProj
                      ? baseProj.weekData.reduce((s, wd) => s + wd.totalSupplyPercent, 0) / Math.max(1, baseProj.weekData.length) / 100
                      : 0;
                    const simulatedFte = proj.weekData.reduce((s, wd) => s + wd.totalSupplyPercent, 0) / Math.max(1, proj.weekData.length) / 100;
                    const delta = simulatedFte - baselineFte;
                    const deltaColor = Math.abs(delta) < 0.05 ? 'var(--color-text-muted)' : delta > 0 ? 'var(--color-status-active)' : 'var(--color-status-danger)';
                    return (
                      <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--color-border)', fontSize: 10, fontVariantNumeric: 'tabular-nums', textAlign: 'right', minWidth: 108, background: 'var(--color-surface)', position: 'sticky', right: 0 }}>
                        <div style={{ color: 'var(--color-text-muted)', fontSize: 9 }}>{baselineFte.toFixed(1)} → {simulatedFte.toFixed(1)}</div>
                        <div style={{ color: deltaColor, fontWeight: 600 }}>{delta >= 0 ? '+' : ''}{delta.toFixed(1)}</div>
                      </td>
                    );
                  })()}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Bar */}
      <div style={S_SUMMARY}>
        <span>
          {sim.suggestions.filter((s) => s.accepted).length + sim.moves.length} dispatches
          · {sim.hireIntents.reduce((s, h) => s + h.count, 0)} hires
          · {sim.releases.length} releases
          {sim.moves.some((m) => m.cellClass === 'MISMATCH' || m.cellClass === 'BLOCKED') && (
            <span style={{ color: 'var(--color-status-warning)', marginLeft: 6 }}>
              · {sim.moves.filter((m) => m.cellClass === 'MISMATCH' || m.cellClass === 'BLOCKED').length} overrides
            </span>
          )}
        </span>
        {data.budget.enabled && (
          <span>
            Budget: ${Math.round(data.budget.baselineMonthlyCost / 1000)}K/mo
            {costDelta !== 0 && <span style={{ color: costDelta > 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)' }}> {costDelta > 0 ? '+' : ''}{Math.round(costDelta / 1000)}K</span>}
          </span>
        )}
        <span style={{ color: supplyDelta >= 0 ? 'var(--color-status-active)' : 'var(--color-status-danger)' }}>
          Supply {supplyDelta >= 0 ? '+' : ''}{supplyDelta} FTE
        </span>
      </div>

      {/* Anomaly Review Table */}
      <PlannerAnomalyTable simulation={sim} />

      {/* Auto-Match preview modal */}
      <PlannerAutoMatchPreviewModal simulation={sim} />

      {/* Force-assign popover */}
      {pendingForceAssign && (
        <PlannerForceAssignPopover
          pending={pendingForceAssign}
          onCancel={() => setPendingForceAssign(null)}
          onConfirm={confirmForceAssign}
        />
      )}

      {/* Cell detail popover */}
      {cellDetail && (
        <PlannerCellDetailPopover
          detail={cellDetail}
          simulation={sim}
          onClose={() => setCellDetail(null)}
          onExtend={(target) => setExtendTarget(target)}
        />
      )}

      {/* Extend assignment modal */}
      {extendTarget && (
        <PlannerExtendAssignmentModal
          target={extendTarget}
          simulation={sim}
          onClose={() => setExtendTarget(null)}
        />
      )}

      {/* Draft assignment modal (double-click) */}
      {draftContext && (
        <PlannerDraftAssignmentModal
          projectId={draftContext.projectId}
          projectName={draftContext.projectName}
          startDate={draftContext.startDate}
          benchPeople={data.supply.benchPeople}
          onClose={() => setDraftContext(null)}
          onCreated={() => { setDraftContext(null); fetchData(); }}
        />
      )}

      {/* Why-not modal (unmatched demand analysis) */}
      {whyNotDemandId && (
        <PlannerWhyNotModal demandId={whyNotDemandId} onClose={() => setWhyNotDemandId(null)} />
      )}

      {/* Apply Drawer */}
      <PlannerApplyDrawer open={applyOpen} onClose={() => setApplyOpen(false)} simulation={sim} budgetDelta={costDelta} onApply={handleApply} />
    </div>
  );
}
