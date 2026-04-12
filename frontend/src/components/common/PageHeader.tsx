import { ReactNode } from 'react';

interface PageHeaderProps {
  actions?: ReactNode;
  eyebrow?: string;
  /** Compact filter controls rendered inline in the header row (period selector, person dropdown, etc.) */
  filterControls?: ReactNode;
  subtitle?: string;
  title: string;
}

export function PageHeader({
  actions,
  eyebrow,
  filterControls,
  subtitle,
  title,
}: PageHeaderProps): JSX.Element {
  return (
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
        </div>
      </div>
      {filterControls ? (
        <div className="page-header__filter-controls">{filterControls}</div>
      ) : null}
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </div>
  );
}
