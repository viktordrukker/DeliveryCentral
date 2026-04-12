import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  TextField,
  Typography,
} from '@mui/material';

import { useAuth } from '@/app/auth-context';
import { getDashboardPath } from '@/app/role-routing';
import { httpPost } from '@/lib/api/http-client';

interface SetupData {
  qrCodeDataUri: string;
  backupCodes: string[];
}

type SetupStep = 'start' | 'qr' | 'verify' | 'backup';

export function TwoFactorSetupPage(): JSX.Element {
  const { principal } = useAuth();
  const navigate = useNavigate();

  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [step, setStep] = useState<SetupStep>('start');
  const [code, setCode] = useState('');
  const [savedBackup, setSavedBackup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleStartSetup(): Promise<void> {
    setError('');
    setLoading(true);
    try {
      const data = await httpPost<SetupData, Record<string, never>>('/auth/2fa/setup', {});
      setSetupData(data);
      setStep('qr');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start 2FA setup.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await httpPost('/auth/2fa/verify', { code });
      setStep('backup');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code.');
    } finally {
      setLoading(false);
    }
  }

  function handleDone(): void {
    const path = getDashboardPath(principal?.roles ?? []);
    navigate(path, { replace: true });
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'background.default',
        p: 2,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 440 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" fontWeight={700} mb={0.5}>
            Set up two-factor authentication
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {step === 'start' && (
            <>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Two-factor authentication adds an extra layer of security to your account. You will
                need an authenticator app such as Google Authenticator or Authy.
              </Typography>
              <Button
                variant="contained"
                fullWidth
                disabled={loading}
                onClick={() => void handleStartSetup()}
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
              >
                {loading ? 'Starting…' : 'Start Setup'}
              </Button>
            </>
          )}

          {step === 'qr' && (
            <>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.).
              </Typography>
              {setupData ? (
                <Box textAlign="center" mb={3}>
                  <img src={setupData.qrCodeDataUri} alt="2FA QR code" width={200} height={200} />
                </Box>
              ) : (
                <Box textAlign="center" mb={3}>
                  <CircularProgress />
                </Box>
              )}
              <Button
                variant="contained"
                fullWidth
                disabled={!setupData}
                onClick={() => setStep('verify')}
              >
                Next
              </Button>
            </>
          )}

          {step === 'verify' && (
            <Box component="form" onSubmit={(e) => void handleVerify(e)}>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Enter the 6-digit code from your authenticator app to confirm setup.
              </Typography>
              <TextField
                label="6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                fullWidth
                required
                inputProps={{ maxLength: 6, inputMode: 'numeric' }}
                sx={{ mb: 3 }}
                autoFocus
              />
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
              >
                {loading ? 'Verifying…' : 'Confirm'}
              </Button>
            </Box>
          )}

          {step === 'backup' && setupData && (
            <>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Save these backup codes. Each can only be used once.
              </Alert>
              <Box
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  backgroundColor: 'background.default',
                  p: 2,
                  borderRadius: 1,
                  mb: 2,
                }}
              >
                {setupData.backupCodes.map((c) => (
                  <div key={c}>{c}</div>
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    void navigator.clipboard.writeText(setupData.backupCodes.join('\n'));
                  }}
                >
                  Copy all codes
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => window.print()}
                >
                  Print
                </Button>
              </Box>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={savedBackup}
                    onChange={(e) => setSavedBackup(e.target.checked)}
                  />
                }
                label="I have saved my backup codes"
                sx={{ mb: 2 }}
              />
              <Button
                variant="contained"
                fullWidth
                disabled={!savedBackup}
                onClick={handleDone}
              >
                Done
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
