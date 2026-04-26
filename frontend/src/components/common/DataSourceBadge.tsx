export type DataSourceKind = 'live' | 'demo' | 'override';

interface DataSourceBadgeProps {
  source: DataSourceKind;
  reason?: string | null;
}

const META: Record<DataSourceKind, { icon: string; label: string; tone: string; tooltip: string }> = {
  live: {
    icon: '📊',
    label: 'Live',
    tone: 'var(--color-status-active)',
    tooltip: 'Calculated from real delivery-ops flows.',
  },
  demo: {
    icon: '🌱',
    label: 'Demo',
    tone: 'var(--color-text-muted)',
    tooltip: 'Seeded placeholder — live calc ships with the future PIMS module.',
  },
  override: {
    icon: '⚙',
    label: 'Override',
    tone: 'var(--color-status-warning)',
    tooltip: 'Manual override by the Project Manager.',
  },
};

export function DataSourceBadge({ source, reason }: DataSourceBadgeProps): JSX.Element {
  const m = META[source];
  return (
    <span
      aria-label={`${m.label} data source`}
      data-testid="data-source-badge"
      style={{
        alignItems: 'center',
        background: 'var(--color-surface-alt)',
        border: `1px solid ${m.tone}`,
        borderRadius: 'var(--radius-control)',
        color: m.tone,
        display: 'inline-flex',
        fontSize: 10,
        fontWeight: 600,
        gap: 4,
        letterSpacing: '0.04em',
        padding: '1px 6px',
        textTransform: 'uppercase',
      }}
      title={reason ?? m.tooltip}
    >
      <span aria-hidden="true">{m.icon}</span>
      {m.label}
    </span>
  );
}
