import { PropsWithChildren, ReactNode } from 'react';

interface FilterBarProps {
  actions?: ReactNode;
}

export function FilterBar({
  actions,
  children,
}: PropsWithChildren<FilterBarProps>): JSX.Element {
  return (
    <div className="filter-bar">
      <div className="filter-bar__inputs">{children}</div>
      {actions ? <div className="filter-bar__actions">{actions}</div> : null}
    </div>
  );
}
