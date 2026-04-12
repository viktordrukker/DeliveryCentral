const PRIORITY_STYLE: Record<string, { background: string; color: string }> = {
  LOW: { background: '#f3f4f6', color: '#6b7280' },
  MEDIUM: { background: '#dbeafe', color: '#1d4ed8' },
  HIGH: { background: '#fef3c7', color: '#b45309' },
  URGENT: { background: '#fee2e2', color: '#991b1b' },
};

export function PriorityBadge({ priority }: { priority: string }): JSX.Element {
  const style = PRIORITY_STYLE[priority] ?? { background: '#f3f4f6', color: '#374151' };
  return (
    <span
      style={{
        display: 'inline-block',
        background: style.background,
        color: style.color,
        borderRadius: 4,
        padding: '1px 8px',
        fontSize: '0.75rem',
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {priority}
    </span>
  );
}
