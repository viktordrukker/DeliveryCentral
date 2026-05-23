import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge, type StatusTone } from '@/components/common/StatusBadge';
import { Table, type Column } from '@/components/ds';
import {
  type ProjectPosition,
  type PositionFillStatus,
  listProjectPositions,
} from '@/lib/api/project-positions';

/**
 * Sprint 2 / S2-8 — minimal read-only list of ProjectPositions for one project.
 *
 * This is the FE skeleton — Sprint 1 DS regeneration (Claude Design) will
 * replace the visual fill. The data contracts + URL stay.
 *
 * URL: `/projects/:projectId/positions`
 */

const STATUS_TONE: Record<PositionFillStatus, StatusTone> = {
  DRAFT: 'neutral',
  OPEN: 'info',
  PROPOSED: 'pending',
  BOOKED: 'pending',
  ONBOARDING: 'pending',
  ASSIGNED: 'active',
  ON_HOLD: 'warning',
  RELEASED: 'neutral',
};

const NUM: React.CSSProperties = { textAlign: 'right', fontVariantNumeric: 'tabular-nums' };

const positionsColumns: Array<Column<ProjectPosition>> = [
  { key: 'role', title: 'Role', render: (p) => p.role },
  {
    key: 'status',
    title: 'Status',
    render: (p) => <StatusBadge tone={STATUS_TONE[p.fillStatus]} label={p.fillStatus} />,
  },
  {
    key: 'required',
    title: 'Required %',
    align: 'right',
    render: (p) => <span style={NUM}>{p.requiredAllocationPercent}%</span>,
  },
  {
    key: 'active-person',
    title: 'Active person',
    render: (p) => p.activePersonId ?? '—',
  },
  {
    key: 'active-alloc',
    title: 'Active %',
    align: 'right',
    render: (p) => (
      <span style={NUM}>
        {p.activeAllocationPercent !== undefined ? `${p.activeAllocationPercent}%` : '—'}
      </span>
    ),
  },
];

export function PositionsListPage(): JSX.Element {
  const { projectId } = useParams<{ projectId: string }>();
  const [positions, setPositions] = useState<ProjectPosition[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setError('No projectId in route.');
      setIsLoading(false);
      return;
    }
    let active = true;
    setIsLoading(true);
    setError(null);
    listProjectPositions({ projectId, take: 100 })
      .then((response) => {
        if (!active) return;
        setPositions(response.positions);
        setTotal(response.total);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load positions.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [projectId]);

  return (
    <PageContainer testId="positions-list-page">
      <SectionCard
        title={`Project positions${total > 0 ? ` (${total})` : ''}`}
      >
        {isLoading && <LoadingState />}
        {error && <ErrorState description={error} />}
        {!isLoading && !error && positions.length === 0 && (
          <EmptyState
            title="No positions yet"
            description="This project has no positions. Add one to start staffing."
          />
        )}
        {!isLoading && !error && positions.length > 0 && (
          <Table<ProjectPosition>
            variant="compact"
            getRowKey={(p) => p.id}
            rows={positions}
            columns={positionsColumns}
          />
        )}
      </SectionCard>
    </PageContainer>
  );
}
