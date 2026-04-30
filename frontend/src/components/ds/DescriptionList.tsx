import { ReactNode } from 'react';

export interface DescriptionListItem {
  /** Field label (left column). Required. */
  label: ReactNode;
  /** Field value (right column). Required. */
  value: ReactNode;
  /** Optional className applied to the row container. */
  className?: string;
}

interface DescriptionListProps {
  /** Field rows to render. */
  items: DescriptionListItem[];
  /** Visual density. `compact` matches the legacy `dash-compact-table` styling. */
  variant?: 'default' | 'compact';
  /** Optional `data-testid` for E2E selectors. */
  testId?: string;
  /** Optional className on the wrapper. */
  className?: string;
}

/**
 * Phase DS — DescriptionList atom for key-value pairs that don't fit
 * `<DataView>` / `<Table>` (which are designed for record sets).
 *
 * Replaces the inline `<table className="dash-compact-table">` + `<tbody><tr><td>label</td><td>value</td></tr></tbody>`
 * pattern that was repeated across many entity-summary surfaces (e.g. Project
 * Summary on ProjectDashboardPage, Team Summary on TeamDashboardPage).
 *
 * Renders semantic `<dl>` markup (description list) instead of `<table>`,
 * with token-driven styling matching the surrounding compact-table chrome.
 *
 * @example
 * <DescriptionList items={[
 *   { label: 'Name', value: project.name },
 *   { label: 'Code', value: project.projectCode },
 *   { label: 'Status', value: <StatusBadge status={project.status} /> },
 * ]} />
 */
export function DescriptionList({
  items,
  variant = 'compact',
  testId,
  className,
}: DescriptionListProps): JSX.Element {
  const cls = ['ds-description-list', `ds-description-list--${variant}`, className].filter(Boolean).join(' ');
  return (
    <dl className={cls} data-testid={testId}>
      {items.map((item, i) => (
        <div key={i} className={['ds-description-list__row', item.className].filter(Boolean).join(' ')}>
          <dt className="ds-description-list__label">{item.label}</dt>
          <dd className="ds-description-list__value">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
