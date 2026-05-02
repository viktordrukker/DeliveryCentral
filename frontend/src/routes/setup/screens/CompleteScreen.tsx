import { Alert, Box, Button, Stack, Typography } from '@mui/material';

interface Props {
  loading: boolean;
  error: string | null;
  onFinish: () => Promise<void>;
}

export function CompleteScreen({ loading, error, onFinish }: Props): JSX.Element {
  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={1}>
        Almost done
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        The wizard has applied your configuration. Click below to finalise the install — that
        invalidates the setup token, marks the platform as ready, and bounces you to the login
        page.
      </Typography>

      <Box
        sx={{
          mb: 3,
          p: 2,
          backgroundColor: 'background.default',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
        }}
      >
        <Typography variant="subtitle2" mb={1}>
          Recommended next steps
        </Typography>
        <Stack component="ul" spacing={0.5} sx={{ pl: 2, m: 0 }}>
          <li>
            <Typography variant="body2">
              <strong>Set up backups</strong> — see <code>ops/backup.sh</code> + offsite (S3) before
              going to production.
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Enable 2FA</strong> for the admin account at <code>/auth/2fa-setup</code> after
              login.
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Verify your monitoring forwarder</strong> is receiving structured logs (visit
              admin Settings → Monitoring).
            </Typography>
          </li>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Button variant="contained" size="large" disabled={loading} onClick={() => void onFinish()}>
        Finish setup &amp; go to login
      </Button>
    </Box>
  );
}
