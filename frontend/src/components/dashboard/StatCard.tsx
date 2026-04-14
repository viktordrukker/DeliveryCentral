import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

interface StatCardDelta {
  value: number;
  direction: 'up' | 'down' | 'stable';
  label?: string;
}

interface StatCardThreshold {
  warning: number;
  danger: number;
  above?: boolean;
}

interface StatCardProps {
  label: string;
  value: string | number;
  href: string;
  delta?: StatCardDelta;
  threshold?: StatCardThreshold;
  icon?: React.ElementType;
  loading?: boolean;
}

function getBorderColor(value: number | string, threshold?: StatCardThreshold): string {
  if (!threshold) return 'var(--color-threshold-healthy)';
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num)) return 'var(--color-threshold-healthy)';
  const above = threshold.above ?? true;
  if (above) {
    if (num >= threshold.danger) return 'var(--color-threshold-danger)';
    if (num >= threshold.warning) return 'var(--color-threshold-warning)';
  } else {
    if (num <= threshold.danger) return 'var(--color-threshold-danger)';
    if (num <= threshold.warning) return 'var(--color-threshold-warning)';
  }
  return 'var(--color-threshold-healthy)';
}

function getDeltaColor(direction: 'up' | 'down' | 'stable'): string {
  if (direction === 'up') return 'var(--color-status-active)';
  if (direction === 'down') return 'var(--color-status-danger)';
  return 'var(--color-text-subtle)';
}

function getDeltaArrow(direction: 'up' | 'down' | 'stable'): string {
  if (direction === 'up') return '\u2191';
  if (direction === 'down') return '\u2193';
  return '\u2192';
}

export function StatCard({
  label,
  value,
  href,
  delta,
  threshold,
  icon: Icon,
  loading,
}: StatCardProps): JSX.Element {
  if (process.env.NODE_ENV === 'development' && !href) {
    console.warn(`StatCard "${label}" rendered without href — violates UX Law 9 (clickable KPIs)`);
  }

  if (loading) {
    return (
      <Card sx={{ borderLeft: '3px solid var(--color-border)', p: 2, minWidth: 160 }}>
        <Skeleton width="60%" height={16} />
        <Skeleton width="40%" height={32} sx={{ mt: 1 }} />
      </Card>
    );
  }

  const borderColor = getBorderColor(value, threshold);

  return (
    <Card
      className="stat-card"
      sx={{
        borderLeft: `3px solid ${borderColor}`,
        transition: 'var(--transition-normal)',
        '&:hover': { boxShadow: 'var(--shadow-dropdown)' },
      }}
    >
      <CardActionArea component={Link} to={href} sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {Icon && <Icon sx={{ color: 'var(--color-text-muted)', fontSize: 18 }} />}
          <Typography variant="body2" sx={{ color: 'var(--color-text-muted)' }}>
            {label}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.5 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.2 }}>
            {value}
          </Typography>
          {delta && (
            <Typography
              variant="caption"
              sx={{ color: getDeltaColor(delta.direction), fontWeight: 600 }}
            >
              {getDeltaArrow(delta.direction)} {Math.abs(delta.value)}
              {delta.label ? ` ${delta.label}` : ''}
            </Typography>
          )}
        </Box>
      </CardActionArea>
    </Card>
  );
}
