import { ReactNode } from 'react';

import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';

interface AnalysisLayoutProps {
  /** Optional eyebrow (typically "Analytics" or "Reports"). */
  eyebrow?: string;
  /** Page title. Required. */
  title: string;
  /** Optional one-line subtitle / description. */
  subtitle?: string;
  /**
   * Optional header actions — typically an Export button. Renders right-
   * aligned in the page header row.
   */
  actions?: ReactNode;
  /**
   * Filter bar — date range, person/project pickers, etc. Rendered between
   * the header and the main content. Wrapped in `<div className="filter-bar">`
   * for token-driven styling consistency. Pass `null` to omit.
   */
  filters?: ReactNode;
  /** Optional banners rendered above the main content (loading / error). */
  banners?: ReactNode;
  /**
   * Main analysis body — typically a series of `<SectionCard>` chart sections
   * followed by a result table.
   */
  children: ReactNode;
  /**
   * Pass `viewport` through to `<PageContainer>` for full-viewport pages
   * (the body's table / chart owns its own scroll container).
   */
  viewport?: boolean;
  /** Optional `data-testid` for E2E selectors. */
  testId?: string;
}

/**
 * Phase DS-5-1 — compound layout for the Analysis Surface grammar (Grammar 6
 * per `docs/planning/phase18-page-grammars.md`).
 *
 * Composes:
 *   `<PageContainer>` → `<PageHeader>` → optional `filters` (in `.filter-bar`)
 *   → optional `banners` → children
 *
 * The explicit `filters` slot is what distinguishes AnalysisLayout from
 * FormPageLayout — analysis pages always have a date-range / person / project
 * filter bar driving the data, and the consistent `.filter-bar` wrapper
 * standardizes its placement and styling.
 *
 * Typical export actions live in the header `actions` slot. The body composes
 * `<SectionCard>` chart sections + a result table inline.
 */
export function AnalysisLayout({
  eyebrow,
  title,
  subtitle,
  actions,
  filters,
  banners,
  children,
  viewport,
  testId,
}: AnalysisLayoutProps): JSX.Element {
  return (
    <PageContainer testId={testId} viewport={viewport}>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        actions={actions}
      />
      {filters ? <div className="filter-bar">{filters}</div> : null}
      {banners}
      {children}
    </PageContainer>
  );
}
