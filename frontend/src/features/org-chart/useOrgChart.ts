import { useCallback, useEffect, useMemo, useState } from 'react';

import { fetchOrgChart, OrgChartNode, OrgChartResponse } from '@/lib/api/org-chart';
import { fetchPersonDirectory, PersonDirectoryItem } from '@/lib/api/person-directory';
import { fetchWorkloadMatrix, WorkloadPerson } from '@/lib/api/workload';
import { QueryState } from '@/lib/api/query-state';

/* ── Public event name ─────────────────────────────────────────────────────── */

/**
 * Fire this event from any page that mutates person / assignment / skill data.
 * The org chart hook listens for it and refetches automatically.
 *
 * Usage:  window.dispatchEvent(new CustomEvent('org:data-changed'));
 */
export const ORG_DATA_CHANGED_EVENT = 'org:data-changed';

/* ── Enriched person type ──────────────────────────────────────────────────── */

export interface OrgPersonEnriched {
  id: string;
  displayName: string;
  primaryEmail: string | null;
  orgUnitName: string | null;
  orgUnitCode: string | null;
  lifecycleStatus: string;
  lineManagerId: string | null;
  lineManagerName: string | null;
  dottedLineManagerIds: string[];
  assignmentCount: number;
  role: string | null;
  grade: string | null;
  resourcePools: Array<{ id: string; name: string }>;
  /** Real allocation data from workload matrix — empty array if not loaded yet */
  allocations: Array<{ projectId: string; projectName: string; allocationPercent: number }>;
  totalAllocation: number;
}

/* ── State shape ───────────────────────────────────────────────────────────── */

export type OrgViewMode = 'people' | 'departments';

interface OrgChartState extends QueryState<OrgChartResponse> {
  visibleRoots: OrgChartNode[];
  /** Enriched person list for people-centric view */
  people: OrgPersonEnriched[];
  /** Filtered people list (search applied) */
  filteredPeople: OrgPersonEnriched[];
  /** Timestamp of last successful data load */
  lastUpdated: Date | null;
  /** Trigger a manual refetch */
  refetch: () => void;
}

/* ── Department tree filter (legacy) ───────────────────────────────────────── */

function filterTree(nodes: OrgChartNode[], search: string): OrgChartNode[] {
  if (!search) {
    return nodes;
  }

  const normalized = search.toLowerCase();

  return nodes
    .map((node) => {
      const children = filterTree(node.children, search);
      const nodeMatches = [
        node.name,
        node.code,
        node.kind,
        node.manager?.displayName ?? '',
        ...node.members.map((member) => member.displayName),
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalized);

      if (!nodeMatches && children.length === 0) {
        return null;
      }

      return {
        ...node,
        children,
      };
    })
    .filter((node): node is OrgChartNode => node !== null);
}

/* ── People filter ─────────────────────────────────────────────────────────── */

function filterPeople(people: OrgPersonEnriched[], search: string): OrgPersonEnriched[] {
  if (!search) return people;
  const q = search.toLowerCase();
  return people.filter((p) =>
    p.displayName.toLowerCase().includes(q)
    || (p.primaryEmail?.toLowerCase().includes(q) ?? false)
    || (p.orgUnitName?.toLowerCase().includes(q) ?? false)
    || p.allocations.some((a) => a.projectName.toLowerCase().includes(q)),
  );
}

/* ── Enrich people with workload data ──────────────────────────────────────── */

function enrichPeople(
  directory: PersonDirectoryItem[],
  workload: WorkloadPerson[],
): OrgPersonEnriched[] {
  const workloadMap = new Map<string, WorkloadPerson>();
  for (const wp of workload) {
    workloadMap.set(wp.id, wp);
  }

  return directory.map((person) => {
    const wl = workloadMap.get(person.id);
    const allocations = wl?.allocations.map((a) => ({
      projectId: a.projectId,
      projectName: a.projectName,
      allocationPercent: a.allocationPercent,
    })) ?? [];
    const totalAllocation = allocations.reduce((sum, a) => sum + a.allocationPercent, 0);

    return {
      id: person.id,
      displayName: person.displayName,
      primaryEmail: person.primaryEmail,
      orgUnitName: person.currentOrgUnit?.name ?? null,
      orgUnitCode: person.currentOrgUnit?.code ?? null,
      lifecycleStatus: person.lifecycleStatus,
      lineManagerId: person.currentLineManager?.id ?? null,
      lineManagerName: person.currentLineManager?.displayName ?? null,
      dottedLineManagerIds: person.dottedLineManagers.map((m) => m.id),
      assignmentCount: person.currentAssignmentCount,
      role: person.role ?? null,
      grade: person.grade ?? null,
      resourcePools: person.resourcePools,
      allocations,
      totalAllocation,
    };
  });
}

/* ── Hook ──────────────────────────────────────────────────────────────────── */

export function useOrgChart(search: string): OrgChartState {
  const [state, setState] = useState<QueryState<OrgChartResponse>>({
    isLoading: true,
  });
  const [people, setPeople] = useState<OrgPersonEnriched[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const refetch = useCallback(() => setReloadToken((t) => t + 1), []);

  // Fetch all data sources
  useEffect(() => {
    let active = true;

    setState({ isLoading: true });

    // Fetch all sources independently so partial failures don't block the page
    const orgPromise = fetchOrgChart().catch(() => null);
    const dirPromise = fetchPersonDirectory({ page: 1, pageSize: 500 }).catch(() => null);
    const workloadPromise = fetchWorkloadMatrix().catch(() => ({ people: [] as WorkloadPerson[], projects: [] }));

    Promise.all([orgPromise, dirPromise, workloadPromise])
      .then(([orgData, dirData, workloadData]) => {
        if (!active) return;

        if (orgData) {
          setState({ data: orgData, isLoading: false });
        } else if (dirData) {
          // Org chart API failed but we still have people data — allow people view
          setState({ data: { roots: [], dottedLineRelationships: [] }, isLoading: false });
        } else {
          setState({ error: 'Failed to load org chart data.', isLoading: false });
        }

        if (dirData) {
          setPeople(enrichPeople(dirData.items, workloadData.people));
        }

        setLastUpdated(new Date());
      });

    return () => { active = false; };
  }, [reloadToken]);

  // Listen for org:data-changed events from other pages
  useEffect(() => {
    function handleOrgDataChanged(): void {
      refetch();
    }
    window.addEventListener(ORG_DATA_CHANGED_EVENT, handleOrgDataChanged);
    return () => window.removeEventListener(ORG_DATA_CHANGED_EVENT, handleOrgDataChanged);
  }, [refetch]);

  const visibleRoots = useMemo(
    () => filterTree(state.data?.roots ?? [], search.trim()),
    [search, state.data?.roots],
  );

  const filteredPeople = useMemo(
    () => filterPeople(people, search.trim()),
    [people, search],
  );

  return {
    ...state,
    visibleRoots,
    people,
    filteredPeople,
    lastUpdated,
    refetch,
  };
}
