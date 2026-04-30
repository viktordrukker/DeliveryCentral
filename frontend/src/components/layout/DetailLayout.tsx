import { ReactNode } from 'react';

import { Breadcrumb, type BreadcrumbItem } from '@/components/common/Breadcrumb';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { TabBar } from '@/components/common/TabBar';

export interface DetailLayoutTab {
  id: string;
  label: string;
}

interface DetailLayoutProps {
  /** Optional breadcrumb trail. Omit to hide. */
  breadcrumbs?: BreadcrumbItem[];
  /** Optional eyebrow above the title (typically the entity-type label). */
  eyebrow?: string;
  /** Detail-page title — usually the entity name. Required. */
  title: string;
  /** Optional one-line subtitle / description rendered as info-tooltip. */
  subtitle?: string;
  /** Optional inline filter controls in the header row. */
  filterControls?: ReactNode;
  /** Optional action buttons in the header row (right-aligned). */
  actions?: ReactNode;
  /** Optional KPI strip / data summary rendered between header and tabs.
   *  Many detail pages show entity metrics here before the tabbed deep-dive. */
  kpiStrip?: ReactNode;
  /** Optional pre-tab banners (loading, error, empty state) rendered between
   *  the header (or KPI strip) and the tabs. */
  banners?: ReactNode;
  /** Tab list. Omit to render no tabs. */
  tabs?: DetailLayoutTab[];
  /** Active tab id (controlled). Required when `tabs` is set. */
  activeTab?: string;
  /** Tab change callback. Required when `tabs` is set. */
  onTabChange?: (tabId: string) => void;
  /** Tab content / detail body. */
  children: ReactNode;
  /** Optional `data-testid` for E2E selectors. */
  testId?: string;
}

/**
 * Phase DS-5-1 — compound layout for the Detail Surface grammar (Grammar 3
 * per `docs/planning/phase18-page-grammars.md`).
 *
 * Composes existing primitives:
 *   `<PageContainer>` → `<Breadcrumb>` (optional) → `<PageHeader>` →
 *   `<TabBar>` (optional) → children.
 *
 * "Fix-once, propagate-everywhere" applies here: a change to how breadcrumbs
 * render on detail pages is a single edit in this file rather than a sweep
 * across every detail page.
 *
 * Mobile responsive (DS-5-3): the TabBar already uses `.tab-bar` class which
 * the upcoming `.tab-bar { overflow-x: auto; scroll-snap-type: x mandatory }`
 * tweak in `global.css` will turn into a horizontal scroller below `md`.
 *
 * Existing detail pages can migrate progressively — call sites that need a
 * non-standard arrangement (e.g. a sticky alert ribbon) compose from the
 * underlying primitives directly. This layout is opt-in.
 */
export function DetailLayout({
  breadcrumbs,
  eyebrow,
  title,
  subtitle,
  filterControls,
  actions,
  kpiStrip,
  banners,
  tabs,
  activeTab,
  onTabChange,
  children,
  testId,
}: DetailLayoutProps): JSX.Element {
  const showTabs = tabs && tabs.length > 0 && activeTab !== undefined && onTabChange;

  return (
    <PageContainer testId={testId}>
      {breadcrumbs && breadcrumbs.length > 0 ? <Breadcrumb items={breadcrumbs} /> : null}
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        filterControls={filterControls}
        actions={actions}
      />
      {banners}
      {kpiStrip}
      {showTabs ? (
        <TabBar
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={onTabChange}
        />
      ) : null}
      {children}
    </PageContainer>
  );
}
