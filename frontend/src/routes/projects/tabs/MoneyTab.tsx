import { useEffect, useState } from 'react';

import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { SectionCard } from '@/components/common/SectionCard';
import { fetchProjectBudgetDashboard, type ProjectBudgetDashboard } from '@/lib/api/project-budget';

import { CpiWhatIfCard } from './CpiWhatIfCard';
import { MoneyPanel } from './MoneyPanel';
import { BudgetTab } from './BudgetTab';

interface MoneyTabProps {
  projectId: string;
}

/**
 * V2-A.4 — Money tab promoted as a top-level surface in the 3-tab canvas
 * grammar. The canvas-faithful `MoneyPanel` renders as the primary view;
 * the legacy budget-administration UI (set-budget form, change requests,
 * SPC burn-down) lives below inside a collapsible "Budget administration"
 * section so PMs can still edit budgets without leaving the tab.
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

      <SectionCard
        title="Budget administration"
        collapsible
        defaultCollapsed
        data-testid="money-tab-admin"
      >
        <BudgetTab projectId={projectId} canvasMode />
      </SectionCard>
    </div>
  );
}
