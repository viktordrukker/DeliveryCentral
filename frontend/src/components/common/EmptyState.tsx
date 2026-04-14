import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';

interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: 'primary' | 'secondary';
}

interface EmptyStateProps {
  action?: { href: string; label: string };
  actions?: EmptyStateAction[];
  description?: string;
  icon?: React.ElementType;
  onClearFilters?: () => void;
  showClearFilters?: boolean;
  title: string;
}

export function EmptyState({
  action,
  actions,
  description,
  icon: Icon = InboxOutlinedIcon,
  onClearFilters,
  showClearFilters,
  title,
}: EmptyStateProps): JSX.Element {
  return (
    <Box className="feedback-state" sx={{ textAlign: 'center', p: 4 }}>
      <Icon sx={{ color: 'var(--color-text-subtle)', fontSize: 48, mb: 1.5 }} />
      <Typography variant="subtitle1" sx={{ color: 'var(--color-text)', mb: 0.5 }}>
        {title}
      </Typography>
      {description ? (
        <Typography variant="body2" sx={{ color: 'var(--color-text-muted)', mb: 2 }}>
          {description}
        </Typography>
      ) : null}
      <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
        {showClearFilters && onClearFilters && (
          <Button size="small" variant="outlined" onClick={onClearFilters}>
            Clear all filters
          </Button>
        )}
        {action ? (
          <Button size="small" variant="contained" href={action.href}>
            {action.label}
          </Button>
        ) : null}
        {actions?.map((a) => (
          <Button
            key={a.label}
            size="small"
            variant={a.variant === 'secondary' ? 'outlined' : 'contained'}
            onClick={a.onClick}
            href={a.href}
          >
            {a.label}
          </Button>
        ))}
      </Box>
    </Box>
  );
}
