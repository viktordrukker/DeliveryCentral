import { useCallback, useEffect, useState } from 'react';

import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { fetchProjectBudgetDashboard, type ProjectBudgetDashboard } from '@/lib/api/project-budget';
import type { ProjectDetails } from '@/lib/api/project-registry';

import { BudgetChangeRequestsPanel } from './BudgetChangeRequestsPanel';
import { BudgetEditForm } from './BudgetEditForm';
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
  const [showBudgetForm, setShowBudgetForm] = useState(false);

  const loadDashboard = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProjectBudgetDashboard(projectId);
      setDashboard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load budget dashboard.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const budget = dashboard?.budget ?? null;

  return (
    <div
      data-testid="money-tab"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
    >
      {loading ? <LoadingState label="Loading budget…" variant="skeleton" skeletonType="detail" /> : null}
      {error ? <ErrorState description={error} onRetry={() => void loadDashboard()} /> : null}

      {showBudgetForm ? (
        <BudgetEditForm
          projectId={projectId}
          initial={budget ? { fiscalYear: budget.fiscalYear, capex: budget.capex, opex: budget.opex } : null}
          onSaved={() => {
            setShowBudgetForm(false);
            void loadDashboard();
          }}
          onCancel={() => setShowBudgetForm(false)}
        />
      ) : null}

      {!loading && !error && dashboard ? (
        <MoneyPanel dashboard={dashboard} projectId={projectId} onEditBudget={() => setShowBudgetForm(true)} />
      ) : null}

      {/* SC-7 / #713 — budget-change approval queue (with resolved "Requested by"
          name) was previously only in the legacy BudgetTab, which v2 never
          renders. Surface it on the v2 Money tab via the shared panel. */}
      <BudgetChangeRequestsPanel projectId={projectId} onAfterDecision={() => void loadDashboard()} />

      <CpiWhatIfCard projectId={projectId} />
    </div>
  );
}
