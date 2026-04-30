import { ReactNode } from 'react';

import { PageContainer } from '@/components/common/PageContainer';

interface DashboardLayoutProps {
  /** Optional banners rendered above all content (loading / error / not-found). */
  banners?: ReactNode;
  /**
   * Optional prelude rendered between banners and the main content. Use for
   * one-time intro affordances like `<OnboardingChecklist>` that should sit
   * above the KPI strip.
   */
  prelude?: ReactNode;
  /**
   * Main dashboard body — typically a KPI strip + hero chart + action section
   * + secondary grid, in that order. Composed by the consumer (variation
   * between dashboards is too high for a strict slot-based API).
   */
  children: ReactNode;
  /**
   * Optional freshness footer — typically `<DataFreshness lastFetch onRefresh />`.
   * Rendered below the main content.
   */
  freshness?: ReactNode;
  /** Optional `data-testid` for E2E selectors. */
  testId?: string;
}

/**
 * Phase DS-5-1 — compound layout for the Decision-Dashboard grammar (Grammar 1
 * per `docs/planning/phase18-page-grammars.md`).
 *
 * Light-touch on purpose: dashboards vary in structure (single hero vs tabs
 * vs multi-card grid) so the layout doesn't try to slot every section. It
 * provides a consistent shell for:
 *
 *   `<PageContainer>` → optional `banners` → optional `prelude` → children → optional `freshness`
 *
 * The page composes its own KPI strip / hero / action section / secondary grid
 * inside `children`. This matches the existing dashboard page structure (no
 * forced restructuring) while standardizing the boilerplate (PageContainer
 * shell, prelude / banners / freshness slots).
 *
 * Note: dashboards inject title-bar controls via `useTitleBarActions()` — they
 * do NOT use `<PageHeader>`. So `DashboardLayout` deliberately omits a header
 * slot. Use `<DetailLayout>` if you need a per-page header.
 */
export function DashboardLayout({
  banners,
  prelude,
  children,
  freshness,
  testId,
}: DashboardLayoutProps): JSX.Element {
  return (
    <PageContainer testId={testId}>
      {banners}
      {prelude}
      {children}
      {freshness}
    </PageContainer>
  );
}
