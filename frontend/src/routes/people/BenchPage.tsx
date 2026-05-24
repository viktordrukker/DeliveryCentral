import { useEffect, useState } from 'react';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Table, type Column } from '@/components/ds';
import { fetchPersonDirectory, type PersonDirectoryItem } from '@/lib/api/person-directory';
import { checkBench, type BenchPerson } from '@/lib/api/project-positions';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { BenchEnrichedPanel } from '@/components/people/BenchEnrichedPanel';

/**
 * Sprint 2 / S2-8 — read-only bench list.
 *
 * Bench is derived: a Person is on the bench iff they have zero active fills
 * on the as-of date. This page combines the Person directory with bench-check
 * results from the lean staffing aggregate.
 *
 * URL: `/people/bench`
 */

interface BenchRow {
  person: PersonDirectoryItem;
  bench: BenchPerson;
}

const NUM: React.CSSProperties = { textAlign: 'right', fontVariantNumeric: 'tabular-nums' };

const benchColumns: Array<Column<BenchRow>> = [
  { key: 'person', title: 'Person', render: (row) => row.person.displayName },
  {
    key: 'status',
    title: 'Status',
    render: (row) => (
      <StatusBadge
        tone={row.bench.isOnBench ? 'info' : 'active'}
        label={row.bench.isOnBench ? 'On bench' : 'Engaged'}
      />
    ),
  },
  {
    key: 'fills',
    title: 'Active fills',
    align: 'right',
    render: (row) => <span style={NUM}>{row.bench.activeFillCount}</span>,
  },
  {
    key: 'alloc',
    title: 'Total allocation %',
    align: 'right',
    render: (row) => <span style={NUM}>{row.bench.totalActiveAllocationPercent}%</span>,
  },
];

export function BenchPage(): JSX.Element {
  const [rows, setRows] = useState<BenchRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    (async () => {
      try {
        const peopleResult = await fetchPersonDirectory({ page: 1, pageSize: 500 });
        const people = peopleResult.items;
        if (people.length === 0) {
          if (active) {
            setRows([]);
          }
          return;
        }
        const benchResult = await checkBench(people.map((p) => p.id));
        if (!active) return;
        const benchById = new Map(benchResult.people.map((b) => [b.personId, b]));
        const combined: BenchRow[] = people
          .map((person) => ({ person, bench: benchById.get(person.id) }))
          .filter((row): row is BenchRow => row.bench !== undefined);
        setRows(combined);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load bench.');
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const visible = showAll ? rows : rows.filter((r) => r.bench.isOnBench);

  if (isFeatureEnabled('dsRefresh')) {
    return (
      <PageContainer testId="bench-page">
        <BenchEnrichedPanel />
      </PageContainer>
    );
  }

  return (
    <PageContainer testId="bench-page">
      <SectionCard title={`Bench (${visible.length})`}>
        <label style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
          />
          Show all (including engaged)
        </label>
        {isLoading && <LoadingState />}
        {error && <ErrorState description={error} />}
        {!isLoading && !error && visible.length === 0 && (
          <EmptyState
            title={showAll ? 'No people found.' : 'Nobody on the bench.'}
            description={
              showAll
                ? 'The directory returned no people.'
                : 'Every person currently has at least one active position. Flip "Show all" to see the directory.'
            }
          />
        )}
        {!isLoading && !error && visible.length > 0 && (
          <Table<BenchRow>
            variant="compact"
            getRowKey={(row) => row.person.id}
            rows={visible}
            columns={benchColumns}
          />
        )}
      </SectionCard>
    </PageContainer>
  );
}
