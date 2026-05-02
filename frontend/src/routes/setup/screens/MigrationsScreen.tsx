import { useState } from 'react';
import { Alert, Box, Button, CircularProgress, List, ListItem, ListItemText, Stack, TextField, Typography } from '@mui/material';

import type { PreflightResult } from '@/lib/api/setup';

interface Props {
  result: PreflightResult | null;
  loading: boolean;
  error: string | null;
  onApply: (options?: { wipeFirst?: boolean }) => Promise<void>;
}

export function MigrationsScreen({ result, loading, error, onApply }: Props): JSX.Element {
  const [confirmText, setConfirmText] = useState('');
  const dbName = result?.fingerprint.database ?? '';
  const wipeConfirmed = confirmText === `WIPE-DATABASE-${dbName}`;

  const showWipe = result?.branch === 'ORPHAN_TABLES' || result?.branch === 'MIGRATIONS_AHEAD';

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={1}>
        Apply schema migrations
      </Typography>

      {result && result.migrations.pending.length > 0 && (
        <>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {result.migrations.pending.length} migration(s) pending. The wizard auto-resolves
            any previously failed migrations, then runs <code>prisma migrate deploy</code>, then
            re-validates the schema diff. If the diff is non-empty after, it&apos;s applied
            automatically (and surfaced if it fails).
          </Typography>
          <List dense sx={{ mb: 2, fontFamily: 'monospace', fontSize: 12, backgroundColor: 'background.default', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
            {result.migrations.pending.map((m) => (
              <ListItem key={m} sx={{ py: 0 }}>
                <ListItemText primary={m} primaryTypographyProps={{ fontFamily: 'monospace', fontSize: 12 }} />
              </ListItem>
            ))}
          </List>
        </>
      )}

      {result && result.migrations.failed.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {result.migrations.failed.length} migration(s) failed mid-run on a previous attempt.
          The wizard will mark them rolled-back and retry.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack direction="row" spacing={2} sx={{ mb: showWipe ? 4 : 0 }}>
        <Button variant="contained" disabled={loading} onClick={() => void onApply()}>
          {loading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
          Apply migrations
        </Button>
      </Stack>

      {showWipe && (
        <Box sx={{ mt: 4, p: 2, border: '1px dashed', borderColor: 'warning.main', borderRadius: 1 }}>
          <Typography variant="subtitle2" mb={1}>
            Recovery: wipe and recreate
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            The schema diff against this image cannot be reconciled. The fallback is to drop and
            recreate the <code>public</code> schema, then run all migrations from empty. Type{' '}
            <code>WIPE-DATABASE-{dbName}</code> to confirm — the database is named{' '}
            <code>{dbName}</code>.
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder={`WIPE-DATABASE-${dbName}`}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Button
            variant="outlined"
            color="warning"
            disabled={loading || !wipeConfirmed}
            onClick={() => void onApply({ wipeFirst: true })}
          >
            Wipe + recreate schema
          </Button>
        </Box>
      )}
    </Box>
  );
}
