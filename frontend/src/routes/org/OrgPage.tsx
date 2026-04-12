import { useState } from 'react';

import { InteractiveOrgChart } from '@/components/org/InteractiveOrgChart';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { useOrgChart } from '@/features/org-chart/useOrgChart';

export function OrgPage(): JSX.Element {
  const [search, setSearch] = useState('');
  const state = useOrgChart(search);

  const dottedLines = (state.data?.dottedLineRelationships ?? []).flatMap((rel) =>
    rel.managers.map((mgr) => ({ from: mgr.id, to: rel.person.id })),
  );

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Organization"
        subtitle="Interactive organizational hierarchy with zoom, pan, and search."
        title="Org Chart"
      />

      {/* Compact toolbar */}
      <div className="org-chart-toolbar" style={{ marginBottom: 0 }}>
        <input
          className="field__control"
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search org units, people..."
          style={{ maxWidth: 280 }}
          type="search"
          value={search}
        />
      </div>

      {state.isLoading ? <LoadingState label="Loading org chart..." /> : null}
      {state.error ? <ErrorState description={state.error} /> : null}

      {!state.isLoading && !state.error ? (
        state.visibleRoots.length === 0 ? (
          <EmptyState
            description="No org chart nodes matched the current search."
            title="No org chart results"
          />
        ) : (
          <div className="org-chart-viewport">
            <InteractiveOrgChart
              dottedLines={dottedLines}
              roots={state.visibleRoots}
              searchTerm={search}
            />
          </div>
        )
      ) : null}
    </PageContainer>
  );
}
