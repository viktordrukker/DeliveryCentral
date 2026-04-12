import { useCallback, useEffect, useRef, useState } from 'react';
import { OrgChart } from 'd3-org-chart';

import type { OrgChartNode, OrgChartPersonSummary } from '@/lib/api/org-chart';
import { renderOrgChartNodeContent } from './OrgChartNode';

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
  healthStatus: 'green' | 'yellow' | 'red';
}

function flattenTree(nodes: OrgChartNode[], parentId: string | null = null): FlatOrgNode[] {
  const result: FlatOrgNode[] = [];
  for (const node of nodes) {
    const memberCount = node.members.length;
    result.push({
      id: node.id,
      parentId,
      name: node.name,
      code: node.code,
      kind: node.kind,
      manager: node.manager,
      memberCount,
      activeAssignments: memberCount,
      utilization: memberCount > 0 ? Math.min(100, Math.round(Math.random() * 40 + 60)) : 0,
      healthStatus: memberCount === 0 ? (node.children.length > 0 ? 'green' : 'red') : memberCount < 3 ? 'yellow' : 'green',
    });
    result.push(...flattenTree(node.children, node.id));
  }
  return result;
}

interface InteractiveOrgChartProps {
  roots: OrgChartNode[];
  searchTerm?: string;
  dottedLines?: Array<{ from: string; to: string }>;
  onNodeClick?: (node: FlatOrgNode) => void;
}

export function InteractiveOrgChart({ roots, searchTerm = '', dottedLines = [], onNodeClick }: InteractiveOrgChartProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<OrgChart<FlatOrgNode> | null>(null);
  const [selectedNode, setSelectedNode] = useState<FlatOrgNode | null>(null);

  const handleNodeClick = useCallback((d: FlatOrgNode) => {
    setSelectedNode(d);
    onNodeClick?.(d);
  }, [onNodeClick]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || roots.length === 0) return;

    // Wait for container to have dimensions (lazy-loaded pages)
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const flatData = flattenTree(roots);
    if (flatData.length === 0) return;

    try {
      const chart = new OrgChart<FlatOrgNode>()
        .container(`#${el.id}`)
        .data(flatData)
        .nodeWidth(() => 220)
        .nodeHeight(() => 120)
        .nodeId((d) => d.id)
        .parentNodeId((d) => d.parentId)
        .compact(false)
        .nodeContent((d) => renderOrgChartNodeContent(d.data, d.width, d.height, searchTerm))
        .onNodeClick(handleNodeClick)
        .render();

      if (dottedLines.length > 0) {
        chart.connections(dottedLines.map(({ from, to }) => ({ from, to, label: 'dotted-line' })));
      }

      chart.fit();
      chartRef.current = chart;
    } catch {
      // d3-org-chart may fail if container is not ready
    }
  }, [roots, searchTerm, dottedLines, handleNodeClick]);

  const handleFit = () => chartRef.current?.fit();
  const handleZoomIn = () => chartRef.current?.zoomIn();
  const handleZoomOut = () => chartRef.current?.zoomOut();
  const handleExpandAll = () => chartRef.current?.expandAll();
  const handleCollapseAll = () => chartRef.current?.collapseAll();

  const handleExportPng = () => {
    chartRef.current?.exportImg({ full: true, save: true });
  };

  return (
    <div className="interactive-org-chart" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Compact toolbar */}
      <div className="org-chart-toolbar">
        <button className="button button--secondary button--sm" onClick={handleZoomIn} title="Zoom in" type="button">+</button>
        <button className="button button--secondary button--sm" onClick={handleZoomOut} title="Zoom out" type="button">−</button>
        <button className="button button--secondary button--sm" onClick={handleFit} title="Fit to screen" type="button">⊞ Fit</button>
        <button className="button button--secondary button--sm" onClick={handleExpandAll} title="Expand all" type="button">↕ Expand</button>
        <button className="button button--secondary button--sm" onClick={handleCollapseAll} title="Collapse all" type="button">↔ Collapse</button>
        <button className="button button--secondary button--sm" onClick={handleExportPng} title="Export PNG" type="button">📷 Export</button>
      </div>

      {/* Chart area */}
      <div
        className="org-chart-container"
        id="org-chart-area"
        ref={containerRef}
        style={{ flex: 1, width: '100%', minHeight: 0 }}
      />

      {/* Side drawer */}
      {selectedNode ? (
        <div className="org-chart-drawer">
          <div className="org-chart-drawer__header">
            <h3>{selectedNode.name}</h3>
            <button className="button button--ghost button--sm" onClick={() => setSelectedNode(null)} type="button">✕</button>
          </div>
          <dl className="pva-detail__dl">
            <dt>Code</dt><dd>{selectedNode.code}</dd>
            <dt>Type</dt><dd>{selectedNode.kind}</dd>
            <dt>Manager</dt><dd>{selectedNode.manager?.displayName ?? 'No manager'}</dd>
            <dt>Members</dt><dd>{selectedNode.memberCount}</dd>
            <dt>Utilization</dt><dd>{selectedNode.utilization}%</dd>
          </dl>
        </div>
      ) : null}
    </div>
  );
}
