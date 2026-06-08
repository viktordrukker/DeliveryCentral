import { useState } from 'react';
import { useParams } from 'react-router-dom';

import { ErrorState } from '@/components/common/ErrorState';
import { PageContainer } from '@/components/common/PageContainer';
import { SectionCard } from '@/components/common/SectionCard';
import { ProjectPositionsList } from '@/components/projects/ProjectPositionsList';

/**
 * Sprint 2 / S2-8 — minimal read-only list of ProjectPositions for one project.
 *
 * W4-05 — the data + UI shell is now extracted into
 * `ProjectPositionsList` so the same list can mount inside a Drawer
 * from the Project Detail header. This page keeps the standalone URL
 * `/projects/:projectId/positions` working for deep-links.
 */
export function PositionsListPage(): JSX.Element {
  const { projectId } = useParams<{ projectId: string }>();
  const [total, setTotal] = useState<number | null>(null);

  if (!projectId) {
    return (
      <PageContainer testId="positions-list-page">
        <SectionCard title="Project positions">
          <ErrorState description="No projectId in route." />
        </SectionCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer testId="positions-list-page">
      <SectionCard
        title={`Project positions${total !== null && total > 0 ? ` (${total})` : ''}`}
      >
        <ProjectPositionsList projectId={projectId} onTotalChange={setTotal} />
      </SectionCard>
    </PageContainer>
  );
}
