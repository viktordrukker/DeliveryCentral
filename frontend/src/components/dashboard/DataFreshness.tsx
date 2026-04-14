import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import RefreshIcon from '@mui/icons-material/Refresh';

import { formatDateTime } from '@/lib/format-date';

interface DataFreshnessProps {
  lastUpdated?: Date | null;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function DataFreshness({
  lastUpdated,
  onRefresh,
  isRefreshing,
}: DataFreshnessProps): JSX.Element {
  const isStale = lastUpdated
    ? Date.now() - lastUpdated.getTime() > 30 * 60 * 1000
    : false;

  return (
    <Box
      className="data-freshness"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 2,
        py: 0.75,
        borderTop: '1px solid var(--color-border)',
        background: 'var(--color-surface-alt)',
        position: 'sticky',
        bottom: 0,
        zIndex: 1,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          color: isStale ? 'var(--color-status-warning)' : 'var(--color-text-muted)',
          flex: 1,
        }}
      >
        {lastUpdated
          ? `Data as of: ${formatDateTime(lastUpdated)}`
          : 'Loading...'}
        {isStale ? ' (stale)' : ''}
      </Typography>
      <IconButton
        size="small"
        onClick={onRefresh}
        disabled={isRefreshing}
        title="Refresh data"
        sx={{ p: 0.5 }}
      >
        {isRefreshing ? (
          <CircularProgress size={16} />
        ) : (
          <RefreshIcon sx={{ fontSize: 18 }} />
        )}
      </IconButton>
    </Box>
  );
}
