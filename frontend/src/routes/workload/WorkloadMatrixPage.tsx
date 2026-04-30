import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { useFilterParams } from '@/hooks/useFilterParams';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { FilterBar } from '@/components/common/FilterBar';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { fetchOrgChart } from '@/lib/api/org-chart';
import { fetchResourcePools, ResourcePool } from '@/lib/api/resource-pools';
import { fetchPersonDirectory } from '@/lib/api/person-directory';
import { fetchWorkloadMatrix, WorkloadMatrixResponse } from '@/lib/api/workload';
import { exportToXlsx } from '@/lib/export';
import { Button, IconButton, Table, type Column } from '@/components/ds';
import type { WorkloadPerson } from '@/lib/api/workload';

/* ── Allocation helpers (private) ──────────────────────────────────────────── */

function allocClass(pct: number): string {
  if (pct === 0) return 'alloc-cell alloc-cell--zero';
  if (pct < 50) return 'alloc-cell alloc-cell--low';
  if (pct < 80) return 'alloc-cell alloc-cell--medium';
  if (pct < 100) return 'alloc-cell alloc-cell--high';
  return 'alloc-cell alloc-cell--over';
}

/* ── Extracted style constants (20d-02) ── */
const S_FILTER_ROW: React.CSSProperties = { display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginTop: 'var(--space-3)' };
const S_FILTER_INPUT: React.CSSProperties = { maxWidth: '220px' };
const S_SUMMARY: React.CSSProperties = { fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px', marginBottom: 'var(--space-3)' };
const S_LEGEND: React.CSSProperties = { display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--color-text)' };
const S_LEGEND_ITEM: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '4px' };
const S_LEGEND_SWATCH: React.CSSProperties = { width: '14px', height: '14px', minHeight: 0, fontSize: 0, border: '1px solid var(--color-border)' };
const S_GRID_WRAP: React.CSSProperties = { overflowX: 'auto', marginTop: '1rem' };
const S_MATRIX_TABLE: React.CSSProperties = { borderCollapse: 'collapse', width: '100%', fontSize: '0.85rem' };
const S_THEAD_ROW: React.CSSProperties = { background: 'var(--color-surface-alt)' };
const S_STICKY_TH: React.CSSProperties = { position: 'sticky', left: 0, background: 'var(--color-surface-alt)', zIndex: 2, padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid var(--color-border)', minWidth: '160px' };

function allocColor(pct: number): string {
  if (pct === 0) return 'var(--color-text-tertiary)';
  if (pct < 80) return 'var(--color-status-active)';
  if (pct < 100) return 'var(--color-status-warning)';
  return 'var(--color-status-danger)';
}

/* ── Panel data ────────────────────────────────────────────────────────────── */

interface PanelData {
  personName: string;
  personId: string;
  projectName: string;
  projectId: string;
  allocationPercent: number;
}

/* ── Component ─────────────────────────────────────────────────────────────── */

export function WorkloadMatrixPage(): JSX.Element {
  const [matrix, setMatrix] = useState<WorkloadMatrixResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pools, setPools] = useState<ResourcePool[]>([]);
  const [orgUnits, setOrgUnits] = useState<Array<{ id: string; name: string }>>([]);
  const [managers, setManagers] = useState<Array<{ id: string; displayName: string }>>([]);

  const [urlFilters, setUrlFilters] = useFilterParams({ poolId: '', orgUnitId: '', managerId: '', personFilter: '', projectFilter: '' });
  const poolId = urlFilters.poolId;
  const orgUnitId = urlFilters.orgUnitId;
  const managerId = urlFilters.managerId;
  const setPoolId = (v: string) => setUrlFilters({ poolId: v });
  const setOrgUnitId = (v: string) => setUrlFilters({ orgUnitId: v });
  const setManagerId = (v: string) => setUrlFilters({ managerId: v });

  // Search filters (A5) — persisted in URL
  const personFilter = urlFilters.personFilter;
  const projectFilter = urlFilters.projectFilter;
  const setPersonFilter = (v: string) => setUrlFilters({ personFilter: v });
  const setProjectFilter = (v: string) => setUrlFilters({ projectFilter: v });

  // Keyboard focus (A2)
  const [focusedCell, setFocusedCell] = useState<string | null>(null);
  const cellRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Drill-down panel (A3)
  const [panel, setPanel] = useState<PanelData | null>(null);

  // Load filter option data
  useEffect(() => {
    void fetchResourcePools()
      .then((r) => setPools(r.items))
      .catch(() => undefined);

    void fetchOrgChart()
      .then((r) => {
        const units: Array<{ id: string; name: string }> = [];
        function collectUnits(nodes: typeof r.roots): void {
          for (const n of nodes) {
            units.push({ id: n.id, name: n.name });
            collectUnits(n.children);
          }
        }
        collectUnits(r.roots);
        setOrgUnits(units);
      })
      .catch(() => undefined);

    void fetchPersonDirectory({ page: 1, pageSize: 500 })
      .then((r) => setManagers(r.items.map((p) => ({ id: p.id, displayName: p.displayName }))))
      .catch(() => undefined);
  }, []);

  // Load matrix
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    void fetchWorkloadMatrix({
      poolId: poolId || undefined,
      orgUnitId: orgUnitId || undefined,
      managerId: managerId || undefined,
    })
      .then((data) => {
        setMatrix(data);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load workload matrix.');
        setIsLoading(false);
      });
  }, [poolId, orgUnitId, managerId]);

  // Filtered data
  const filteredPeople = matrix
    ? matrix.people.filter((p) => p.displayName.toLowerCase().includes(personFilter.toLowerCase()))
    : [];
  const filteredProjects = matrix
    ? matrix.projects.filter((p) => p.name.toLowerCase().includes(projectFilter.toLowerCase()))
    : [];

  // Focus effect
  useEffect(() => {
    if (focusedCell) {
      cellRefs.current[focusedCell]?.focus();
    }
  }, [focusedCell]);

  // Escape to close panel
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape' && panel) {
        setPanel(null);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [panel]);

  const handleGridKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!focusedCell) return;
      const [rStr, cStr] = focusedCell.split('-');
      let r = parseInt(rStr, 10);
      let c = parseInt(cStr, 10);
      const maxR = filteredPeople.length - 1;
      const maxC = filteredProjects.length - 1;
      let handled = true;

      switch (e.key) {
        case 'ArrowRight':
          c = Math.min(c + 1, maxC);
          break;
        case 'ArrowLeft':
          c = Math.max(c - 1, 0);
          break;
        case 'ArrowDown':
          r = Math.min(r + 1, maxR);
          break;
        case 'ArrowUp':
          r = Math.max(r - 1, 0);
          break;
        case 'Home':
          if (e.ctrlKey || e.metaKey) {
            r = 0;
            c = 0;
          } else {
            c = 0;
          }
          break;
        case 'End':
          if (e.ctrlKey || e.metaKey) {
            r = maxR;
            c = maxC;
          } else {
            c = maxC;
          }
          break;
        case 'Enter': {
          e.preventDefault();
          const person = filteredPeople[r];
          const project = filteredProjects[c];
          if (person && project) {
            const alloc = person.allocations.find((a) => a.projectId === project.id);
            const pct = alloc?.allocationPercent ?? 0;
            if (pct > 0) {
              setPanel({
                personName: person.displayName,
                personId: person.id,
                projectName: project.name,
                projectId: project.id,
                allocationPercent: pct,
              });
            }
          }
          return;
        }
        case 'Escape':
          e.preventDefault();
          setPanel(null);
          return;
        default:
          handled = false;
      }

      if (handled) {
        e.preventDefault();
        setFocusedCell(`${r}-${c}`);
      }
    },
    [focusedCell, filteredPeople, filteredProjects],
  );

  function handleCellClick(person: typeof filteredPeople[0], project: typeof filteredProjects[0], pct: number): void {
    if (pct > 0) {
      setPanel({
        personName: person.displayName,
        personId: person.id,
        projectName: project.name,
        projectId: project.id,
        allocationPercent: pct,
      });
    }
  }

  function handleExport(): void {
    if (!matrix) return;
    const rows = matrix.people.map((person) => {
      const row: Record<string, unknown> = { Person: person.displayName };
      for (const project of matrix.projects) {
        const alloc = person.allocations.find((a) => a.projectId === project.id);
        row[project.name] = alloc ? `${alloc.allocationPercent}%` : '\u2014';
      }
      const total = person.allocations.reduce((sum, a) => sum + a.allocationPercent, 0);
      row['Total'] = `${total}%`;
      return row;
    });
    exportToXlsx(rows, 'workload_matrix');
  }

  return (
    <PageContainer viewport>
      <PageHeader
        eyebrow="Workload"
        subtitle="Allocation matrix showing each person's current active assignments across projects."
        title="Workload Matrix"
      />

      <FilterBar>
        <label className="field">
          <span className="field__label">Resource Pool</span>
          <select className="field__control" onChange={(e) => setPoolId(e.target.value)} value={poolId}>
            <option value="">All pools</option>
            {pools.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Org Unit</span>
          <select className="field__control" onChange={(e) => setOrgUnitId(e.target.value)} value={orgUnitId}>
            <option value="">All org units</option>
            {orgUnits.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Manager</span>
          <select className="field__control" onChange={(e) => setManagerId(e.target.value)} value={managerId}>
            <option value="">All managers</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>{m.displayName}</option>
            ))}
          </select>
        </label>

        <Button variant="secondary" onClick={handleExport} style={{ alignSelf: 'flex-end' }} type="button">
          Export XLSX
        </Button>
      </FilterBar>

      {isLoading ? <LoadingState label="Loading workload matrix..." variant="skeleton" skeletonType="chart" /> : null}
      {error ? <ErrorState description={error} onRetry={() => { setError(null); setIsLoading(true); }} /> : null}

      {!isLoading && !error && matrix ? (
        matrix.projects.length === 0 || matrix.people.length === 0 ? (
          <EmptyState
            action={{ href: '/projects', label: 'View Projects' }}
            description="No active assignments found for the current filters."
            title="No workload data"
          />
        ) : (
          <>
            {/* Search filters (A5) */}
            <div style={S_FILTER_ROW}>
              <input
                className="field__control"
                onChange={(e) => setPersonFilter(e.target.value)}
                placeholder="Filter people..."
                style={S_FILTER_INPUT}
                type="text"
                value={personFilter}
              />
              <input
                className="field__control"
                onChange={(e) => setProjectFilter(e.target.value)}
                placeholder="Filter projects..."
                style={S_FILTER_INPUT}
                type="text"
                value={projectFilter}
              />
            </div>
            <div style={S_SUMMARY}>
              Showing {filteredPeople.length} of {matrix.people.length} people, {filteredProjects.length} of {matrix.projects.length} projects
            </div>

            {/* Legend */}
            <div style={S_LEGEND}>
              <span style={{ fontWeight: 600 }}>Legend:</span>
              {[
                { cls: 'alloc-cell alloc-cell--low', label: '< 50% (under)' },
                { cls: 'alloc-cell alloc-cell--medium', label: '50\u201379% (normal)' },
                { cls: 'alloc-cell alloc-cell--high', label: '80\u201399% (high)' },
                { cls: 'alloc-cell alloc-cell--over', label: '\u2265 100% (over)' },
              ].map(({ cls, label }) => (
                <span key={label} style={S_LEGEND_ITEM}>
                  <span className={cls} style={S_LEGEND_SWATCH} />
                  <span>{label}</span>
                </span>
              ))}
            </div>

            <div style={S_GRID_WRAP} role="grid" onKeyDown={handleGridKeyDown}>
              <Table
                variant="compact"
                columns={[
                  {
                    key: 'person',
                    title: 'Person',
                    cellStyle: {
                      position: 'sticky',
                      left: 0,
                      background: 'var(--color-surface)',
                      zIndex: 1,
                      padding: '6px 12px',
                      fontWeight: 500,
                    },
                    headerClassName: 'alloc-row-header',
                    getValue: (p) => p.displayName,
                    render: (p) => (
                      <Link style={{ color: 'var(--color-accent)' }} to={`/people/${p.id}`} onClick={(e) => e.stopPropagation()}>
                        {p.displayName}
                      </Link>
                    ),
                  },
                  ...filteredProjects.map((project, colIdx) => ({
                    key: `proj-${project.id}`,
                    title: (
                      <span title={project.name}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '110px' }}>
                          {project.projectCode}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '110px' }}>
                          {project.name}
                        </div>
                      </span>
                    ),
                    align: 'center' as const,
                    cellStyle: { padding: '4px', minWidth: '80px', maxWidth: '120px' },
                    render: (p: WorkloadPerson, rowIdx: number) => {
                      const alloc = p.allocations.find((a) => a.projectId === project.id);
                      const pct = alloc?.allocationPercent ?? 0;
                      const cellKey = `${rowIdx}-${colIdx}`;
                      const isFocused = focusedCell === cellKey;
                      return (
                        <div
                          ref={(el) => { cellRefs.current[cellKey] = el; }}
                          className={allocClass(pct)}
                          tabIndex={isFocused ? 0 : -1}
                          onFocus={() => setFocusedCell(cellKey)}
                          onClick={() => handleCellClick(p, project, pct)}
                          role="gridcell"
                        >
                          {pct === 0 ? '—' : `${pct}%`}
                        </div>
                      );
                    },
                  })),
                  {
                    key: 'total',
                    title: 'Total',
                    align: 'center',
                    cellStyle: {
                      position: 'sticky',
                      right: 0,
                      background: 'var(--color-surface)',
                      zIndex: 1,
                      minWidth: '70px',
                    },
                    render: (p) => {
                      const total = p.allocations.reduce((sum, a) => sum + a.allocationPercent, 0);
                      return (
                        <div className={allocClass(total)}>
                          {total === 0 ? '—' : total > 100 ? `⚠ ${total}%` : `${total}%`}
                        </div>
                      );
                    },
                  },
                ] as Column<WorkloadPerson>[]}
                rows={filteredPeople}
                getRowKey={(p) => p.id}
                footer={
                  <div style={{ display: 'grid', gridTemplateColumns: `auto repeat(${filteredProjects.length}, minmax(80px, 1fr)) 70px`, padding: '6px 12px', background: 'var(--color-surface-alt)', fontWeight: 700, fontSize: '0.8rem', borderTop: '2px solid var(--color-border)' }}>
                    <span>FTE Total</span>
                    {filteredProjects.map((project) => {
                      const total = filteredPeople.reduce((sum, person) => {
                        const alloc = person.allocations.find((a) => a.projectId === project.id);
                        return sum + (alloc?.allocationPercent ?? 0) / 100;
                      }, 0);
                      return (
                        <span key={project.id} style={{ textAlign: 'center', fontWeight: 600 }}>
                          {total === 0 ? '—' : total.toFixed(2)}
                        </span>
                      );
                    })}
                    <span />
                  </div>
                }
              />
            </div>

            {/* Drill-down side panel (A3) */}
            {panel && (
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'transparent' }}
                onClick={() => setPanel(null)}
              />
            )}
            <div className={'alloc-panel' + (panel ? ' open' : '')}>
              {panel && (
                <>
                  <div className="alloc-panel__header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2, 8px)' }}>
                      <div className="alloc-panel__avatar">{panel.personName[0].toUpperCase()}</div>
                      <strong>{panel.personName}</strong>
                    </div>
                    <IconButton
                      onClick={() => setPanel(null)}
                      aria-label="Close"
                      size="sm"
                      style={{ fontSize: '18px', color: 'var(--color-text-secondary)' }}
                    >
                      {'\u2715'}
                    </IconButton>
                  </div>
                  <div className="alloc-panel__stat">
                    <span className="alloc-panel__stat-value" style={{ color: allocColor(panel.allocationPercent) }}>{panel.allocationPercent}%</span>
                    <span className="alloc-panel__stat-label">Allocation</span>
                  </div>
                  <div className="alloc-panel__stat">
                    <span className="alloc-panel__stat-value" style={{ fontSize: 16 }}>{panel.projectName}</span>
                    <span className="alloc-panel__stat-label">Project</span>
                  </div>
                  <div className="alloc-panel__links">
                    <a href={'/assignments?personId=' + panel.personId}>View all assignments \u2192</a>
                    <a href={'/projects/' + panel.projectId}>View project \u2192</a>
                  </div>
                  <Button variant="secondary" onClick={() => setPanel(null)} style={{ marginTop: 'var(--space-5, 20px)', width: '100%' }} type="button">
                    Close
                  </Button>
                </>
              )}
            </div>
          </>
        )
      ) : null}
    </PageContainer>
  );
}
