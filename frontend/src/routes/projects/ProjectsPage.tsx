import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { PROJECT_CREATE_ROLES, hasAnyRole } from '@/app/route-manifest';
import { useTitleBarActions } from '@/app/title-bar-context';
import { DataView, type Column } from '@/components/ds';
import { EmptyState } from '@/components/common/EmptyState';
import { exportToXlsx } from '@/lib/export';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { ListLayout } from '@/components/layout/ListLayout';
import { ProjectHealthBadge } from '@/components/common/ProjectHealthBadge';
import { StatusBadge } from '@/components/common/StatusBadge';
import { TipBalloon, TipTrigger } from '@/components/common/TipBalloon';
import { CopyLinkButton } from '@/components/common/CopyLinkButton';
import { useFilterParams } from '@/hooks/useFilterParams';
import { humanizeEnum, PROJECT_STATUS_LABELS } from '@/lib/labels';
import { fetchProjectHealthBatch, ProjectHealthDto } from '@/lib/api/project-health';
import { useProjectRegistry } from '@/features/projects/useProjectRegistry';
import { ProjectDirectoryItem } from '@/lib/api/project-registry';
import { Button } from '@/components/ds';
import { isFeatureEnabled } from '@/lib/feature-flags';

const NUM = { fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const };

// V2 Scope §4 item 4 — Law-9 drilldown params from /dashboards/director (finance band).
// `status`, `cpiBelow`, `budgetStatus`, `hasOpenGaps`, `closingInDays`, `view` arrive
// as URL search params; we parse them into filter state so back/forward + share-link
// behave consistently with all other list pages.
const FILTER_DEFAULTS = {
  search: '',
  source: '',
  sort: '',
  engagement: '',
  priority: '',
  status: '',
  cpiBelow: '',
  budgetStatus: '',
  hasOpenGaps: '',
  closingInDays: '',
  view: '',
};

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

  // V2 Scope §4 item 4 — dsRefresh gate. OFF path keeps the legacy filter
  // semantics (engagement + priority client-filter only). ON path also parses
  // Law-9 drilldown params (status / cpiBelow / budgetStatus / hasOpenGaps /
  // closingInDays / view) so links from the Director finance band land on a
  // pre-filtered registry view. Backend-side ProjectDirectoryItem does not yet
  // carry cpi / budgetStatus / openGaps / plannedEndDate — those filters are
  // wired through but no-op until the BE schema sweep (PR issue 459) lands the
  // server-side fields. Status filter is fully effective today.
  const dsRefreshEnabled = isFeatureEnabled('dsRefresh');

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
      {/* F-4.3 — filter by external source (Jira PPM, M365, etc.). The
          underlying URL param + BE filter were already wired; this
          dropdown surfaces the option in the title bar. */}
      <select
        aria-label="Filter by external source"
        data-jtbd="Which projects come from Jira / external systems?"
        onChange={(e) => setFilters({ source: e.target.value })}
        value={filters.source}
        style={{ fontSize: 12, padding: '4px 8px', height: 28 }}
      >
        <option value="">All sources</option>
        <option value="JIRA">Jira PPM</option>
        <option value="M365">M365</option>
        <option value="RADIUS">Radius</option>
      </select>
      {hasItems ? (
        <Button
          variant="secondary"
          size="sm"
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
        </Button>
      ) : null}
      {canCreateProject ? (
        <Button as={Link} variant="primary" size="sm" to="/projects/new">Create project</Button>
      ) : null}
      <CopyLinkButton />
      <TipTrigger />
    </>
  ), [filters.search, filters.engagement, filters.priority, hasItems, state.isLoading, state.visibleItems, healthMap, canCreateProject, setFilters]);

  useEffect(() => {
    setActions(titleBarContent);
    return () => setActions(null);
  }, [setActions, titleBarContent]);

  // Sprint F-0.8 (B-14 / D-88) — batch fetch replaces N parallel requests.
  // Phase 4 walker measured 30+ separate /:id/health calls on a default
  // /projects load; one batch call replaces the whole burst.
  useEffect(() => {
    if (state.visibleItems.length === 0) return;
    let active = true;
    void fetchProjectHealthBatch(state.visibleItems.map((item) => item.id)).then((map) => {
      if (!active) return;
      setHealthMap(map);
    });
    return () => {
      active = false;
    };
  }, [state.visibleItems]);

  const filteredItems = state.visibleItems.filter((item) => {
    if (filters.engagement && item.engagementModel !== filters.engagement) return false;
    if (filters.priority && item.priority !== filters.priority) return false;
    if (dsRefreshEnabled) {
      // V2 Scope §4 item 4 — Law-9 drilldown filters from /dashboards/director
      // finance band. `status` is fully effective today; `cpiBelow`,
      // `budgetStatus`, `hasOpenGaps`, `closingInDays` are wired through but
      // remain no-ops until ProjectDirectoryItem carries cpi / budgetStatus /
      // openPositionsCount / plannedEndDate (BE PR issue 459 sweep).
      if (filters.status && item.status !== filters.status) return false;
      const rec = item as ProjectDirectoryItem & {
        cpi?: number | null;
        budgetStatus?: 'over' | 'under' | 'on' | null;
        openPositionsCount?: number | null;
        plannedEndDate?: string | null;
      };
      if (filters.cpiBelow) {
        const threshold = Number(filters.cpiBelow);
        if (Number.isFinite(threshold) && rec.cpi != null && rec.cpi >= threshold) return false;
      }
      if (filters.budgetStatus && rec.budgetStatus != null && rec.budgetStatus !== filters.budgetStatus) {
        return false;
      }
      if (filters.hasOpenGaps === 'true' && rec.openPositionsCount != null && rec.openPositionsCount <= 0) {
        return false;
      }
      if (filters.closingInDays) {
        const days = Number(filters.closingInDays);
        if (Number.isFinite(days) && rec.plannedEndDate) {
          const end = new Date(rec.plannedEndDate).getTime();
          const horizon = Date.now() + days * 24 * 60 * 60 * 1000;
          if (Number.isFinite(end) && end > horizon) return false;
        }
      }
    }
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

  const columns = useMemo<Column<ProjectDirectoryItem>[]>(() => [
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
        <Button
          variant="link"
          size="sm"
          onClick={handleHealthSortToggle}
          type="button"
        >
          Health {sortByHealth === 'desc' ? '\u25BC' : sortByHealth === 'asc' ? '\u25B2' : '\u2195'}
        </Button>
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

  const banners = (
    <>
      {state.isLoading ? <LoadingState variant="skeleton" skeletonType="table" /> : null}
      {state.error ? <ErrorState description={state.error} /> : null}
    </>
  );

  return (
    <ListLayout testId="project-registry-page" viewport banners={banners}>
      {!state.isLoading && !state.error ? (
        <DataView
          caption="Project registry"
          columns={columns}
          getRowKey={(item) => item.id}
          rows={sortedItems}
          onRowClick={(item) => navigate(`/projects/${item.id}`)}
          variant="compact"
          pageSizeOptions={[1000]}
          emptyState={
            <EmptyState
              action={{ href: '/projects/new', label: 'Create Project' }}
              description="The internal project registry has no matching projects for the current filters."
              title="No projects yet"
            />
          }
        />
      ) : null}
    </ListLayout>
  );
}
