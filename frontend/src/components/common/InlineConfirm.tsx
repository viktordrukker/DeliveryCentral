import { useCallback, useEffect, useRef, useState } from 'react';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface InlineConfirmProps {
  trigger: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  message?: string;
  variant?: 'destructive' | 'warning' | 'default';
  autoRevertMs?: number;
}

export function InlineConfirm({
  trigger,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  message,
  variant = 'default',
  autoRevertMs = 5000,
}: InlineConfirmProps): JSX.Element {
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const revert = useCallback(() => {
    setConfirming(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (confirming && autoRevertMs > 0) {
      timerRef.current = setTimeout(revert, autoRevertMs);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [confirming, autoRevertMs, revert]);

  const handleConfirm = (): void => {
    revert();
    onConfirm();
  };

  if (!confirming) {
    return (
      <span className="inline-confirm" onClick={() => setConfirming(true)}>
        {trigger}
      </span>
    );
  }

  const confirmColor = variant === 'destructive' ? 'error' : variant === 'warning' ? 'warning' : 'primary';

  return (
    <Box className="inline-confirm inline-confirm--active" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      {message && (
        <Typography variant="body2" sx={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
          {message}
        </Typography>
      )}
      <Button size="small" variant="contained" color={confirmColor} onClick={handleConfirm}>
        {confirmLabel}
      </Button>
      <Button size="small" variant="outlined" onClick={revert}>
        {cancelLabel}
      </Button>
    </Box>
  );
}
