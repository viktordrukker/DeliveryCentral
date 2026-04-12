interface EmptyStateProps {
  action?: { href: string; label: string };
  description?: string;
  title: string;
}

export function EmptyState({
  action,
  description,
  title,
}: EmptyStateProps): JSX.Element {
  return (
    <div className="feedback-state">
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action ? (
        <a className="button" href={action.href}>
          {action.label}
        </a>
      ) : null}
    </div>
  );
}
