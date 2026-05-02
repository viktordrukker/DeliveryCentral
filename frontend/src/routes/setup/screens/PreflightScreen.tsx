import { Alert, Box, Button, Chip, CircularProgress, Stack, Typography } from '@mui/material';

import type { PreflightResult } from '@/lib/api/setup';

interface Props {
  result: PreflightResult | null;
  loading: boolean;
  error: string | null;
  onRunPreflight: () => Promise<void>;
  onCreateDatabase: () => Promise<void>;
  onContinue: () => void;
}

const BRANCH_LABELS: Record<PreflightResult['branch'], string> = {
  EMPTY_POSTGRES: 'Postgres cluster reachable, target database does not exist',
  EMPTY_DB: 'Target database exists, schema is empty',
  MIGRATIONS_OK: 'Schema is up to date',
  MIGRATIONS_BEHIND: 'Pending migrations detected',
  ORPHAN_TABLES: 'Tables present but no migration history',
  MIGRATIONS_AHEAD: 'Database is ahead of this app version',
};

export function PreflightScreen({
  result,
  loading,
  error,
  onRunPreflight,
  onCreateDatabase,
  onContinue,
}: Props): JSX.Element {
  if (!result) {
    return (
      <Box>
        <Typography variant="h5" fontWeight={700} mb={1}>
          Pre-flight check
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          The wizard inspects the database connection, schema state, and host facts before any
          changes are made. Click below to begin.
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Button variant="contained" size="large" disabled={loading} onClick={() => void onRunPreflight()}>
          {loading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
          Run pre-flight check
        </Button>
      </Box>
    );
  }

  const { branch, fingerprint, migrations, hostFacts } = result;
  const ready = branch === 'MIGRATIONS_OK' || branch === 'EMPTY_DB';

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={1}>
        Pre-flight check
      </Typography>
      <Chip
        label={BRANCH_LABELS[branch]}
        color={ready ? 'success' : branch === 'MIGRATIONS_AHEAD' || branch === 'ORPHAN_TABLES' ? 'warning' : 'info'}
        sx={{ mb: 2 }}
      />

      <Box
        sx={{
          mb: 2,
          p: 2,
          backgroundColor: 'background.default',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          fontSize: 13,
        }}
      >
        <Stack spacing={0.5}>
          <Box>
            <strong>Connection:</strong> {fingerprint.user}@{fingerprint.host}:{fingerprint.port}/
            {fingerprint.database}
          </Box>
          <Box>
            <strong>Server:</strong> Postgres {fingerprint.serverVersion ?? 'unknown'}
          </Box>
          <Box>
            <strong>Migrations:</strong> {migrations.inDb.length} applied / {migrations.onDisk.length} on disk
            {migrations.pending.length > 0 ? ` · ${migrations.pending.length} pending` : ''}
            {migrations.failed.length > 0 ? ` · ${migrations.failed.length} failed` : ''}
            {migrations.ahead.length > 0 ? ` · ${migrations.ahead.length} ahead of image` : ''}
          </Box>
          {hostFacts.diskFreeGb !== null && (
            <Box>
              <strong>Disk free:</strong> {hostFacts.diskFreeGb} GB
            </Box>
          )}
          {hostFacts.memTotalGb !== null && (
            <Box>
              <strong>Memory:</strong> {hostFacts.memTotalGb} GB total
            </Box>
          )}
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {branch === 'EMPTY_POSTGRES' && (
        <Alert severity="info" sx={{ mb: 2 }}>
          The target database <code>{fingerprint.database}</code> does not exist on the cluster.
          The wizard can create it (and the owning role) for you.
        </Alert>
      )}
      {branch === 'MIGRATIONS_BEHIND' && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {migrations.pending.length} migration(s) need to be applied before the app can start
          serving requests.
        </Alert>
      )}
      {branch === 'ORPHAN_TABLES' && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          The database has tables but no Prisma migration history. The wizard can attempt to
          baseline the existing schema, or wipe and recreate (next screen).
        </Alert>
      )}
      {branch === 'MIGRATIONS_AHEAD' && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          The database has been migrated to a newer version than this image knows about. Roll
          back or wipe + recreate options appear on the next screen.
        </Alert>
      )}

      <Stack direction="row" spacing={2}>
        {branch === 'EMPTY_POSTGRES' && (
          <Button variant="contained" disabled={loading} onClick={() => void onCreateDatabase()}>
            Create database + role
          </Button>
        )}
        {(branch === 'EMPTY_DB' ||
          branch === 'MIGRATIONS_OK' ||
          branch === 'MIGRATIONS_BEHIND' ||
          branch === 'ORPHAN_TABLES' ||
          branch === 'MIGRATIONS_AHEAD') && (
          <Button variant="contained" disabled={loading} onClick={onContinue}>
            Continue
          </Button>
        )}
        <Button variant="outlined" disabled={loading} onClick={() => void onRunPreflight()}>
          Re-run pre-flight
        </Button>
      </Stack>
    </Box>
  );
}
