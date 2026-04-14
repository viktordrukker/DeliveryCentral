import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { useTitleBarActions } from '@/app/title-bar-context';
import { EmptyState } from '@/components/common/EmptyState';
import { exportToXlsx } from '@/lib/export';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { ProjectHealthBadge } from '@/components/common/ProjectHealthBadge';
import { TipBalloon, TipTrigger } from '@/components/common/TipBalloon';
import { useFilterParams } from '@/hooks/useFilterParams';
import { humanizeEnum, PROJECT_STATUS_LABELS } from '@/lib/labels';
import { fetchProjectHealth, ProjectHealthDto } from '@/lib/api/project-health';
import { useProjectRegistry } from '@/features/projects/useProjectRegistry';

const NUM = { fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const };
const PROJECT_CREATE_ROLES = ['project_manager', 'delivery_manager', 'director', 'admin'];

export function ProjectsPage(): JSX.Element {
  const navigate = useNavigate();
  const { principal } = useAuth();
  const [filters, setFilters] = useFilterParams({ search: '', source: '' });
  const [healthMap, setHealthMap] = useState<Map<string, ProjectHealthDto>>(new Map());
  const [sortByHealth, setSortByHealth] = useState<'asc' | 'desc' | null>(null);
  const state = useProjectRegistry({
    search: filters.search,
    source: filters.source || undefined,
  });

  const canCreateProject = principal?.roles.some((r) => PROJECT_CREATE_ROLES.includes(r)) ?? false;
  const { setActions } = useTitleBarActions();

  // Title bar actions
  useEffect(() => {
    setActions(
      <>
        <input
          onChange={(event) => setFilters({ search: event.target.value })}
          placeholder="Search projects..."
          type="search"
          value={filters.search}
          style={{ fontSize: 12, padding: '4px 8px', height: 28, minWidth: 140 }}
        />
        <input
          onChange={(event) => setFilters({ source: event.target.value })}
          placeholder="External system..."
          type="text"
          value={filters.source}
          style={{ fontSize: 12, padding: '4px 8px', height: 28, minWidth: 100 }}
        />
        {state.visibleItems.length > 0 ? (
          <button
            className="button button--secondary button--sm"
            disabled={state.isLoading}
            onClick={() => {
              exportToXlsx(
                state.visibleItems.map((p) => ({
                  'Assignment Count': p.assignmentCount,
                  'Health Score': healthMap.get(p.id)?.score ?? '',
                  Name: p.name,
                  'Project Code': p.projectCode,
                  Status: p.status,
                })),
                'projects',
              );
            }}
            type="button"
          >
            Export XLSX
          </button>
        ) : null}
        {canCreateProject ? (
          <Link className="button button--sm" to="/projects/new">Create project</Link>
        ) : null}
        <TipTrigger />
      </>
    );
    return () => setActions(null);
  }, [setActions, filters.search, filters.source, state.visibleItems, state.isLoading, healthMap, canCreateProject, setFilters]);

  // Fetch health for visible items
  useEffect(() => {
    if (state.visibleItems.length === 0) return;
    let active = true;
    void Promise.allSettled(
      state.visibleItems.map((item) =>
        fetchProjectHealth(item.id).then((h) => ({ health: h, id: item.id })),
      ),
    ).then((results) => {
      if (!active) return;
      const next = new Map<string, ProjectHealthDto>();
      for (const result of results) {
        if (result.status === 'fulfilled') next.set(result.value.id, result.value.health);
      }
      setHealthMap(next);
    });
    return () => { active = false; };
  }, [state.visibleItems]);

  const sortedItems = sortByHealth
    ? [...state.visibleItems].sort((a, b) => {
        const aScore = healthMap.get(a.id)?.score ?? 0;
        const bScore = healthMap.get(b.id)?.score ?? 0;
        return sortByHealth === 'asc' ? aScore - bScore : bScore - aScore;
      })
    : state.visibleItems;

  function handleHealthSortToggle(): void {
    setSortByHealth((prev) => prev === null ? 'desc' : prev === 'desc' ? 'asc' : null);
  }

  return (
    <PageContainer testId="project-registry-page" viewport>
      {state.isLoading ? <LoadingState variant="skeleton" skeletonType="table" /> : null}
      {state.error ? <ErrorState description={state.error} /> : null}

      {!state.isLoading && !state.error ? (
        sortedItems.length === 0 ? (
          <EmptyState
            action={{ href: '/projects/new', label: 'Create Project' }}
            description="The internal project registry has no matching projects for the current filters."
            title="No projects yet"
          />
        ) : (
          <div style={{ flex: 1, overflow: 'auto' }}>
            <table className="dash-compact-table" style={{ minWidth: 700 }}>
              <thead>
                <tr>
                  <th>
                    Project Name
                    <TipBalloon tip="Click a row to view full project details and health breakdown." arrow="bottom" />
                  </th>
                  <th style={{ width: 90 }}>Code</th>
                  <th style={{ width: 80 }}>Status</th>
                  <th>
                    External Links
                    <TipBalloon tip="Shows linked systems like JIRA; filter by external system in the title bar." arrow="bottom" />
                  </th>
                  <th style={NUM}>Assign</th>
                  <th style={{ width: 80 }}>
                    <button
                      onClick={handleHealthSortToggle}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'inherit', padding: 0, color: 'inherit', fontSize: 'inherit' }}
                      type="button"
                    >
                      Health {sortByHealth === 'desc' ? '\u25BC' : sortByHealth === 'asc' ? '\u25B2' : '\u2195'}
                    </button>
                  </th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item) => {
                  const health = healthMap.get(item.id) ?? null;
                  return (
                    <tr key={item.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/projects/${item.id}`)}>
                      <td style={{ fontWeight: 500 }}>{item.name}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: 11, color: 'var(--color-text-muted)' }}>{item.projectCode}</td>
                      <td><span style={{ fontSize: 11, fontWeight: 600 }}>{humanizeEnum(item.status, PROJECT_STATUS_LABELS)}</span></td>
                      <td style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                        {item.externalLinksCount > 0
                          ? item.externalLinksSummary.map((link) => `${link.provider} (${link.count})`).join(', ')
                          : '\u2014'}
                      </td>
                      <td style={NUM}>{item.assignmentCount}</td>
                      <td>
                        {health ? (
                          <ProjectHealthBadge grade={health.grade} score={health.score} size="sm" />
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{'\u2014'}</span>
                        )}
                      </td>
                      <td>
                        <Link to={`/projects/${item.id}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: 10, color: 'var(--color-accent)' }}>Go</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : null}
    </PageContainer>
  );
}
