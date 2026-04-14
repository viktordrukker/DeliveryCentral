import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

interface ErrorStateProps {
  title?: string;
  description: string;
  onRetry?: () => void;
  variant?: 'page' | 'inline' | 'card';
  icon?: React.ElementType;
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
  variant = 'page',
  icon: Icon = ErrorOutlineIcon,
}: ErrorStateProps): JSX.Element {
  if (variant === 'inline') {
    return (
      <Box className="error-state error-state--inline" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5 }}>
        <Icon sx={{ color: 'var(--color-danger)', fontSize: 20 }} />
        <Typography variant="body2" sx={{ color: 'var(--color-text)', flex: 1 }}>
          {description}
        </Typography>
        {onRetry && (
          <Button size="small" variant="outlined" onClick={onRetry}>
            Retry
          </Button>
        )}
      </Box>
    );
  }

  if (variant === 'card') {
    return (
      <Box className="error-state error-state--card" sx={{ textAlign: 'center', p: 3 }}>
        <Icon sx={{ color: 'var(--color-danger)', fontSize: 32, mb: 1 }} />
        <Typography variant="subtitle2" sx={{ color: 'var(--color-text)', mb: 0.5 }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: 'var(--color-text-muted)', mb: 2 }}>
          {description}
        </Typography>
        {onRetry && (
          <Button size="small" variant="outlined" onClick={onRetry}>
            Retry
          </Button>
        )}
      </Box>
    );
  }

  // variant === 'page'
  return (
    <Box className="error-state error-state--page" sx={{ textAlign: 'center', p: 6 }}>
      <Icon sx={{ color: 'var(--color-danger)', fontSize: 48, mb: 2 }} />
      <Typography variant="h6" sx={{ color: 'var(--color-text)', mb: 1 }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: 'var(--color-text-muted)', mb: 3 }}>
        {description}
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        {onRetry && (
          <Button variant="contained" onClick={onRetry}>
            Retry
          </Button>
        )}
        <Button href="/" variant="outlined">
          Go to Dashboard
        </Button>
      </Box>
    </Box>
  );
}
