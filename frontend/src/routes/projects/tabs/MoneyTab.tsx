import { useEffect, useState } from 'react';

import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { fetchProjectBudgetDashboard, type ProjectBudgetDashboard } from '@/lib/api/project-budget';
import type { ProjectDetails } from '@/lib/api/project-registry';

import { CpiWhatIfCard } from './CpiWhatIfCard';
import { MoneyPanel } from './MoneyPanel';

interface MoneyTabProps {
  projectId: string;
  /**
   * Optional ProjectDetails fed in from the parent route. MoneyPanel's
   * internal 6-KPI strip covers EVM signals per the DS canvas; this prop
   * is retained for forward compatibility with downstream panels.
   */
  project?: ProjectDetails | null;
}

/**
 * SoT PR 5 — Money tab. The canvas-faithful `MoneyPanel` is the only
 * primary surface; the legacy "Budget administration" collapsible was
 * removed per DS canvas (DS/page-pulse.jsx has no collapsible). Budget
 * administration moved to the dedicated /budget admin surface.
 *
 * Reference: DS/page-plan-money.jsx ProjectMoney section.
 */
export function MoneyTab({ projectId }: MoneyTabProps): JSX.Element {
  const [dashboard, setDashboard] = useState<ProjectBudgetDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const data = await fetchProjectBudgetDashboard(projectId);
        if (active) {
          setDashboard(data);
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load budget dashboard.');
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [projectId]);

  return (
    <div
      data-testid="money-tab"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
    >
      {loading ? <LoadingState label="Loading budget…" variant="skeleton" skeletonType="detail" /> : null}
      {error ? <ErrorState description={error} /> : null}
      {!loading && !error && dashboard ? (
        <MoneyPanel dashboard={dashboard} projectId={projectId} />
      ) : null}

      <CpiWhatIfCard projectId={projectId} />
    </div>
  );
}
