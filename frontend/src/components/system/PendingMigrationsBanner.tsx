import { useEffect, useState } from 'react';
import { Alert, Button, CircularProgress, Stack } from '@mui/material';
import { toast } from 'sonner';

import { useAuth } from '@/app/auth-context';
import { httpGet, httpPost } from '@/lib/api/http-client';

interface SystemState {
  degraded: boolean;
  pendingMigrations: string[];
}

const POLL_INTERVAL_MS = 60_000;

/**
 * Phase 7 — admin-only banner that surfaces pending schema migrations.
 *
 * Backend boot probe (`SystemStateService.refresh()`) populates the
 * pending list at startup; this banner polls /api/system/state every
 * 60 seconds (lightweight) so a freshly deployed image's pending
 * migrations show up without a full app reload.
 *
 * Non-admin users never see the banner (gate on principal.roles
 * containing 'admin'). The "Apply migrations" button POSTs to
 * /api/admin/system/migrations/apply, which reuses the wizard's
 * migrations step server-side.
 */
export function PendingMigrationsBanner(): JSX.Element | null {
  const { principal } = useAuth();
  const [state, setState] = useState<SystemState | null>(null);
  const [busy, setBusy] = useState(false);

  const isAdmin = principal?.roles?.includes('admin') ?? false;

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const s = await httpGet<SystemState>('/system/state');
        if (!cancelled) setState(s);
      } catch {
        // Swallow — the banner is best-effort. A persistent failure to
        // read state shouldn't blackout the app for admins.
      }
    }
    void load();
    const tid = window.setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(tid);
    };
  }, [isAdmin]);

  if (!isAdmin || !state || !state.degraded || state.pendingMigrations.length === 0) {
    return null;
  }

  async function handleApply(): Promise<void> {
    setBusy(true);
    try {
      await httpPost<{ ok: true; runId: string }, Record<string, never>>(
        '/admin/system/migrations/apply',
        {},
      );
      toast.success('Schema migrations applied. Reloading…');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Apply failed.');
      setBusy(false);
    }
  }

  return (
    <Alert
      severity="warning"
      sx={{ borderRadius: 0, borderBottom: '1px solid', borderColor: 'warning.main' }}
      action={
        <Button
          color="warning"
          variant="contained"
          size="small"
          disabled={busy}
          onClick={() => void handleApply()}
          startIcon={busy ? <CircularProgress size={14} /> : undefined}
        >
          {busy ? 'Applying…' : 'Apply migrations'}
        </Button>
      }
    >
      <Stack direction="row" alignItems="center" spacing={1}>
        <strong>{state.pendingMigrations.length}</strong> schema migration
        {state.pendingMigrations.length === 1 ? '' : 's'} pending — apply now to unlock the latest
        features. (
        {state.pendingMigrations.slice(0, 3).join(', ')}
        {state.pendingMigrations.length > 3 ? `, +${state.pendingMigrations.length - 3} more` : ''})
      </Stack>
    </Alert>
  );
}
