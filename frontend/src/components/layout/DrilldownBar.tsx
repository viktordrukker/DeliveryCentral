import { useDrilldown } from '@/app/drilldown-context';

export function DrilldownBar(): JSX.Element | null {
  const { crumbs, navigateTo } = useDrilldown();

  // Don't render if only one crumb (no drill-down path to show)
  if (crumbs.length <= 1) return null;

  return (
    <nav className="drilldown-bar" aria-label="Drill-down path">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={crumb.href + i} className="drilldown-bar__item">
            {i > 0 && <span className="drilldown-bar__sep">{'\u203A'}</span>}
            {isLast ? (
              <span className="drilldown-bar__current">{crumb.label}</span>
            ) : (
              <button
                className="drilldown-bar__link"
                onClick={() => navigateTo(crumb.href)}
                type="button"
              >
                {crumb.label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}
