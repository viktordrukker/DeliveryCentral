import { useCallback, useState } from 'react';

import type {
  PlannerProjectRow,
  AutoMatchSuggestion,
  AutoMatchResult,
  AutoMatchStrategy,
  AutoMatchSummary,
  AutoMatchDiagnostics,
  UnmatchedDemand,
  CellClass,
  ExtensionConflict,
  ExtensionConflictKind,
  ExtensionConflictSeverity,
} from '@/lib/api/staffing-desk';

/* ── Action types ── */

export type ForceAssignReasonType = 'TRAINING' | 'EMERGENCY' | 'CLIENT_PREFERENCE' | 'OTHER';

export interface ForceAssignReason {
  type: ForceAssignReasonType;
  note?: string;
}

export interface SimMove {
  id: string;
  personId: string;
  personName: string;
  staffingRole: string;
  fromProjectId: string;
  toProjectId: string;
  weekStart: string;
  allocationPercent: number;
  cellClass: CellClass;
  matchScore: number;
  matchedSkills: string[];
  mismatchedSkills: string[];
  reason?: ForceAssignReason;
}

export interface SimSuggestion {
  id: string;
  benchPersonId: string;
  benchPersonName: string;
  targetProjectId: string;
  targetProjectName: string;
  demandId: string;
  demandRole: string;
  matchScore: number;
  cellClass: CellClass;
  matchedSkills: string[];
  mismatchedSkills: string[];
  rationale: string;
  constraintWarnings: string[];
  weekStart: string;
  coverageWeeks: string[];
  allocationPercent: number;
  fallbackUsed: boolean;
  accepted: boolean;
}

export interface SimHireIntent {
  id: string;
  projectId: string;
  projectName: string;
  role: string;
  skills: string[];
  count: number;
  priority: string;
  allocationPercent: number;
  startDate: string;
  endDate: string;
}

export interface SimRelease {
  id: string;
  personId: string;
  personName: string;
  costPerMonth: number | null;
}

export interface SimExtension {
  id: string;
  assignmentId: string;
  personId: string;
  personName: string;
  projectId: string;
  projectName: string;
  staffingRole: string;
  allocationPercent: number;
  currentValidTo: string | null;
  newValidTo: string;
  conflicts: ExtensionConflict[];
  reason?: ForceAssignReason;
}

export type AnomalyKind =
  | 'skill-mismatch'
  | 'over-allocation-override'
  | ExtensionConflictKind;

export type AnomalySeverity = ExtensionConflictSeverity;

export interface SimAnomaly {
  id: string;
  kind: AnomalyKind;
  severity: AnomalySeverity;
  personId: string;
  personName: string;
  projectId: string;
  projectName: string;
  weekStart?: string;
  sourceKind: 'move' | 'suggestion' | 'extension';
  sourceId: string;
  message: string;
  reasonType?: string;
  reasonNote?: string;
}

export interface PreviewPlan {
  strategy: AutoMatchStrategy;
  summary: AutoMatchSummary;
  suggestions: AutoMatchSuggestion[];
  unmatched: UnmatchedDemand[];
  diagnostics: AutoMatchDiagnostics;
  selectedIds: Set<string>;
}

type Action = { type: 'move'; id: string } | { type: 'suggestion'; id: string } | { type: 'hire'; id: string } | { type: 'release'; id: string } | { type: 'extension'; id: string };

function uid(): string {
  return `sim-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function suggestionKey(s: AutoMatchSuggestion): string {
  return `${s.benchPersonId}:${s.demandId}:${s.weekStart}`;
}

export interface SerializedSimState {
  moves: SimMove[];
  suggestions: SimSuggestion[];
  hireIntents: SimHireIntent[];
  releases: SimRelease[];
  extensions: SimExtension[];
  unmatchedDemand: UnmatchedDemand[];
  version: 1;
}

export interface PlannerSimulation {
  moves: SimMove[];
  suggestions: SimSuggestion[];
  hireIntents: SimHireIntent[];
  releases: SimRelease[];
  extensions: SimExtension[];
  unmatchedDemand: UnmatchedDemand[];
  preview: PreviewPlan | null;
  canUndo: boolean;
  lastActionLabel: string | null;
  hasChanges: boolean;

  addMove: (move: Omit<SimMove, 'id'>) => void;
  removeMove: (id: string) => void;
  setMoveReason: (id: string, reason: ForceAssignReason) => void;
  openPreview: (result: AutoMatchResult) => void;
  togglePreviewSuggestion: (key: string) => void;
  commitPreview: () => void;
  discardPreview: () => void;
  acceptSuggestion: (id: string) => void;
  rejectSuggestion: (id: string) => void;
  addHireIntent: (intent: Omit<SimHireIntent, 'id'>) => void;
  removeHireIntent: (id: string) => void;
  toggleRelease: (personId: string, personName: string, costPerMonth: number | null) => void;
  addExtension: (extension: Omit<SimExtension, 'id'>) => void;
  removeExtension: (id: string) => void;
  undo: () => void;
  reset: () => void;
  serialize: () => SerializedSimState;
  loadState: (state: SerializedSimState) => void;
  getModifiedProjects: (original: PlannerProjectRow[]) => PlannerProjectRow[];
  getSupplyDelta: () => number;
  getCostDelta: (avgCostPerFte: number) => number;
  getAnomalies: () => SimAnomaly[];
}

export function usePlannerSimulation(): PlannerSimulation {
  const [moves, setMoves] = useState<SimMove[]>([]);
  const [suggestions, setSuggestions] = useState<SimSuggestion[]>([]);
  const [hireIntents, setHireIntents] = useState<SimHireIntent[]>([]);
  const [releases, setReleases] = useState<SimRelease[]>([]);
  const [extensions, setExtensions] = useState<SimExtension[]>([]);
  const [unmatchedDemand, setUnmatchedDemand] = useState<UnmatchedDemand[]>([]);
  const [preview, setPreview] = useState<PreviewPlan | null>(null);
  const [undoStack, setUndoStack] = useState<Action[]>([]);

  const lastAction = undoStack.length > 0 ? undoStack[undoStack.length - 1] : null;
  const lastActionLabel = lastAction
    ? lastAction.type === 'move' ? 'Move person'
    : lastAction.type === 'suggestion' ? 'Auto-match suggestion'
    : lastAction.type === 'hire' ? 'Hire intent'
    : lastAction.type === 'extension' ? 'Extend assignment'
    : 'Release'
    : null;

  const hasChanges = moves.length > 0 || suggestions.some((s) => s.accepted) || hireIntents.length > 0 || releases.length > 0 || extensions.length > 0;

  const addMove = useCallback((move: Omit<SimMove, 'id'>) => {
    const full = { ...move, id: uid() };
    setMoves((prev) => [...prev, full]);
    setUndoStack((prev) => [...prev, { type: 'move', id: full.id }]);
  }, []);

  const removeMove = useCallback((id: string) => {
    setMoves((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const setMoveReason = useCallback((id: string, reason: ForceAssignReason) => {
    setMoves((prev) => prev.map((m) => (m.id === id ? { ...m, reason } : m)));
  }, []);

  const openPreview = useCallback((result: AutoMatchResult) => {
    const allIds = new Set(result.suggestions.map(suggestionKey));
    setPreview({
      strategy: result.strategy,
      summary: result.summary,
      suggestions: result.suggestions,
      unmatched: result.unmatchedDemand,
      diagnostics: result.diagnostics,
      selectedIds: allIds,
    });
    setUnmatchedDemand(result.unmatchedDemand);
  }, []);

  const togglePreviewSuggestion = useCallback((key: string) => {
    setPreview((prev) => {
      if (!prev) return prev;
      const next = new Set(prev.selectedIds);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { ...prev, selectedIds: next };
    });
  }, []);

  const commitPreview = useCallback(() => {
    setPreview((prev) => {
      if (!prev) return prev;
      const selected = prev.suggestions.filter((s) => prev.selectedIds.has(suggestionKey(s)));
      const mapped: SimSuggestion[] = selected.map((s) => ({
        id: uid(),
        benchPersonId: s.benchPersonId,
        benchPersonName: s.benchPersonName,
        targetProjectId: s.targetProjectId,
        targetProjectName: s.targetProjectName,
        demandId: s.demandId,
        demandRole: s.demandRole,
        matchScore: s.matchScore,
        cellClass: s.cellClass,
        matchedSkills: s.matchedSkills,
        mismatchedSkills: s.mismatchedSkills,
        rationale: s.rationale,
        constraintWarnings: s.constraintWarnings,
        weekStart: s.weekStart,
        coverageWeeks: s.coverageWeeks?.length ? s.coverageWeeks : [s.weekStart],
        allocationPercent: s.allocationPercent,
        fallbackUsed: s.fallbackUsed ?? false,
        accepted: true,
      }));
      setSuggestions(mapped);
      // Record each as an undoable action so Undo works on committed suggestions
      setUndoStack((u) => [...u, ...mapped.map((m) => ({ type: 'suggestion' as const, id: m.id }))]);
      return null;
    });
  }, []);

  const discardPreview = useCallback(() => {
    setPreview(null);
  }, []);

  const acceptSuggestion = useCallback((id: string) => {
    setSuggestions((prev) => prev.map((s) => s.id === id ? { ...s, accepted: true } : s));
    setUndoStack((prev) => [...prev, { type: 'suggestion', id }]);
  }, []);

  const rejectSuggestion = useCallback((id: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const addHireIntent = useCallback((intent: Omit<SimHireIntent, 'id'>) => {
    const full = { ...intent, id: uid() };
    setHireIntents((prev) => [...prev, full]);
    setUndoStack((prev) => [...prev, { type: 'hire', id: full.id }]);
  }, []);

  const removeHireIntent = useCallback((id: string) => {
    setHireIntents((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const toggleRelease = useCallback((personId: string, personName: string, costPerMonth: number | null) => {
    setReleases((prev) => {
      const exists = prev.find((r) => r.personId === personId);
      if (exists) return prev.filter((r) => r.personId !== personId);
      const full = { id: uid(), personId, personName, costPerMonth };
      setUndoStack((s) => [...s, { type: 'release', id: full.id }]);
      return [...prev, full];
    });
  }, []);

  const addExtension = useCallback((extension: Omit<SimExtension, 'id'>) => {
    const full = { ...extension, id: uid() };
    setExtensions((prev) => [...prev.filter((e) => e.assignmentId !== extension.assignmentId), full]);
    setUndoStack((prev) => [...prev, { type: 'extension', id: full.id }]);
  }, []);

  const removeExtension = useCallback((id: string) => {
    setExtensions((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const undo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last.type === 'move') setMoves((m) => m.filter((x) => x.id !== last.id));
      if (last.type === 'suggestion') setSuggestions((s) => s.map((x) => x.id === last.id ? { ...x, accepted: false } : x));
      if (last.type === 'hire') setHireIntents((h) => h.filter((x) => x.id !== last.id));
      if (last.type === 'release') setReleases((r) => r.filter((x) => x.id !== last.id));
      if (last.type === 'extension') setExtensions((e) => e.filter((x) => x.id !== last.id));
      return prev.slice(0, -1);
    });
  }, []);

  const reset = useCallback(() => {
    setMoves([]);
    setSuggestions([]);
    setHireIntents([]);
    setReleases([]);
    setExtensions([]);
    setUnmatchedDemand([]);
    setPreview(null);
    setUndoStack([]);
  }, []);

  const serialize = useCallback((): SerializedSimState => ({
    moves, suggestions, hireIntents, releases, extensions, unmatchedDemand, version: 1,
  }), [moves, suggestions, hireIntents, releases, extensions, unmatchedDemand]);

  const loadState = useCallback((state: SerializedSimState) => {
    setMoves(state.moves ?? []);
    setSuggestions(state.suggestions ?? []);
    setHireIntents(state.hireIntents ?? []);
    setReleases(state.releases ?? []);
    setExtensions(state.extensions ?? []);
    setUnmatchedDemand(state.unmatchedDemand ?? []);
    setPreview(null);
    setUndoStack([]);
  }, []);

  const getModifiedProjects = useCallback((original: PlannerProjectRow[]): PlannerProjectRow[] => {
    type MoveAction = {
      id: string;
      personId: string;
      personName: string;
      staffingRole: string;
      fromProjectId: string;
      toProjectId: string;
      weekStart: string;
      allocationPercent: number;
      source: 'move' | 'suggestion';
    };
    const allMoveActions: MoveAction[] = [
      ...moves.map((m) => ({
        id: m.id,
        personId: m.personId,
        personName: m.personName,
        staffingRole: m.staffingRole,
        fromProjectId: m.fromProjectId,
        toProjectId: m.toProjectId,
        weekStart: m.weekStart,
        allocationPercent: m.allocationPercent,
        source: 'move' as const,
      })),
      // Expand accepted suggestions across every week in their coverage range so long-duration
      // demand gets filled end-to-end by the same person.
      ...suggestions.filter((s) => s.accepted).flatMap((s) => {
        const weeks = s.coverageWeeks?.length ? s.coverageWeeks : [s.weekStart];
        return weeks.map((wk, idx) => ({
          id: idx === 0 ? s.id : `${s.id}-w${idx}`,
          personId: s.benchPersonId,
          personName: s.benchPersonName,
          staffingRole: s.demandRole,
          fromProjectId: '__bench__',
          toProjectId: s.targetProjectId,
          weekStart: wk,
          allocationPercent: s.allocationPercent,
          source: 'suggestion' as const,
        }));
      }),
    ];

    if (allMoveActions.length === 0 && hireIntents.length === 0 && extensions.length === 0) return original;

    const cloned: PlannerProjectRow[] = original.map((p) => ({
      ...p,
      weekData: p.weekData.map((wd) => ({ ...wd, assignments: [...wd.assignments], demands: [...wd.demands] })),
    }));
    const projectMap = new Map(cloned.map((p) => [p.projectId, p]));

    // Find the week containing a given date — tolerant of non-Monday-aligned inputs
    // (e.g., backend suggestions whose weekStart originated from a raw StaffingRequest.startDate).
    const findContainingWeek = (weekData: PlannerProjectRow['weekData'], dateStr: string) => {
      const exact = weekData.find((w) => w.weekStart === dateStr);
      if (exact) return exact;
      const moveMs = new Date(dateStr).getTime();
      return weekData.find((w) => {
        const startMs = new Date(w.weekStart).getTime();
        return moveMs >= startMs && moveMs < startMs + 7 * 86400000;
      });
    };

    for (const move of allMoveActions) {
      if (move.fromProjectId !== '__bench__') {
        const src = projectMap.get(move.fromProjectId);
        if (src) {
          const srcWeek = findContainingWeek(src.weekData, move.weekStart);
          if (srcWeek) {
            srcWeek.assignments = srcWeek.assignments.filter((a) => a.personId !== move.personId);
            srcWeek.totalSupplyPercent = srcWeek.assignments.reduce((s, a) => s + a.allocationPercent, 0);
          }
        }
      }

      const tgt = projectMap.get(move.toProjectId);
      if (tgt) {
        const tgtWeek = findContainingWeek(tgt.weekData, move.weekStart);
        if (tgtWeek) {
          tgtWeek.assignments.push({
            assignmentId: move.id,
            personId: move.personId,
            personName: move.personName,
            staffingRole: move.staffingRole,
            allocationPercent: move.allocationPercent,
            status: move.source === 'suggestion' ? 'SUGGESTED' : 'SIMULATED',
            costPerMonth: null,
          });
          tgtWeek.totalSupplyPercent = tgtWeek.assignments.reduce((s, a) => s + a.allocationPercent, 0);
        }
      }
    }

    for (const hire of hireIntents) {
      const proj = projectMap.get(hire.projectId);
      if (proj) {
        const week = proj.weekData.find((w) => w.weekStart === hire.startDate) ?? proj.weekData[0];
        if (week) {
          for (let i = 0; i < hire.count; i++) {
            week.assignments.push({
              assignmentId: `hire-${hire.id}-${i}`,
              personId: `phantom-${hire.id}-${i}`,
              personName: `NEW HIRE`,
              staffingRole: hire.role,
              allocationPercent: hire.allocationPercent,
              status: 'PHANTOM_HIRE',
              costPerMonth: null,
            });
          }
        }
      }
    }

    // Render extensions as additional weekly assignment blocks between currentValidTo (exclusive)
    // and newValidTo (inclusive), with status 'EXTENDED' so the grid styles them distinctly.
    for (const ext of extensions) {
      const proj = projectMap.get(ext.projectId);
      if (!proj) continue;
      const startExclusive = ext.currentValidTo ?? '';
      for (const week of proj.weekData) {
        if (week.weekStart <= startExclusive) continue;
        if (week.weekStart > ext.newValidTo) continue;
        // avoid duplicates if the person already has a week entry from a real assignment
        if (week.assignments.some((a) => a.personId === ext.personId)) continue;
        week.assignments.push({
          assignmentId: `ext-${ext.id}-${week.weekStart}`,
          personId: ext.personId,
          personName: ext.personName,
          staffingRole: ext.staffingRole,
          allocationPercent: ext.allocationPercent,
          status: 'EXTENDED',
          costPerMonth: null,
        });
        week.totalSupplyPercent = week.assignments.reduce((s, a) => s + a.allocationPercent, 0);
      }
    }

    return cloned;
  }, [moves, suggestions, hireIntents, extensions]);

  const getSupplyDelta = useCallback((): number => {
    const acceptedSuggestions = suggestions.filter((s) => s.accepted).length;
    const hireCount = hireIntents.reduce((s, h) => s + h.count, 0);
    return acceptedSuggestions + moves.filter((m) => m.fromProjectId === '__bench__').length + hireCount - releases.length;
  }, [suggestions, hireIntents, releases, moves]);

  const getCostDelta = useCallback((avgCostPerFte: number): number => {
    const hireCost = hireIntents.reduce((s, h) => s + h.count * avgCostPerFte, 0);
    const releaseSavings = releases.reduce((s, r) => s + (r.costPerMonth ?? avgCostPerFte), 0);
    return hireCost - releaseSavings;
  }, [hireIntents, releases]);

  const getAnomalies = useCallback((): SimAnomaly[] => {
    const out: SimAnomaly[] = [];

    for (const m of moves) {
      if (m.fromProjectId === '__bench__') {
        if (m.cellClass === 'MISMATCH') {
          out.push({
            id: `anom-move-${m.id}`,
            kind: 'skill-mismatch',
            severity: 'warning',
            personId: m.personId,
            personName: m.personName,
            projectId: m.toProjectId,
            projectName: '',
            weekStart: m.weekStart,
            sourceKind: 'move',
            sourceId: m.id,
            message: `${Math.round(m.matchScore * 100)}% skill match — missing: ${m.mismatchedSkills.join(', ') || '—'}`,
            reasonType: m.reason?.type,
            reasonNote: m.reason?.note,
          });
        }
        if (m.cellClass === 'BLOCKED') {
          out.push({
            id: `anom-move-${m.id}`,
            kind: 'over-allocation-override',
            severity: 'danger',
            personId: m.personId,
            personName: m.personName,
            projectId: m.toProjectId,
            projectName: '',
            weekStart: m.weekStart,
            sourceKind: 'move',
            sourceId: m.id,
            message: `Force-assigned despite capacity conflict`,
            reasonType: m.reason?.type,
            reasonNote: m.reason?.note,
          });
        }
      }
    }

    for (const s of suggestions) {
      if (s.accepted && s.cellClass === 'MISMATCH') {
        out.push({
          id: `anom-sug-${s.id}`,
          kind: 'skill-mismatch',
          severity: 'warning',
          personId: s.benchPersonId,
          personName: s.benchPersonName,
          projectId: s.targetProjectId,
          projectName: s.targetProjectName,
          weekStart: s.weekStart,
          sourceKind: 'suggestion',
          sourceId: s.id,
          message: `Auto-match accepted at ${Math.round(s.matchScore * 100)}% — missing: ${s.mismatchedSkills.join(', ') || '—'}`,
        });
      }
    }

    for (const ext of extensions) {
      for (let i = 0; i < ext.conflicts.length; i++) {
        const c = ext.conflicts[i];
        out.push({
          id: `anom-ext-${ext.id}-${i}`,
          kind: c.kind,
          severity: c.severity,
          personId: ext.personId,
          personName: ext.personName,
          projectId: ext.projectId,
          projectName: ext.projectName,
          sourceKind: 'extension',
          sourceId: ext.id,
          message: c.message,
          reasonType: ext.reason?.type,
          reasonNote: ext.reason?.note,
        });
      }
    }

    return out;
  }, [moves, suggestions, extensions]);

  return {
    moves, suggestions, hireIntents, releases, extensions, unmatchedDemand, preview,
    canUndo: undoStack.length > 0, lastActionLabel, hasChanges,
    addMove, removeMove, setMoveReason,
    openPreview, togglePreviewSuggestion, commitPreview, discardPreview,
    acceptSuggestion, rejectSuggestion,
    addHireIntent, removeHireIntent,
    toggleRelease, addExtension, removeExtension, undo, reset,
    serialize, loadState,
    getModifiedProjects, getSupplyDelta, getCostDelta, getAnomalies,
  };
}

export { suggestionKey };
