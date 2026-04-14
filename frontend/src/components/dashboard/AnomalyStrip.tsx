import { useState } from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CloseIcon from '@mui/icons-material/Close';

export interface AnomalyAlert {
  id: string;
  severity: 'critical' | 'high';
  message: string;
  href: string;
}

interface AnomalyStripProps {
  alerts: AnomalyAlert[];
  onDismiss?: (id: string) => void;
}

export function AnomalyStrip({ alerts, onDismiss }: AnomalyStripProps): JSX.Element | null {
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const stored = sessionStorage.getItem('anomaly-dismissed');
      return stored ? new Set(JSON.parse(stored) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  const visibleAlerts = alerts.filter((a) => !dismissed.has(a.id));
  if (visibleAlerts.length === 0) return null;

  function handleDismiss(id: string): void {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      sessionStorage.setItem('anomaly-dismissed', JSON.stringify([...next]));
      return next;
    });
    onDismiss?.(id);
  }

  return (
    <Box className="anomaly-strip" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 2 }}>
      {visibleAlerts.map((alert) => (
        <Box
          key={alert.id}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 2,
            py: 1,
            borderRadius: 'var(--radius-control)',
            backgroundColor: alert.severity === 'critical'
              ? 'rgba(239, 68, 68, 0.12)'
              : 'rgba(245, 158, 11, 0.12)',
            borderLeft: `4px solid ${alert.severity === 'critical' ? 'var(--color-status-danger)' : 'var(--color-status-warning)'}`,
          }}
        >
          {alert.severity === 'critical' ? (
            <ErrorOutlineIcon sx={{ color: 'var(--color-status-danger)', fontSize: 20 }} />
          ) : (
            <WarningAmberIcon sx={{ color: 'var(--color-status-warning)', fontSize: 20 }} />
          )}
          <Typography variant="body2" sx={{ flex: 1, color: 'var(--color-text)' }}>
            {alert.message}
          </Typography>
          <Link to={alert.href} style={{ color: 'var(--color-accent)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
            View &rarr;
          </Link>
          <IconButton size="small" onClick={() => handleDismiss(alert.id)} title="Dismiss">
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      ))}
    </Box>
  );
}
