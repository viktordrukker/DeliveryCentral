import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { PROJECT_CREATE_ROLES, hasAnyRole } from '@/app/route-manifest';
import { useTitleBarActions } from '@/app/title-bar-context';
import { DataTable, type DataTableColumn } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { exportToXlsx } from '@/lib/export';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { ProjectHealthBadge } from '@/components/common/ProjectHealthBadge';
import { StatusBadge } from '@/components/common/StatusBadge';
import { TipBalloon, TipTrigger } from '@/components/common/TipBalloon';
import { useFilterParams } from '@/hooks/useFilterParams';
import { humanizeEnum, PROJECT_STATUS_LABELS } from '@/lib/labels';
import { fetchProjectHealth, ProjectHealthDto } from '@/lib/api/project-health';
import { useProjectRegistry } from '@/features/projects/useProjectRegistry';
import { ProjectDirectoryItem } from '@/lib/api/project-registry';

const NUM = { fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const };
const FILTER_DEFAULTS = { search: '', source: '', sort: '', engagement: '', priority: '' };

export function ProjectsPage(): JSX.Element {
  const navigate = useNavigate();
  const { principal } = useAuth();
  const [filters, setFilters] = useFilterParams(FILTER_DEFAULTS);
  const [healthMap, setHealthMap] = useState<Map<string, ProjectHealthDto>>(new Map());
  const sortByHealth = (filters.sort === 'asc' || filters.sort === 'desc') ? filters.sort : null;
  const setSortByHealth = (v: 'asc' | 'desc' | null) => setFilters({ sort: v ?? '' });
  const state = useProjectRegistry({
    search: filters.search,
    source: filters.source || undefined,
  });

  const canCreateProject = hasAnyRole(principal?.roles, PROJECT_CREATE_ROLES);
  const { setActions } = useTitleBarActions();

  // Title bar actions — stabilized with useMemo (20d-04)
  const hasItems = state.visibleItems.length > 0;
  const titleBarContent = useMemo(() => (
    <>
      <input
        onChange={(event) => setFilters({ search: event.target.value })}
        placeholder="Search projects..."
        type="search"
        value={filters.search}
        style={{ fontSize: 12, padding: '4px 8px', height: 28, minWidth: 140 }}
      />
      <select
        onChange={(e) => setFilters({ engagement: e.target.value })}
        value={filters.engagement}
        style={{ fontSize: 12, padding: '4px 8px', height: 28 }}
      >
        <option value="">All models</option>
        <option value="TIME_AND_MATERIAL">T&M</option>
        <option value="FIXED_PRICE">Fixed Price</option>
        <option value="MANAGED_SERVICE">Managed Service</option>
        <option value="INTERNAL">Internal</option>
      </select>
      <select
        onChange={(e) => setFilters({ priority: e.target.value })}
        value={filters.priority}
        style={{ fontSize: 12, padding: '4px 8px', height: 28 }}
      >
        <option value="">All priorities</option>
        <option value="CRITICAL">Critical</option>
        <option value="HIGH">High</option>
        <option value="MEDIUM">Medium</option>
        <option value="LOW">Low</option>
      </select>
      {hasItems ? (
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
  ), [filters.search, filters.engagement, filters.priority, hasItems, state.isLoading, state.visibleItems, healthMap, canCreateProject, setFilters]);

  useEffect(() => {
    setActions(titleBarContent);
    return () => setActions(null);
  }, [setActions, titleBarContent]);

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

  const filteredItems = state.visibleItems.filter((item) => {
    if (filters.engagement && item.engagementModel !== filters.engagement) return false;
    if (filters.priority && item.priority !== filters.priority) return false;
    return true;
  });

  const sortedItems = sortByHealth
    ? [...filteredItems].sort((a, b) => {
        const aScore = healthMap.get(a.id)?.score ?? 0;
        const bScore = healthMap.get(b.id)?.score ?? 0;
        return sortByHealth === 'asc' ? aScore - bScore : bScore - aScore;
      })
    : filteredItems;

  function handleHealthSortToggle(): void {
    setSortByHealth(sortByHealth === null ? 'desc' : sortByHealth === 'desc' ? 'asc' : null);
  }

  const columns = useMemo<DataTableColumn<ProjectDirectoryItem>[]>(() => [
    {
      key: 'name',
      render: (item) => <span style={{ fontWeight: 500 }}>{item.name}</span>,
      title: (
        <>
          Project Name
          <TipBalloon tip="Click a row to view full project details and health breakdown." arrow="bottom" />
        </>
      ),
    },
    {
      key: 'projectCode',
      render: (item) => (
        <span style={{ color: 'var(--color-text-muted)', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>
          {item.projectCode}
        </span>
      ),
      title: 'Code',
      width: 90,
    },
    {
      key: 'status',
      render: (item) => (
        <StatusBadge
          label={humanizeEnum(item.status, PROJECT_STATUS_LABELS)}
          status={item.status}
          variant="dot"
        />
      ),
      title: 'Status',
      width: 100,
    },
    {
      key: 'priority',
      render: (item) => item.priority ? (
        <StatusBadge
          label={item.priority}
          status={item.priority === 'CRITICAL' ? 'danger' : item.priority === 'HIGH' ? 'warning' : item.priority === 'LOW' ? 'neutral' : 'info'}
          variant="dot"
        />
      ) : <span style={{ color: 'var(--color-text-muted)' }}>{'\u2014'}</span>,
      title: 'Priority',
      width: 85,
    },
    {
      key: 'client',
      render: (item) => <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{item.clientName || '\u2014'}</span>,
      title: 'Client',
      width: 120,
    },
    {
      key: 'externalLinks',
      render: (item) => (
        <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>
          {item.externalLinksCount > 0
            ? item.externalLinksSummary.map((link) => `${link.provider} (${link.count})`).join(', ')
            : '\u2014'}
        </span>
      ),
      title: (
        <>
          External Links
          <TipBalloon tip="Shows linked systems like JIRA; filter by external system in the title bar." arrow="bottom" />
        </>
      ),
    },
    {
      key: 'assignmentCount',
      align: 'right',
      render: (item) => item.assignmentCount,
      title: 'Assign',
      width: 70,
    },
    {
      key: 'health',
      render: (item) => {
        const health = healthMap.get(item.id) ?? null;
        return health ? (
          <ProjectHealthBadge grade={health.grade} score={health.score} size="sm" />
        ) : (
          <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{'\u2014'}</span>
        );
      },
      title: (
        <button
          className="data-table__sort-toggle"
          onClick={handleHealthSortToggle}
          type="button"
        >
          Health {sortByHealth === 'desc' ? '\u25BC' : sortByHealth === 'asc' ? '\u25B2' : '\u2195'}
        </button>
      ),
      width: 90,
    },
    {
      key: 'actions',
      render: (item) => (
        <Link
          onClick={(event) => event.stopPropagation()}
          style={{ color: 'var(--color-accent)', fontSize: 10 }}
          to={`/projects/${item.id}`}
        >
          Go
        </Link>
      ),
      title: '',
      width: 40,
    },
  ], [healthMap, sortByHealth]);

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
          <DataTable
            caption="Project registry"
            columns={columns}
            getRowKey={(item) => item.id}
            items={sortedItems}
            minWidth={700}
            onRowClick={(item) => navigate(`/projects/${item.id}`)}
            variant="compact"
          />
        )
      ) : null}
    </PageContainer>
  );
}
