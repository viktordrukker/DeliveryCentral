import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

type StatusVariant = 'dot' | 'chip' | 'text';

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  size?: 'small' | 'medium';
}

function normalizeStatus(status: string): string {
  return status.toLowerCase().replace(/[-\s]/g, '_');
}

function humanLabel(status: string): string {
  return status
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const COLOR_MAP: Record<string, string> = {
  active: 'var(--color-status-active)',
  open: 'var(--color-status-active)',
  approved: 'var(--color-status-active)',
  healthy: 'var(--color-status-active)',
  completed: 'var(--color-status-active)',
  resolved: 'var(--color-status-active)',
  in_progress: 'var(--color-status-pending)',
  pending: 'var(--color-status-pending)',
  submitted: 'var(--color-status-pending)',
  under_review: 'var(--color-status-pending)',
  warning: 'var(--color-status-warning)',
  at_risk: 'var(--color-status-warning)',
  needs_attention: 'var(--color-status-warning)',
  revision_requested: 'var(--color-status-warning)',
  critical: 'var(--color-status-danger)',
  rejected: 'var(--color-status-danger)',
  overdue: 'var(--color-status-danger)',
  closed: 'var(--color-status-danger)',
  cancelled: 'var(--color-status-danger)',
  draft: 'var(--color-status-neutral)',
  planned: 'var(--color-status-neutral)',
  inactive: 'var(--color-status-neutral)',
  on_hold: 'var(--color-status-neutral)',
};

function getColor(status: string): string {
  return COLOR_MAP[normalizeStatus(status)] ?? 'var(--color-status-info)';
}

export function StatusBadge({
  status,
  variant = 'chip',
  size = 'small',
}: StatusBadgeProps): JSX.Element {
  const color = getColor(status);
  const label = humanLabel(status);

  if (variant === 'dot') {
    return (
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: color,
            flexShrink: 0,
          }}
        />
        <Typography variant={size === 'small' ? 'body2' : 'body1'} sx={{ color: 'var(--color-text)' }}>
          {label}
        </Typography>
      </Box>
    );
  }

  if (variant === 'text') {
    return (
      <Typography
        variant={size === 'small' ? 'body2' : 'body1'}
        sx={{ color, fontWeight: 600 }}
      >
        {label}
      </Typography>
    );
  }

  // chip variant
  return (
    <Chip
      label={label}
      size={size}
      sx={{
        backgroundColor: color,
        color: '#fff',
        fontWeight: 600,
        fontSize: size === 'small' ? '0.7rem' : '0.8rem',
        height: size === 'small' ? 22 : 28,
      }}
    />
  );
}
