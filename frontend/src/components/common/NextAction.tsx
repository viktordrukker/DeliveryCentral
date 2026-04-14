import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

export interface NextActionItem {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

export interface NextActionProps {
  message: string;
  actions: NextActionItem[];
  autoDismissMs?: number;
}

export function NextAction({
  message,
  actions,
  autoDismissMs = 8000,
}: NextActionProps): JSX.Element | null {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (autoDismissMs <= 0) return;
    const timer = setTimeout(() => setVisible(false), autoDismissMs);
    return () => clearTimeout(timer);
  }, [autoDismissMs]);

  if (!visible) return null;

  return (
    <Box
      className="next-action"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 1.5,
        px: 2,
        borderLeft: '4px solid var(--color-status-active)',
        borderRadius: 'var(--radius-control)',
        background: 'var(--color-success-bg)',
      }}
    >
      <CheckCircleOutlineIcon sx={{ color: 'var(--color-status-active)', fontSize: 20 }} />
      <Typography variant="body2" sx={{ flex: 1, color: 'var(--color-text)' }}>
        {message}
      </Typography>
      {actions.map((a) => (
        <Button
          key={a.label}
          size="small"
          variant={a.variant === 'secondary' ? 'outlined' : 'contained'}
          onClick={() => {
            if (a.onClick) a.onClick();
            else if (a.href) navigate(a.href);
          }}
        >
          {a.label}
        </Button>
      ))}
      <Button size="small" variant="text" onClick={() => setVisible(false)} sx={{ minWidth: 'auto', px: 1 }}>
        ×
      </Button>
    </Box>
  );
}
