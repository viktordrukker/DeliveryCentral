import { useState } from 'react';
import { Alert, Box, Button, FormControlLabel, Stack, Switch, TextField, Typography } from '@mui/material';

import type { IntegrationsInput } from '@/lib/api/setup';

interface Props {
  loading: boolean;
  error: string | null;
  onSave: (input: IntegrationsInput) => Promise<void>;
  onTestSmtp: (recipient: string) => Promise<{ ok: boolean; detail?: string }>;
  onSkip: () => void;
}

export function IntegrationsScreen({ loading, error, onSave, onTestSmtp, onSkip }: Props): JSX.Element {
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState<number | ''>(587);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [emailFromAddress, setEmailFromAddress] = useState('');
  const [corsOrigin, setCorsOrigin] = useState('');
  const [testRecipient, setTestRecipient] = useState('');
  const [testResult, setTestResult] = useState<{ ok: boolean; detail?: string } | null>(null);
  const [testBusy, setTestBusy] = useState(false);

  function buildInput(): IntegrationsInput {
    return {
      smtpHost: smtpHost.trim() || undefined,
      smtpPort: typeof smtpPort === 'number' ? smtpPort : undefined,
      smtpUser: smtpUser.trim() || undefined,
      smtpPassword: smtpPassword || undefined,
      smtpSecure,
      emailFromAddress: emailFromAddress.trim() || undefined,
      corsOrigin: corsOrigin.trim() || undefined,
    };
  }

  async function handleTest(): Promise<void> {
    if (!testRecipient.trim()) return;
    setTestBusy(true);
    setTestResult(null);
    try {
      const r = await onTestSmtp(testRecipient.trim());
      setTestResult(r);
    } catch (err) {
      setTestResult({ ok: false, detail: err instanceof Error ? err.message : String(err) });
    } finally {
      setTestBusy(false);
    }
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    void onSave(buildInput());
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography variant="h5" fontWeight={700} mb={1}>
        Integrations &amp; settings
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Configure SMTP for outbound notifications and the CORS origin. All fields are optional —
        you can defer email setup if your mail server isn&apos;t ready and configure it later
        from admin Settings.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Typography variant="subtitle1" fontWeight={600} mb={1}>
        SMTP (outbound email)
      </Typography>
      <Stack spacing={2} sx={{ mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField fullWidth label="Host" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} />
          <TextField
            label="Port"
            type="number"
            sx={{ width: { sm: 120 } }}
            value={smtpPort}
            onChange={(e) => setSmtpPort(e.target.value === '' ? '' : Number.parseInt(e.target.value, 10))}
          />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField fullWidth label="Username" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} />
          <TextField
            fullWidth
            type="password"
            label="Password"
            value={smtpPassword}
            onChange={(e) => setSmtpPassword(e.target.value)}
          />
        </Stack>
        <FormControlLabel
          control={<Switch checked={smtpSecure} onChange={(e) => setSmtpSecure(e.target.checked)} />}
          label="Secure connection (TLS)"
        />
        <TextField
          label="From-address"
          value={emailFromAddress}
          onChange={(e) => setEmailFromAddress(e.target.value)}
          helperText="The reply-to address on outbound notifications"
        />

        {/* Optional send test */}
        <Box sx={{ p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Optional: send a test email to verify SMTP reachability. You can skip this and proceed.
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <TextField
              size="small"
              fullWidth
              label="Recipient"
              type="email"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
            />
            <Button variant="outlined" disabled={testBusy || !testRecipient.trim()} onClick={() => void handleTest()}>
              Send test
            </Button>
          </Stack>
          {testResult && (
            <Alert severity={testResult.ok ? 'success' : 'warning'} sx={{ mt: 1 }}>
              {testResult.ok ? 'Test email accepted by SMTP.' : `Test failed: ${testResult.detail ?? 'unknown error'}`}
            </Alert>
          )}
        </Box>
      </Stack>

      <Typography variant="subtitle1" fontWeight={600} mb={1}>
        Frontend / API
      </Typography>
      <Stack spacing={2} sx={{ mb: 3 }}>
        <TextField
          label="CORS origin"
          value={corsOrigin}
          onChange={(e) => setCorsOrigin(e.target.value)}
          helperText="Comma-separated list of allowed origins"
          placeholder="https://app.example.com"
        />
      </Stack>

      <Stack direction="row" spacing={2}>
        <Button type="submit" variant="contained" size="large" disabled={loading}>
          Save and continue
        </Button>
        <Button type="button" variant="text" onClick={onSkip} disabled={loading}>
          Skip — configure later
        </Button>
      </Stack>
    </Box>
  );
}
