import { useEffect, useState } from 'react';

import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { StatusBadge, type StatusTone } from '@/components/common/StatusBadge';
import { fetchProjectBudgetDashboard, type ProjectBudgetDashboard } from '@/lib/api/project-budget';
import type { ProjectBudgetStatus, ProjectDetails } from '@/lib/api/project-registry';

import { CpiWhatIfCard } from './CpiWhatIfCard';
import { MoneyPanel } from './MoneyPanel';

interface MoneyTabProps {
  projectId: string;
  /**
   * W2-07 — optional ProjectDetails fed in from the parent route so the
   * Money tab can surface the BE-computed finance fields (cpi /
   * budgetStatus / openPositionsCount) alongside the dashboard panel. When
   * absent (legacy callers / loading state), the strip is omitted.
   */
  project?: ProjectDetails | null;
}

const BUDGET_STATUS_TONE: Record<ProjectBudgetStatus, StatusTone> = {
  GREEN: 'active',
  YELLOW: 'warning',
  RED: 'danger',
  UNSET: 'neutral',
};

const BUDGET_STATUS_LABEL: Record<ProjectBudgetStatus, string> = {
  GREEN: 'On track',
  YELLOW: 'At risk',
  RED: 'Over budget',
  UNSET: 'No budget',
};

/**
 * SoT PR 5 — Money tab. The canvas-faithful `MoneyPanel` is the only
 * primary surface; the legacy "Budget administration" collapsible was
 * removed per DS canvas (DS/page-pulse.jsx has no collapsible). Budget
 * administration moved to the dedicated /budget admin surface.
 *
 * Reference: DS/page-plan-money.jsx ProjectMoney section.
 */
export function MoneyTab({ projectId, project }: MoneyTabProps): JSX.Element {
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

  // W2-07 — BE finance summary surfaced from ProjectDetails (cpi /
  // budgetStatus / openPositionsCount). Hidden until project loads so the
  // tab doesn't flicker an empty strip during the initial fetch.
  const cpi = project?.cpi ?? null;
  const budgetStatus: ProjectBudgetStatus = project?.budgetStatus ?? 'UNSET';
  const openPositionsCount = project?.openPositionsCount ?? null;
  const cpiTone: StatusTone =
    cpi === null ? 'neutral' : cpi >= 1 ? 'active' : cpi >= 0.9 ? 'warning' : 'danger';

  return (
    <div
      data-testid="money-tab"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
    >
      {project ? (
        <div
          data-testid="money-tab-finance-strip"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 'var(--space-3)',
            padding: 'var(--space-3) var(--space-4)',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span
              style={{
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'var(--color-text-subtle)',
              }}
            >
              CPI
            </span>
            <span data-testid="money-tab-cpi" style={{ fontSize: 18, fontWeight: 600 }}>
              {cpi === null ? (
                <span style={{ color: 'var(--color-text-muted)' }}>—</span>
              ) : (
                <StatusBadge
                  label={cpi.toFixed(2)}
                  tone={cpiTone}
                  variant="score"
                />
              )}
            </span>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>EV / AC</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span
              style={{
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'var(--color-text-subtle)',
              }}
            >
              Budget status
            </span>
            <span data-testid="money-tab-budget-status" style={{ fontSize: 18, fontWeight: 600 }}>
              <StatusBadge
                label={BUDGET_STATUS_LABEL[budgetStatus]}
                tone={BUDGET_STATUS_TONE[budgetStatus]}
                variant="chip"
              />
            </span>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>EAC vs BAC</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span
              style={{
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'var(--color-text-subtle)',
              }}
            >
              Open positions
            </span>
            <span
              data-testid="money-tab-open-positions"
              style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
            >
              {openPositionsCount ?? 0}
            </span>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              Demand still on the market
            </span>
          </div>
        </div>
      ) : null}

      {loading ? <LoadingState label="Loading budget…" variant="skeleton" skeletonType="detail" /> : null}
      {error ? <ErrorState description={error} /> : null}
      {!loading && !error && dashboard ? (
        <MoneyPanel dashboard={dashboard} projectId={projectId} />
      ) : null}

      <CpiWhatIfCard projectId={projectId} />
    </div>
  );
}
