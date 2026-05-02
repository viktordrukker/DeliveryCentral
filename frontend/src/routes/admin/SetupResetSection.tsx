import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { toast } from 'sonner';

import { httpPost } from '@/lib/api/http-client';
import { SectionCard } from '@/components/common/SectionCard';
import type { SeedProfile } from '@/lib/api/setup';

const RESET_LITERAL = 'RESET-DELIVERYCENTRAL';

/**
 * Admin Settings → "Setup" panel. Surfaces a Reset button that re-arms
 * the install wizard. Uses the same backend endpoint as the wizard's
 * Phase 3 reset handler. Typed-string confirm guards the destructive path.
 */
export function SetupResetSection(): JSX.Element {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<SeedProfile>('preset');
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);

  function close(): void {
    setOpen(false);
    setConfirmText('');
    setProfile('preset');
  }

  async function handleConfirm(): Promise<void> {
    if (confirmText !== RESET_LITERAL) return;
    setBusy(true);
    try {
      await httpPost<void, { confirm: string; profile: SeedProfile }>('/admin/setup/reset', {
        confirm: confirmText,
        profile,
      });
      toast.success('Setup wizard re-armed. Redirecting…');
      setTimeout(() => {
        window.location.replace('/setup');
      }, 1200);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reset failed.');
      setBusy(false);
      close();
    }
  }

  return (
    <SectionCard title="Setup &amp; install path">
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Re-run the install wizard against this database. Picking <strong>demo</strong> or{' '}
          <strong>clean</strong> wipes scenario data; <strong>preset</strong> only refreshes the
          infrastructure layer (skills, dictionaries, templates) without touching people / projects.
        </Typography>

        <Alert severity="warning" sx={{ mb: 2 }}>
          This is destructive. The Reset rotates a fresh setup token, logs all admins out, and
          funnels every request to <code>/setup</code> until the wizard completes again.
        </Alert>

        <Button variant="outlined" color="warning" onClick={() => setOpen(true)} disabled={busy}>
          Re-run setup wizard…
        </Button>
      </Box>

      <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
        <DialogTitle>Re-run setup wizard</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2">
              Choose the install path the wizard will offer when it reloads:
            </Typography>
            <FormControl size="small" fullWidth>
              <InputLabel id="reset-profile-label">Profile</InputLabel>
              <Select
                labelId="reset-profile-label"
                label="Profile"
                value={profile}
                onChange={(e) => setProfile(e.target.value as SeedProfile)}
                disabled={busy}
              >
                <MenuItem value="preset">preset (infrastructure-only, preserves data)</MenuItem>
                <MenuItem value="demo">demo (loads IT-company scenario, wipes existing data)</MenuItem>
                <MenuItem value="clean">clean (admin only, wipes existing data)</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="body2">
              Type the literal <code>{RESET_LITERAL}</code> to confirm:
            </Typography>
            <TextField
              size="small"
              autoFocus
              fullWidth
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={RESET_LITERAL}
              disabled={busy}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleConfirm()}
            color="warning"
            variant="contained"
            disabled={busy || confirmText !== RESET_LITERAL}
          >
            {busy ? 'Resetting…' : 'Re-arm wizard'}
          </Button>
        </DialogActions>
      </Dialog>
    </SectionCard>
  );
}
