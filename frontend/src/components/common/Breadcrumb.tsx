import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  href?: string;
  label: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps): JSX.Element {
  return (
    <nav aria-label="breadcrumb" className="breadcrumb">
      {items.map((item, i) => (
        <span key={i}>
          {i > 0 && <span className="breadcrumb__sep"> › </span>}
          {item.href && i < items.length - 1 ? (
            <Link className="breadcrumb__link" to={item.href}>
              {item.label}
            </Link>
          ) : (
            <span className="breadcrumb__current">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
