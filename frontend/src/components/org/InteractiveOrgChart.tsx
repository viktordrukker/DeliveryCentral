import { useCallback, useEffect, useRef, useState } from 'react';
import { OrgChart } from 'd3-org-chart';

import type { OrgChartNode, OrgChartPersonSummary } from '@/lib/api/org-chart';
import type { OrgPersonEnriched, OrgViewMode } from '@/features/org-chart/useOrgChart';
import { renderPersonNodeContent, renderDeptNodeContent } from './OrgChartNode';
import { PersonSidebarDrawer } from './PersonSidebarDrawer';
import { DepartmentSidebarDrawer } from './DepartmentSidebarDrawer';
import { Button } from '@/components/ds';

/* ── Legacy flat node for department view ──────────────────────────────────── */

export interface FlatOrgNode {
  id: string;
  parentId: string | null;
  name: string;
  code: string;
  kind: string;
  manager: OrgChartPersonSummary | null;
  memberCount: number;
  activeAssignments: number;
  utilization: number;
  onBench: number;
  overallocated: number;
  healthStatus: 'green' | 'yellow' | 'red';
  /** All descendant org unit codes (including this node), used to match people */
  allCodes: string[];
}

/** Collect all org unit codes in a subtree (this node + all descendants) */
function collectDescendantCodes(node: OrgChartNode): string[] {
  const codes = [node.code];
  for (const child of node.children) {
    codes.push(...collectDescendantCodes(child));
  }
  return codes;
}

/** Gather all people that belong to any of the given org unit codes */
function gatherPeopleForCodes(
  codes: string[],
  peopleByUnit: Map<string, OrgPersonEnriched[]>,
): OrgPersonEnriched[] {
  const seen = new Set<string>();
  const result: OrgPersonEnriched[] = [];
  for (const code of codes) {
    for (const p of peopleByUnit.get(code) ?? []) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        result.push(p);
      }
    }
  }
  return result;
}

function flattenDeptTree(
  nodes: OrgChartNode[],
  parentId: string | null = null,
  peopleByUnit: Map<string, OrgPersonEnriched[]> = new Map(),
): FlatOrgNode[] {
  const result: FlatOrgNode[] = [];
  for (const node of nodes) {
    // Collect all codes in this subtree so we match people in child units too
    const allCodes = collectDescendantCodes(node);
    const unitPeople = gatherPeopleForCodes(allCodes, peopleByUnit);
    const memberCount = unitPeople.length > 0 ? unitPeople.length : node.members.length;
    const totalAssignments = unitPeople.reduce((s, p) => s + p.assignmentCount, 0);
    const avgAllocation = memberCount > 0
      ? Math.round(unitPeople.reduce((s, p) => s + p.totalAllocation, 0) / memberCount)
      : 0;
    const overallocated = unitPeople.filter((p) => p.totalAllocation > 100).length;
    const onBench = unitPeople.filter((p) => p.totalAllocation === 0 && p.lifecycleStatus.toUpperCase() === 'ACTIVE').length;

    let healthStatus: 'green' | 'yellow' | 'red';
    if (overallocated > 0) {
      healthStatus = 'red';
    } else if (onBench > 0 || memberCount === 0) {
      healthStatus = memberCount === 0 && node.children.length > 0 ? 'green' : 'yellow';
    } else {
      healthStatus = 'green';
    }

    result.push({
      id: node.id,
      parentId,
      name: node.name,
      code: node.code,
      kind: node.kind,
      manager: node.manager,
      memberCount,
      activeAssignments: totalAssignments,
      utilization: avgAllocation,
      onBench,
      overallocated,
      healthStatus,
      allCodes,
    });
    result.push(...flattenDeptTree(node.children, node.id, peopleByUnit));
  }
  return result;
}

/* ── People-centric flat node ──────────────────────────────────────────────── */

export interface FlatPersonNode {
  id: string;
  parentId: string | null;
  displayName: string;
  primaryEmail: string | null;
  orgUnitName: string | null;
  lifecycleStatus: string;
  assignmentCount: number;
  totalAllocation: number;
  /** Top 3 assignments by allocation % */
  topAssignments: Array<{ projectId: string; projectName: string; pct: number }>;
  resourcePools: Array<{ id: string; name: string }>;
  dottedLineManagerIds: string[];
}

/** Sentinel ID for the synthetic root that groups all top-level people */
export const SYNTHETIC_ROOT_ID = '__org_root__';

function buildPeopleTree(people: OrgPersonEnriched[]): FlatPersonNode[] {
  const personIds = new Set(people.map((p) => p.id));

  const nodes: FlatPersonNode[] = people.map((p) => {
    const sorted = [...p.allocations].sort((a, b) => b.allocationPercent - a.allocationPercent);
    const hasParentInTree = p.lineManagerId && personIds.has(p.lineManagerId);
    return {
      id: p.id,
      parentId: hasParentInTree ? p.lineManagerId : SYNTHETIC_ROOT_ID,
      displayName: p.displayName,
      primaryEmail: p.primaryEmail,
      orgUnitName: p.orgUnitName,
      lifecycleStatus: p.lifecycleStatus,
      assignmentCount: p.assignmentCount,
      totalAllocation: p.totalAllocation,
      topAssignments: sorted.slice(0, 3).map((a) => ({
        projectId: a.projectId,
        projectName: a.projectName,
        pct: a.allocationPercent,
      })),
      resourcePools: p.resourcePools,
      dottedLineManagerIds: p.dottedLineManagerIds,
    };
  });

  // d3.stratify() requires exactly one root (parentId === null).
  nodes.unshift({
    id: SYNTHETIC_ROOT_ID,
    parentId: null,
    displayName: 'Organization',
    primaryEmail: null,
    orgUnitName: null,
    lifecycleStatus: 'ACTIVE',
    assignmentCount: 0,
    totalAllocation: 0,
    topAssignments: [],
    resourcePools: [],
    dottedLineManagerIds: [],
  });

  return nodes;
}

/* ── Expand level helpers ─────────────────────────────────────────────────── */

function computeMaxDepth(chart: OrgChart<unknown>): number {
  try {
    const state = (chart as unknown as { getChartState: () => { root?: { descendants?: () => Array<{ depth: number }> } } }).getChartState();
    const descendants = state.root?.descendants?.() ?? [];
    return descendants.reduce((max, d) => Math.max(max, d.depth), 0);
  } catch {
    return 5;
  }
}

function expandToLevel(chart: OrgChart<unknown>, level: number): void {
  try {
    const state = (chart as unknown as { getChartState: () => { root?: { descendants?: () => Array<{ depth: number; data: { _expanded?: boolean } }> } } }).getChartState();
    const descendants = state.root?.descendants?.() ?? [];
    for (const d of descendants) {
      d.data._expanded = d.depth < level;
    }
    (chart as unknown as { update: (d: unknown) => void }).update(state.root);
    chart.fit();
  } catch {
    // fallback: use built-in methods
    if (level <= 0) {
      chart.collapseAll();
    } else {
      chart.expandAll();
    }
  }
}

/* ── Props ─────────────────────────────────────────────────────────────────── */

interface InteractiveOrgChartProps {
  roots: OrgChartNode[];
  people: OrgPersonEnriched[];
  allPeople: OrgPersonEnriched[];
  searchTerm?: string;
  dottedLines?: Array<{ from: string; to: string }>;
  onNodeClick?: (node: FlatOrgNode | FlatPersonNode) => void;
  viewMode: OrgViewMode;
}

/* ── Component ─────────────────────────────────────────────────────────────── */

export function InteractiveOrgChart({
  roots,
  people,
  allPeople,
  searchTerm = '',
  dottedLines = [],
  onNodeClick,
  viewMode,
}: InteractiveOrgChartProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<OrgChart<FlatPersonNode | FlatOrgNode> | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<OrgPersonEnriched | null>(null);
  const [selectedDept, setSelectedDept] = useState<FlatOrgNode | null>(null);
  const [expandLevel, setExpandLevel] = useState(2);
  const [maxDepth, setMaxDepth] = useState(5);

  // Close drawers when switching views
  useEffect(() => {
    setSelectedPerson(null);
    setSelectedDept(null);
  }, [viewMode]);

  // d3-org-chart passes the d3 hierarchy node, not the raw data object.
  // The raw data is on node.data. The hierarchy node also has .id from stratify.
  const handleNodeClick = useCallback((node: unknown) => {
    // Extract the actual data from the d3 hierarchy node
    const raw = (node && typeof node === 'object' && 'data' in node)
      ? (node as { data: FlatPersonNode | FlatOrgNode }).data
      : node as FlatPersonNode | FlatOrgNode;
    const id = raw?.id ?? ((node as { id?: string })?.id);

    if (!id || id === SYNTHETIC_ROOT_ID) return;

    if (viewMode === 'people') {
      const enriched = allPeople.find((p) => p.id === id) ?? null;
      setSelectedPerson(enriched);
      setSelectedDept(null);
    } else {
      setSelectedDept(raw as FlatOrgNode);
      setSelectedPerson(null);
    }
    onNodeClick?.(raw);
  }, [onNodeClick, allPeople, viewMode]);

  // Build people-by-unit map for department utilization
  const peopleByUnit = useRef(new Map<string, OrgPersonEnriched[]>());
  useEffect(() => {
    const map = new Map<string, OrgPersonEnriched[]>();
    for (const p of allPeople) {
      if (p.orgUnitCode) {
        const arr = map.get(p.orgUnitCode) ?? [];
        arr.push(p);
        map.set(p.orgUnitCode, arr);
      }
    }
    peopleByUnit.current = map;
  }, [allPeople]);

  // Render / re-render chart
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    el.replaceChildren();
    chartRef.current = null;

    if (viewMode === 'people') {
      if (people.length === 0) return;
      const flatData = buildPeopleTree(people);
      if (flatData.length === 0) return;

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const chart = (new OrgChart<FlatPersonNode>()
          .container(`#${el.id}`)
          .data(flatData)
          .nodeWidth(() => 280)
          .nodeHeight(() => 160)
          .nodeId((d: FlatPersonNode) => d.id)
          .parentNodeId((d: FlatPersonNode) => d.parentId)
          .compact(false) as any)
          .initialExpandLevel(expandLevel)
          .connectionsUpdate(function (this: SVGPathElement) {
            this.setAttribute('stroke', '#be185d');
            this.setAttribute('stroke-dasharray', '8 5');
            this.setAttribute('stroke-width', '2.5');
            this.setAttribute('stroke-linecap', 'round');
            this.setAttribute('opacity', '0.75');
            this.style.pointerEvents = 'none';
            this.removeAttribute('marker-start');
            this.removeAttribute('marker-end');
          })
          .nodeContent((d: { data: FlatPersonNode; width: number; height: number }) => renderPersonNodeContent(d.data, d.width, d.height, searchTerm))
          .onNodeClick(handleNodeClick)
          .render() as OrgChart<FlatPersonNode>;

        const peopleDottedLines: Array<{ from: string; to: string }> = [];
        for (const p of people) {
          for (const mgrId of p.dottedLineManagerIds) {
            peopleDottedLines.push({ from: mgrId, to: p.id });
          }
        }
        if (peopleDottedLines.length > 0) {
          chart.connections(peopleDottedLines.map(({ from, to }) => ({ from, to, label: 'dotted-line' })));
        }

        chart.fit();
        chartRef.current = chart as unknown as OrgChart<FlatPersonNode | FlatOrgNode>;
        setMaxDepth(computeMaxDepth(chart as unknown as OrgChart<unknown>));
      } catch {
        // d3-org-chart may fail if container is not ready
      }
    } else {
      if (roots.length === 0) return;
      const flatData = flattenDeptTree(roots, null, peopleByUnit.current);
      if (flatData.length === 0) return;

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const chart = (new OrgChart<FlatOrgNode>()
          .container(`#${el.id}`)
          .data(flatData)
          .nodeWidth(() => 220)
          .nodeHeight(() => 120)
          .nodeId((d: FlatOrgNode) => d.id)
          .parentNodeId((d: FlatOrgNode) => d.parentId)
          .compact(false) as any)
          .initialExpandLevel(expandLevel)
          .connectionsUpdate(function (this: SVGPathElement) {
            this.setAttribute('stroke', '#be185d');
            this.setAttribute('stroke-dasharray', '8 5');
            this.setAttribute('stroke-width', '2.5');
            this.setAttribute('stroke-linecap', 'round');
            this.setAttribute('opacity', '0.75');
            this.style.pointerEvents = 'none';
            this.removeAttribute('marker-start');
            this.removeAttribute('marker-end');
          })
          .nodeContent((d: { data: FlatOrgNode; width: number; height: number }) => renderDeptNodeContent(d.data, d.width, d.height, searchTerm))
          .onNodeClick(handleNodeClick)
          .render() as OrgChart<FlatOrgNode>;

        if (dottedLines.length > 0) {
          chart.connections(dottedLines.map(({ from, to }) => ({ from, to, label: 'dotted-line' })));
        }

        chart.fit();
        chartRef.current = chart as unknown as OrgChart<FlatPersonNode | FlatOrgNode>;
        setMaxDepth(computeMaxDepth(chart as unknown as OrgChart<unknown>));
      } catch {
        // d3-org-chart may fail if container is not ready
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roots, people, searchTerm, dottedLines, handleNodeClick, viewMode]);

  const handleFit = () => chartRef.current?.fit();
  const handleZoomIn = () => chartRef.current?.zoomIn();
  const handleZoomOut = () => chartRef.current?.zoomOut();
  const handleExpandAll = () => {
    chartRef.current?.expandAll();
    setExpandLevel(maxDepth);
  };
  const handleCollapseAll = () => {
    chartRef.current?.collapseAll();
    setExpandLevel(0);
  };
  const handleExportPng = () => { chartRef.current?.exportImg({ full: true, save: true }); };

  const handleLevelChange = (level: number) => {
    setExpandLevel(level);
    if (chartRef.current) {
      expandToLevel(chartRef.current as unknown as OrgChart<unknown>, level);
    }
  };

  // Build level buttons (1 through min(maxDepth, 6))
  const levelButtons = Array.from({ length: Math.min(maxDepth, 6) }, (_, i) => i + 1);

  return (
    <div className="interactive-org-chart" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div className="org-chart-toolbar" style={{ flexWrap: 'wrap', height: 'auto', minHeight: 44, padding: '4px var(--space-3, 12px)' }}>
        {/* Zoom controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Button variant="secondary" size="sm" onClick={handleZoomIn} title="Zoom in" type="button">+</Button>
          <Button variant="secondary" size="sm" onClick={handleZoomOut} title="Zoom out" type="button">{'\u2212'}</Button>
          <Button variant="secondary" size="sm" onClick={handleFit} title="Fit to screen" type="button">{'\u229E'} Fit</Button>
        </div>

        {/* Separator */}
        <div style={{ width: 1, height: 20, background: 'var(--color-border)', margin: '0 4px' }} />

        {/* Expand/Collapse */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Button variant="secondary" size="sm" onClick={handleCollapseAll} title="Collapse all" type="button">{'\u2194'} Collapse</Button>
          <Button variant="secondary" size="sm" onClick={handleExpandAll} title="Expand all" type="button">{'\u2195'} Expand</Button>
        </div>

        {/* Separator */}
        <div style={{ width: 1, height: 20, background: 'var(--color-border)', margin: '0 4px' }} />

        {/* Level controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginRight: 4, fontWeight: 500 }}>Depth:</span>
          {levelButtons.map((level) => (
            <Button key={level} variant="primary" size="sm" onClick={() => handleLevelChange(level)} title={`Expand to level ${level}`} type="button" style={{ minWidth: 26, padding: '2px 6px', fontSize: 11, fontWeight: expandLevel === level ? 700 : 400, background: expandLevel === level ? 'var(--color-primary, #114b7a)' : 'transparent', color: expandLevel === level ? '#fff' : 'var(--color-text-secondary)', border: expandLevel === level ? 'none' : '1px solid var(--color-border)', borderRadius: 4, cursor: 'pointer', }}>
              {level}
            </Button>
          ))}
        </div>

        {/* Separator */}
        <div style={{ width: 1, height: 20, background: 'var(--color-border)', margin: '0 4px' }} />

        {/* Export */}
        <Button variant="secondary" size="sm" onClick={handleExportPng} title="Export PNG" type="button">{'\uD83D\uDCF7'} Export</Button>
      </div>

      {/* Chart area */}
      <div
        className="org-chart-container"
        id="org-chart-area"
        ref={containerRef}
        style={{ flex: 1, width: '100%', minHeight: 0 }}
      />

      {/* Person sidebar drawer */}
      {selectedPerson && (
        <PersonSidebarDrawer
          person={selectedPerson}
          onClose={() => setSelectedPerson(null)}
        />
      )}

      {/* Department sidebar drawer */}
      {selectedDept && (
        <DepartmentSidebarDrawer
          dept={selectedDept}
          people={allPeople}
          onClose={() => setSelectedDept(null)}
        />
      )}
    </div>
  );
}
