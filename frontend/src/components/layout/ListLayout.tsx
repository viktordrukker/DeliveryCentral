import { ReactNode } from 'react';

import { PageContainer } from '@/components/common/PageContainer';

interface ListLayoutProps {
  /** Optional banners rendered above all content (loading / error / not-found). */
  banners?: ReactNode;
  /**
   * Optional page header. Use only for list pages that DO NOT inject their
   * top controls via `useTitleBarActions()`. Most list pages should use the
   * title bar (search input, filters, export); this slot is for admin /
   * config lists that need a per-page header.
   */
  header?: ReactNode;
  /**
   * Optional standalone filter-bar slot above the main content. Use when the
   * page is a non-table list (cards, tiles) and `<DataView>`'s built-in
   * filter row doesn't apply.
   */
  filterBar?: ReactNode;
  /**
   * Main list body — typically a single `<DataView>` (with its own
   * `emptyState` slot). Pages with non-table lists (cards, kanban) compose
   * the body inline.
   */
  children: ReactNode;
  /**
   * Optional freshness footer — typically `<DataFreshness lastFetch onRefresh />`.
   * Operational queue pages (exception queues, approval queues) use this to
   * indicate when the list was last reloaded.
   */
  freshness?: ReactNode;
  /**
   * Pass `viewport` through to `<PageContainer>` for full-viewport list
   * pages (DataView with its own scroll container handles the overflow).
   */
  viewport?: boolean;
  /** Optional `data-testid` for E2E selectors. */
  testId?: string;
}

/**
 * Phase DS-5-1 — compound layout for the List-Detail Workflow grammar
 * (Grammar 2 per `docs/planning/phase18-page-grammars.md`).
 *
 * Light-touch shell: most list pages have their search / filter / export
 * controls injected into the global title bar via `useTitleBarActions()`,
 * so this layout deliberately omits a header by default. The compound
 * shape is just:
 *
 *   `<PageContainer>` → optional `banners` → optional `header` → optional `filterBar` → children
 *
 * The page composes its main list (typically `<DataView>`) inside `children`.
 * Empty-state lives inside `<DataView emptyState={…}>` — the layout doesn't
 * need to know about it.
 */
export function ListLayout({
  banners,
  header,
  filterBar,
  children,
  freshness,
  viewport,
  testId,
}: ListLayoutProps): JSX.Element {
  return (
    <PageContainer testId={testId} viewport={viewport}>
      {banners}
      {header}
      {filterBar}
      {children}
      {freshness}
    </PageContainer>
  );
}
