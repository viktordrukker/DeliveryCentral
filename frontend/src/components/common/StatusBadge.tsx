import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export type StatusTone = 'active' | 'pending' | 'warning' | 'danger' | 'info' | 'neutral';
type StatusVariant = 'dot' | 'chip' | 'text' | 'score';

interface StatusBadgeProps {
  label?: string;
  score?: number;
  status?: string;
  title?: string;
  tone?: StatusTone;
  uppercase?: boolean;
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

const TONE_MAP: Record<string, StatusTone> = {
  active: 'active',
  open: 'active',
  approved: 'active',
  healthy: 'active',
  completed: 'active',
  resolved: 'active',
  fulfilled: 'active',
  matched: 'active',
  configured: 'active',
  succeeded: 'active',
  ok: 'active',
  ready: 'active',
  in_progress: 'pending',
  pending: 'pending',
  submitted: 'pending',
  under_review: 'pending',
  in_review: 'pending',
  low: 'neutral',
  medium: 'info',
  warning: 'warning',
  at_risk: 'warning',
  needs_attention: 'warning',
  revision_requested: 'warning',
  urgent: 'danger',
  critical: 'danger',
  rejected: 'danger',
  overdue: 'danger',
  closed: 'danger',
  cancelled: 'danger',
  failed: 'danger',
  failed_terminal: 'danger',
  degraded: 'danger',
  unmatched: 'danger',
  draft: 'neutral',
  planned: 'neutral',
  inactive: 'neutral',
  on_hold: 'neutral',
  not_configured: 'neutral',
  ambiguous: 'warning',
  stale_conflict: 'warning',
  presence_drift: 'warning',
};

const TONE_COLOR_MAP: Record<StatusTone, string> = {
  active: 'var(--color-status-active)',
  pending: 'var(--color-status-pending)',
  warning: 'var(--color-status-warning)',
  danger: 'var(--color-status-danger)',
  info: 'var(--color-status-info)',
  neutral: 'var(--color-status-neutral)',
};

export function resolveStatusTone(status: string): StatusTone {
  return TONE_MAP[normalizeStatus(status)] ?? 'info';
}

export function statusToneColor(tone: StatusTone): string {
  return TONE_COLOR_MAP[tone];
}

export function StatusBadge({
  label,
  score,
  status = '',
  title,
  tone,
  uppercase = false,
  variant = 'chip',
  size = 'small',
}: StatusBadgeProps): JSX.Element {
  const resolvedTone = tone ?? resolveStatusTone(status);
  const color = statusToneColor(resolvedTone);
  const displayLabel = label ?? humanLabel(status);

  if (variant === 'score') {
    const circleSize = size === 'small' ? 20 : 28;
    const fontSize = size === 'small' ? 9 : 11;

    return (
      <Box
        aria-label={title ?? displayLabel}
        className="status-badge status-badge--score"
        component="span"
        title={title}
      >
        <svg
          height={circleSize}
          style={{ flexShrink: 0 }}
          viewBox={`0 0 ${circleSize} ${circleSize}`}
          width={circleSize}
        >
          <circle
            cx={circleSize / 2}
            cy={circleSize / 2}
            fill={color}
            r={circleSize / 2 - 1}
          />
          <text
            dominantBaseline="central"
            fill="#fff"
            fontSize={fontSize}
            fontWeight="bold"
            textAnchor="middle"
            x={circleSize / 2}
            y={circleSize / 2}
          >
            {score ?? displayLabel}
          </text>
        </svg>
      </Box>
    );
  }

  if (variant === 'dot') {
    return (
      <Box
        className="status-badge status-badge--dot"
        component="span"
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}
        title={title}
      >
        <Box
          className="status-badge__dot"
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: color,
            flexShrink: 0,
          }}
        />
        <Typography variant={size === 'small' ? 'body2' : 'body1'} sx={{ color: 'var(--color-text)' }}>
          {uppercase ? displayLabel.toUpperCase() : displayLabel}
        </Typography>
      </Box>
    );
  }

  if (variant === 'text') {
    return (
      <Typography
        className="status-badge status-badge--text"
        variant={size === 'small' ? 'body2' : 'body1'}
        sx={{ color, fontWeight: 600 }}
        title={title}
      >
        {uppercase ? displayLabel.toUpperCase() : displayLabel}
      </Typography>
    );
  }

  return (
    <Chip
      className="status-badge status-badge--chip"
      label={uppercase ? displayLabel.toUpperCase() : displayLabel}
      size={size}
      sx={{
        backgroundColor: `${color}1f`,
        border: `1px solid ${color}4d`,
        color,
        fontWeight: 600,
        fontSize: size === 'small' ? '0.7rem' : '0.8rem',
        height: size === 'small' ? 22 : 28,
        letterSpacing: uppercase ? '0.04em' : undefined,
      }}
      title={title}
    />
  );
}
