import { ReactNode } from 'react';

import { Breadcrumb, type BreadcrumbItem } from '@/components/common/Breadcrumb';
import { TabBar } from '@/components/common/TabBar';

export interface PageHeaderTab {
  id: string;
  label: string;
}

interface PageHeaderProps {
  actions?: ReactNode;
  eyebrow?: string;
  /** Compact filter controls rendered inline in the header row (period selector, person dropdown, etc.) */
  filterControls?: ReactNode;
  subtitle?: string;
  title: string;
  /** Optional breadcrumb trail rendered above the title. */
  breadcrumbs?: BreadcrumbItem[];
  /** Optional badges / status pills rendered inline next to the title. */
  badges?: ReactNode;
  /** Optional tab list rendered below the header. */
  tabs?: PageHeaderTab[];
  /** Active tab id (controlled). Required when `tabs` is set. */
  activeTab?: string;
  /** Tab change callback. Required when `tabs` is set. */
  onTabChange?: (tabId: string) => void;
}

/**
 * App-wide page header. Existing pages compose breadcrumbs / tabs separately;
 * those props are accepted here so call sites can converge on one API in
 * line with `DetailLayout` (see `frontend/src/components/layout/DetailLayout.tsx`).
 *
 * All new props are optional — existing call sites are unchanged.
 */
export function PageHeader({
  actions,
  eyebrow,
  filterControls,
  subtitle,
  title,
  breadcrumbs,
  badges,
  tabs,
  activeTab,
  onTabChange,
}: PageHeaderProps): JSX.Element {
  const showTabs = tabs && tabs.length > 0 && activeTab !== undefined && onTabChange;
  const showBreadcrumbs = breadcrumbs && breadcrumbs.length > 0;
  return (
    <>
      {showBreadcrumbs ? <Breadcrumb items={breadcrumbs} /> : null}
      <div className="page-header">
        <div className="page-header__left">
          {eyebrow ? <div className="page-header__eyebrow">{eyebrow}</div> : null}
          <div className="page-header__title-row">
            <h2 className="page-header__title">{title}</h2>
            {subtitle ? (
              <span
                aria-label={subtitle}
                className="page-header__info"
                title={subtitle}
              >
                ℹ
              </span>
            ) : null}
            {badges ? <span className="page-header__badges">{badges}</span> : null}
          </div>
        </div>
        {filterControls ? (
          <div className="page-header__filter-controls">{filterControls}</div>
        ) : null}
        {actions ? <div className="page-header__actions">{actions}</div> : null}
      </div>
      {showTabs ? (
        <TabBar tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />
      ) : null}
    </>
  );
}
