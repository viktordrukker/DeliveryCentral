import { useDrilldown } from '@/app/drilldown-context';

interface PageTitleBarProps {
  description?: string;
  title: string;
  parentLabel?: string;
  parentHref?: string;
  actions?: React.ReactNode;
}

export function PageTitleBar({
  description,
  title,
  actions,
}: PageTitleBarProps): JSX.Element {
  const { crumbs, navigateTo } = useDrilldown();

  // The drilldown trail replaces the static parent/title breadcrumb.
  // If we have crumbs, show them. The last crumb is the current page.
  const showDrilldown = crumbs.length > 1;

  return (
    <div className="page-title-bar">
      <div className="page-title-bar__top">
        <div className="page-title-bar__heading">
          {showDrilldown ? (
            // Render the full drilldown trail
            crumbs.map((crumb, i) => {
              const isLast = i === crumbs.length - 1;
              return (
                <span key={crumb.href + i} style={{ display: 'inline-flex', alignItems: 'center' }}>
                  {i > 0 && <span className="page-title-bar__sep">{'\u203A'}</span>}
                  {isLast ? (
                    <h1 className="page-title-bar__title">{crumb.label}</h1>
                  ) : (
                    <button
                      className="page-title-bar__parent"
                      onClick={() => navigateTo(crumb.href)}
                      type="button"
                    >
                      {crumb.label}
                    </button>
                  )}
                </span>
              );
            })
          ) : (
            // Single page, no trail
            <h1 className="page-title-bar__title">{title}</h1>
          )}
        </div>
        {actions && <div className="page-title-bar__actions">{actions}</div>}
      </div>
      {description ? (
        <p className="page-title-bar__description">{description}</p>
      ) : null}
    </div>
  );
}
