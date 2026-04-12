interface StatusIndicatorProps {
  status: string;
}

export function StatusIndicator({ status }: StatusIndicatorProps): JSX.Element {
  const normalized = status.toLowerCase();

  return (
    <span
      className={`status-indicator status-indicator--${normalized.replace(/[^a-z0-9]+/g, '-')}`}
    >
      {status}
    </span>
  );
}
