import { Link, useLocation } from 'react-router-dom';

export interface BreadcrumbItem {
  href?: string;
  label: string;
  preserveParams?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps): JSX.Element {
  const location = useLocation();

  function resolveHref(item: BreadcrumbItem): string | undefined {
    if (!item.href) return undefined;
    if (!item.preserveParams) return item.href;

    // Restore params from sessionStorage (stored when navigating from list to detail)
    const stored = sessionStorage.getItem(`breadcrumb-params:${item.href}`);
    return stored ? `${item.href}?${stored}` : item.href;
  }

  return (
    <nav aria-label="breadcrumb" className="breadcrumb">
      {items.map((item, i) => (
        <span key={i}>
          {i > 0 && <span className="breadcrumb__sep"> › </span>}
          {(() => {
            const href = resolveHref(item);
            return href && i < items.length - 1 ? (
              <Link className="breadcrumb__link" to={href}>
                {item.label}
              </Link>
            ) : (
              <span className="breadcrumb__current">{item.label}</span>
            );
          })()}
        </span>
      ))}
    </nav>
  );
}

/**
 * Call this when navigating from a list page to a detail page.
 * Stores the current URL search params so the breadcrumb "back" link can restore them.
 */
export function storeBreadcrumbParams(listPath: string, searchParams: string): void {
  if (searchParams) {
    sessionStorage.setItem(`breadcrumb-params:${listPath}`, searchParams);
  }
}
