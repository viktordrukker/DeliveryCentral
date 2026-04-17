import { Link } from 'react-router-dom';

import type { StaffingAlert } from '@/lib/api/project-rag';

interface StaffingAlertsListProps {
  alerts: StaffingAlert[];
}

const SEVERITY_ICONS: Record<string, string> = {
  CRITICAL: '\u{1F534}',
  HIGH: '\u{1F7E0}',
  MEDIUM: '\u{1F7E1}',
};

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'var(--color-status-danger)',
  HIGH: 'var(--color-status-warning)',
  MEDIUM: 'var(--color-text-muted)',
};

export function StaffingAlertsList({ alerts }: StaffingAlertsListProps): JSX.Element {
  if (alerts.length === 0) {
    return <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>No staffing alerts — all clear.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {alerts.map((alert, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-2) var(--space-3)',
            borderLeft: `3px solid ${SEVERITY_COLORS[alert.severity] ?? 'var(--color-border)'}`,
            background: 'var(--color-surface-alt)',
            borderRadius: 'var(--radius-control, 4px)',
            fontSize: 12,
          }}
        >
          <span>{SEVERITY_ICONS[alert.severity] ?? '\u2022'}</span>
          <span style={{ flex: 1 }}>{alert.message}</span>
          {alert.actionLink ? (
            <Link
              to={alert.actionLink}
              style={{ fontSize: 10, color: 'var(--color-accent)', whiteSpace: 'nowrap' }}
            >
              View →
            </Link>
          ) : null}
        </div>
      ))}
    </div>
  );
}
