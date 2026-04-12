import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

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

function getCellColour(percent: number): string {
  if (percent === 0) return 'transparent';
  if (percent < 50) return '#bfdbfe';
  if (percent < 80) return '#3b82f6';
  if (percent <= 100) return '#22c55e';
  return '#ef4444';
}

function getCellTextColour(percent: number): string {
  if (percent === 0) return '#9ca3af';
  if (percent < 50) return '#1e40af';
  return '#fff';
}

function AllocationCell({
  allocationPercent,
  personId,
  projectId,
}: {
  allocationPercent: number;
  personId: string;
  projectId: string;
}): JSX.Element {
  const bg = getCellColour(allocationPercent);
  const color = getCellTextColour(allocationPercent);

  if (allocationPercent === 0) {
    return (
      <td
        style={{
          background: '#f9fafb',
          color: '#9ca3af',
          textAlign: 'center',
          padding: '6px',
          fontSize: '0.8rem',
        }}
      >
        —
      </td>
    );
  }

  return (
    <td style={{ padding: '4px', textAlign: 'center' }}>
      <Link
        style={{
          display: 'inline-block',
          background: bg,
          color,
          borderRadius: '4px',
          padding: '3px 8px',
          fontSize: '0.8rem',
          fontWeight: 600,
          textDecoration: 'none',
          minWidth: '48px',
        }}
        to={`/assignments?personId=${personId}&projectId=${projectId}`}
      >
        {allocationPercent}%
      </Link>
    </td>
  );
}

export function WorkloadMatrixPage(): JSX.Element {
  const [matrix, setMatrix] = useState<WorkloadMatrixResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pools, setPools] = useState<ResourcePool[]>([]);
  const [orgUnits, setOrgUnits] = useState<Array<{ id: string; name: string }>>([]);
  const [managers, setManagers] = useState<Array<{ id: string; displayName: string }>>([]);

  const [poolId, setPoolId] = useState('');
  const [orgUnitId, setOrgUnitId] = useState('');
  const [managerId, setManagerId] = useState('');

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

  function handleExport(): void {
    if (!matrix) return;
    const rows = matrix.people.map((person) => {
      const row: Record<string, unknown> = { Person: person.displayName };
      for (const project of matrix.projects) {
        const alloc = person.allocations.find((a) => a.projectId === project.id);
        row[project.name] = alloc ? `${alloc.allocationPercent}%` : '—';
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

        <label className="field">
          <span className="field__label">Org Unit</span>
          <select
            className="field__control"
            onChange={(e) => setOrgUnitId(e.target.value)}
            value={orgUnitId}
          >
            <option value="">All org units</option>
            {orgUnits.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Manager</span>
          <select
            className="field__control"
            onChange={(e) => setManagerId(e.target.value)}
            value={managerId}
          >
            <option value="">All managers</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>{m.displayName}</option>
            ))}
          </select>
        </label>

        <button
          className="button button--secondary"
          onClick={handleExport}
          style={{ alignSelf: 'flex-end' }}
          type="button"
        >
          Export XLSX
        </button>
      </FilterBar>

      {isLoading ? <LoadingState label="Loading workload matrix..." /> : null}
      {error ? <ErrorState description={error} /> : null}

      {!isLoading && !error && matrix ? (
        matrix.projects.length === 0 || matrix.people.length === 0 ? (
          <EmptyState
            description="No active assignments found for the current filters."
            title="No workload data"
          />
        ) : (
          <>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.75rem', fontSize: '0.8rem', color: '#374151' }}>
              <span style={{ fontWeight: 600 }}>Legend:</span>
              {[
                { color: '#bfdbfe', textColor: '#1e40af', label: '< 50% (under)' },
                { color: '#3b82f6', textColor: '#fff', label: '50–79% (normal)' },
                { color: '#22c55e', textColor: '#fff', label: '80–100% (full)' },
                { color: '#ef4444', textColor: '#fff', label: '> 100% (over)' },
              ].map(({ color, textColor, label }) => (
                <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ display: 'inline-block', width: '14px', height: '14px', borderRadius: '3px', background: color, border: '1px solid #e5e7eb' }} />
                  <span style={{ color: '#374151' }}>{label}</span>
                </span>
              ))}
            </div>
          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table
              style={{
                borderCollapse: 'collapse',
                width: '100%',
                fontSize: '0.85rem',
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
                  {matrix.projects.map((project) => (
                    <th
                      key={project.id}
                      style={{
                        padding: '8px',
                        textAlign: 'center',
                        borderBottom: '2px solid #e5e7eb',
                        minWidth: '80px',
                        maxWidth: '120px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={project.name}
                    >
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '110px' }}>
                        {project.projectCode}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '110px' }}>
                        {project.name}
                      </div>
                    </th>
                  ))}
                  <th
                    style={{
                      padding: '8px',
                      textAlign: 'center',
                      borderBottom: '2px solid #e5e7eb',
                      minWidth: '70px',
                      fontWeight: 700,
                    }}
                  >
                    Total
                  </th>
                </tr>
              </thead>

              <tbody>
                {matrix.people.map((person) => {
                  const total = person.allocations.reduce((sum, a) => sum + a.allocationPercent, 0);
                  return (
                    <tr
                      key={person.id}
                      style={{ borderBottom: '1px solid #e5e7eb' }}
                    >
                      <td
                        style={{
                          position: 'sticky',
                          left: 0,
                          background: 'white',
                          zIndex: 1,
                          padding: '6px 12px',
                          fontWeight: 500,
                        }}
                      >
                        <Link style={{ color: '#2563eb' }} to={`/people/${person.id}`}>
                          {person.displayName}
                        </Link>
                      </td>
                      {matrix.projects.map((project) => {
                        const alloc = person.allocations.find((a) => a.projectId === project.id);
                        const pct = alloc?.allocationPercent ?? 0;
                        return (
                          <AllocationCell
                            allocationPercent={pct}
                            key={project.id}
                            personId={person.id}
                            projectId={project.id}
                          />
                        );
                      })}
                      <td
                        style={{
                          textAlign: 'center',
                          padding: '4px',
                          fontWeight: 700,
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-block',
                            background: getCellColour(total),
                            color: getCellTextColour(total),
                            borderRadius: '4px',
                            padding: '3px 8px',
                            fontSize: '0.8rem',
                            minWidth: '48px',
                          }}
                        >
                          {total === 0 ? '—' : `${total}%`}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {/* Column totals row */}
                <tr style={{ borderTop: '2px solid #e5e7eb', background: '#f9fafb' }}>
                  <td
                    style={{
                      position: 'sticky',
                      left: 0,
                      background: '#f9fafb',
                      zIndex: 1,
                      padding: '6px 12px',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                    }}
                  >
                    FTE Total
                  </td>
                  {matrix.projects.map((project) => {
                    const total = matrix.people.reduce((sum, person) => {
                      const alloc = person.allocations.find((a) => a.projectId === project.id);
                      return sum + (alloc?.allocationPercent ?? 0) / 100;
                    }, 0);
                    return (
                      <td
                        key={project.id}
                        style={{
                          textAlign: 'center',
                          padding: '4px',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          color: '#374151',
                        }}
                      >
                        {total === 0 ? '—' : total.toFixed(2)}
                      </td>
                    );
                  })}
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
          </>
        )
      ) : null}
    </PageContainer>
  );
}
