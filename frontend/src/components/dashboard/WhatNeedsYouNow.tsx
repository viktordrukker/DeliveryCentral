import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ScheduleIcon from '@mui/icons-material/Schedule';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

export interface ActionItem {
  id: string;
  severity: 'overdue' | 'due-today' | 'due-this-week' | 'info';
  message: string;
  actionLabel: string;
  actionHref: string;
}

interface WhatNeedsYouNowProps {
  items: ActionItem[];
  loading?: boolean;
  maxItems?: number;
  viewAllHref?: string;
}

const SEVERITY_ORDER = ['overdue', 'due-today', 'due-this-week', 'info'];

function getSeverityIcon(severity: ActionItem['severity']): JSX.Element {
  switch (severity) {
    case 'overdue':
      return <ErrorOutlineIcon sx={{ color: 'var(--color-status-danger)' }} />;
    case 'due-today':
      return <WarningAmberIcon sx={{ color: 'var(--color-status-warning)' }} />;
    case 'due-this-week':
      return <ScheduleIcon sx={{ color: 'var(--color-status-pending)' }} />;
    default:
      return <InfoOutlinedIcon sx={{ color: 'var(--color-status-info)' }} />;
  }
}

export function WhatNeedsYouNow({
  items,
  loading,
  maxItems = 5,
  viewAllHref,
}: WhatNeedsYouNowProps): JSX.Element {
  if (loading) {
    return (
      <Card sx={{ mb: 2 }}>
        <CardHeader title="What Needs You Now" />
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
          ))}
        </Box>
      </Card>
    );
  }

  const sorted = [...items].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
  );
  const visible = sorted.slice(0, maxItems);

  return (
    <Card sx={{ mb: 2, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <CardHeader
        title="What Needs You Now"
        titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600, color: 'var(--color-text)' }}
        action={
          viewAllHref ? (
            <Button component={Link} to={viewAllHref} size="small" variant="text">
              View all
            </Button>
          ) : null
        }
        sx={{ pb: 0 }}
      />
      {visible.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <CheckCircleOutlineIcon sx={{ color: 'var(--color-status-active)', fontSize: 36, mb: 1 }} />
          <Typography variant="body2" sx={{ color: 'var(--color-text-muted)' }}>
            You're all caught up
          </Typography>
        </Box>
      ) : (
        <List dense>
          {visible.map((item) => (
            <ListItem
              key={item.id}
              secondaryAction={
                <Button component={Link} to={item.actionHref} size="small" variant="outlined">
                  {item.actionLabel}
                </Button>
              }
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                {getSeverityIcon(item.severity)}
              </ListItemIcon>
              <ListItemText
                primary={item.message}
                primaryTypographyProps={{ variant: 'body2', color: 'var(--color-text)' }}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Card>
  );
}
