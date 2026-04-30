import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

import { InteractiveOrgChart } from '@/components/org/InteractiveOrgChart';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { useOrgChart, OrgViewMode } from '@/features/org-chart/useOrgChart';
import { Button } from '@/components/ds';

export function OrgPage(): JSX.Element {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<OrgViewMode>('people');
  const state = useOrgChart(search);

  const dottedLines = (state.data?.dottedLineRelationships ?? []).flatMap((rel) =>
    rel.managers.map((mgr) => ({ from: mgr.id, to: rel.person.id })),
  );

  const hasData = viewMode === 'people'
    ? state.filteredPeople.length > 0
    : state.visibleRoots.length > 0;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Organization"
        subtitle={viewMode === 'people'
          ? 'People-centric org chart showing reporting lines, allocations, and assignments.'
          : 'Interactive organizational hierarchy with zoom, pan, and search.'}
        title="Org Chart"
      />

      {/* Toolbar: search + view toggle + refresh */}
      <div className="org-chart-toolbar" style={{ marginBottom: 0, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2, 8px)' }}>
          <input
            className="field__control"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search org units, people..."
            style={{ maxWidth: 280 }}
            type="search"
            value={search}
          />

          {/* View toggle */}
          <div className="org-view-toggle">
            <Button
              variant={viewMode === 'people' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setViewMode('people')}
              type="button"
            >
              People
            </Button>
            <Button
              variant={viewMode === 'departments' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setViewMode('departments')}
              type="button"
            >
              Departments
            </Button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2, 8px)', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
          {state.lastUpdated && (
            <span title={state.lastUpdated.toLocaleString()}>
              Updated {formatDistanceToNow(state.lastUpdated, { addSuffix: true })}
            </span>
          )}
          <Button variant="secondary" size="sm" disabled={state.isLoading} onClick={state.refetch} title="Refresh org chart data" type="button">
            {state.isLoading ? 'Loading...' : '\u21BB Refresh'}
          </Button>
        </div>
      </div>

      {state.isLoading ? <LoadingState label="Loading org chart..." variant="skeleton" skeletonType="chart" /> : null}
      {state.error ? <ErrorState description={state.error} /> : null}

      {!state.isLoading && !state.error ? (
        !hasData ? (
          <EmptyState
            description={viewMode === 'people'
              ? 'No people matched the current search.'
              : 'No org chart nodes matched the current search.'}
            title="No org chart results"
          />
        ) : (
          <div className="org-chart-viewport">
            <InteractiveOrgChart
              allPeople={state.people}
              dottedLines={dottedLines}
              people={state.filteredPeople}
              roots={state.visibleRoots}
              searchTerm={search}
              viewMode={viewMode}
            />
          </div>
        )
      ) : null}
    </PageContainer>
  );
}
