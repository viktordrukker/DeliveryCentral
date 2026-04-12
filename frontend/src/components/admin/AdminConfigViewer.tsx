interface AdminConfigEntry {
  label: string;
  value: string;
  supportingText?: string;
}

interface AdminConfigViewerProps {
  emptyMessage: string;
  entries: AdminConfigEntry[];
}

export function AdminConfigViewer({
  emptyMessage,
  entries,
}: AdminConfigViewerProps): JSX.Element {
  if (entries.length === 0) {
    return <p className="admin-config-viewer__empty">{emptyMessage}</p>;
  }

  return (
    <dl className="admin-config-viewer">
      {entries.map((entry) => (
        <div className="admin-config-viewer__item" key={entry.label}>
          <dt>{entry.label}</dt>
          <dd>{entry.value}</dd>
          {entry.supportingText ? (
            <div className="admin-config-viewer__supporting-text">{entry.supportingText}</div>
          ) : null}
        </div>
      ))}
    </dl>
  );
}
