import { Button, CircularProgress } from '@mui/material';
import { useState } from 'react';

import { downloadDiagnosticBundle } from '@/lib/api/setup';

interface Props {
  token: string | null;
  runId: string | null;
}

/**
 * Single-click "Download diagnostic bundle" button. Lives in the wizard
 * header on every screen so an operator who hits a snag can ship logs to
 * support without copy-pasting from `docker logs`.
 */
export function DiagnosticBundleButton({ token, runId }: Props): JSX.Element {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = !token || !runId || busy;

  async function handleClick(): Promise<void> {
    if (!token || !runId) return;
    setBusy(true);
    setError(null);
    try {
      await downloadDiagnosticBundle(token, runId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        color="secondary"
        disabled={disabled}
        onClick={handleClick}
        sx={{ ml: 1 }}
        startIcon={busy ? <CircularProgress size={14} /> : undefined}
      >
        Download diagnostic bundle
      </Button>
      {error && (
        <span style={{ marginLeft: 8, color: '#c62828', fontSize: 12 }}>{error}</span>
      )}
    </>
  );
}
