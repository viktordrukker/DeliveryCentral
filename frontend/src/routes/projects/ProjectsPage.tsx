import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { EmptyState } from '@/components/common/EmptyState';
import { exportToXlsx } from '@/lib/export';
import { ErrorState } from '@/components/common/ErrorState';
import { FilterBar } from '@/components/common/FilterBar';
import { TableSkeleton } from '@/components/common/Skeleton';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { ProjectHealthBadge } from '@/components/common/ProjectHealthBadge';
import { ViewportTable } from '@/components/layout/ViewportTable';
import { ProjectDirectoryItem } from '@/lib/api/project-registry';
import { humanizeEnum, PROJECT_STATUS_LABELS } from '@/lib/labels';
import { fetchProjectHealth, ProjectHealthDto } from '@/lib/api/project-health';
import { useProjectRegistry } from '@/features/projects/useProjectRegistry';

const PROJECT_CREATE_ROLES = ['project_manager', 'delivery_manager', 'director', 'admin'];

export function ProjectsPage(): JSX.Element {
  const navigate = useNavigate();
  const { principal } = useAuth();
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('');
  const [healthMap, setHealthMap] = useState<Map<string, ProjectHealthDto>>(new Map());
  const [sortByHealth, setSortByHealth] = useState<'asc' | 'desc' | null>(null);
  const state = useProjectRegistry({
    search,
    source: source || undefined,
  });

  const canCreateProject = principal?.roles.some((r) => PROJECT_CREATE_ROLES.includes(r)) ?? false;

  // Fetch health for all visible items
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
        if (result.status === 'fulfilled') {
          next.set(result.value.id, result.value.health);
        }
      }
      setHealthMap(next);
    });

    return () => {
      active = false;
    };
  }, [state.visibleItems]);

  const sortedItems = sortByHealth
    ? [...state.visibleItems].sort((a, b) => {
        const aScore = healthMap.get(a.id)?.score ?? 0;
        const bScore = healthMap.get(b.id)?.score ?? 0;
        return sortByHealth === 'asc' ? aScore - bScore : bScore - aScore;
      })
    : state.visibleItems;

  function handleHealthSortToggle(): void {
    setSortByHealth((prev) => {
      if (prev === null) return 'desc';
      if (prev === 'desc') return 'asc';
      return null;
    });
  }

  return (
    <PageContainer testId="project-registry-page" viewport>
      <PageHeader
        actions={
          <>
            {state.visibleItems.length > 0 ? (
              <button
                className="button button--secondary"
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
              <Link className="button" to="/projects/new">
                Create project
              </Link>
            ) : null}
          </>
        }
        eyebrow="Project Registry"
        subtitle="Browse internal projects first, with external links shown as attached integration context."
        title="Projects"
      />

      <FilterBar>
        <label className="field">
          <span className="field__label">Search</span>
          <input
            className="field__control"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by project name, code, or status"
            type="search"
            value={search}
          />
        </label>
        <label className="field">
          <span className="field__label">Linked External System</span>
          <input
            className="field__control"
            onChange={(event) => setSource(event.target.value)}
            placeholder="Example: JIRA"
            type="text"
            value={source}
          />
        </label>
      </FilterBar>

      <ViewportTable>
        {state.isLoading ? <TableSkeleton cols={5} rows={6} /> : null}
        {state.error ? <ErrorState description={state.error} /> : null}

        {!state.isLoading && !state.error ? (
          sortedItems.length === 0 ? (
            <EmptyState
              action={{ href: '/projects/new', label: 'Create Project' }}
              description="The internal project registry has no matching projects for the current filters."
              title="No projects yet"
            />
          ) : (
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Project Name</th>
                    <th>Project Code</th>
                    <th>Status</th>
                    <th>External Links</th>
                    <th>Assignments</th>
                    <th>
                      <button
                        className="sort-header-btn"
                        onClick={handleHealthSortToggle}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'inherit', padding: 0 }}
                        type="button"
                      >
                        Health{' '}
                        {sortByHealth === 'desc' ? '▼' : sortByHealth === 'asc' ? '▲' : '↕'}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((item) => (
                    <ProjectRow
                      health={healthMap.get(item.id) ?? null}
                      item={item}
                      key={item.id}
                      onRowClick={() => navigate(`/projects/${item.id}`)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}
      </ViewportTable>
    </PageContainer>
  );
}

interface ProjectRowProps {
  health: ProjectHealthDto | null;
  item: ProjectDirectoryItem;
  onRowClick: () => void;
}

function ProjectRow({ health, item, onRowClick }: ProjectRowProps): JSX.Element {
  return (
    <tr
      className="data-table__row data-table__row--interactive"
      onClick={onRowClick}
    >
      <td>{item.name}</td>
      <td>{item.projectCode}</td>
      <td>{humanizeEnum(item.status, PROJECT_STATUS_LABELS)}</td>
      <td>
        {item.externalLinksCount > 0
          ? item.externalLinksSummary.map((link) => `${link.provider} (${link.count})`).join(', ')
          : 'No external links'}
      </td>
      <td>{item.assignmentCount}</td>
      <td>
        {health ? (
          <ProjectHealthBadge grade={health.grade} score={health.score} size="sm" />
        ) : (
          <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>
        )}
      </td>
    </tr>
  );
}
