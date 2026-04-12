import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  TextField,
  Typography,
} from '@mui/material';

import { useAuth } from '@/app/auth-context';
import { getDashboardPath } from '@/app/role-routing';
import { httpGet } from '@/lib/api/http-client';

interface Providers {
  local: boolean;
  ldap: boolean;
  azureAd: boolean;
}

type LoginStep = 'credentials' | 'totp';

export function LoginPage(): JSX.Element {
  const { login, completeTwoFactor, isAuthenticated, principal } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [providers, setProviders] = useState<Providers>({ local: true, ldap: false, azureAd: false });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [step, setStep] = useState<LoginStep>('credentials');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && principal) {
      const from = (location.state as { from?: string } | null)?.from ?? getDashboardPath(principal.roles);
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, principal, navigate, location.state]);

  useEffect(() => {
    void httpGet<Providers>('/auth/providers')
      .then(setProviders)
      .catch(() => setProviders({ local: true, ldap: false, azureAd: false }));
  }, []);

  async function handleLogin(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const outcome = await login(email, password);

      if (outcome.status === 'requires_2fa') {
        setTempToken(outcome.tempToken);
        setStep('totp');
      } else if (outcome.status === 'error') {
        setError(outcome.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleTotp(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await completeTwoFactor(tempToken, totpCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid 2FA code.');
    } finally {
      setLoading(false);
    }
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
      <Card sx={{ width: '100%', maxWidth: 400 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" fontWeight={700} mb={0.5}>
            Delivery Central
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            {step === 'credentials' ? 'Sign in to your account' : 'Enter your 2FA code'}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {step === 'credentials' && providers.local && (
            <Box component="form" onSubmit={(e) => void handleLogin(e)}>
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                required
                autoComplete="email"
                sx={{ mb: 2 }}
              />
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                required
                autoComplete="current-password"
                sx={{ mb: 3 }}
              />
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
              <Box mt={2} textAlign="center">
                <Button
                  variant="text"
                  size="small"
                  onClick={() => navigate('/forgot-password')}
                >
                  Forgot password?
                </Button>
              </Box>
            </Box>
          )}

          {step === 'totp' && (
            <Box component="form" onSubmit={(e) => void handleTotp(e)}>
              <TextField
                label="6-digit code"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
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
                {loading ? 'Verifying…' : 'Verify'}
              </Button>
              <Box mt={2} textAlign="center">
                <Button variant="text" size="small" onClick={() => setStep('credentials')}>
                  Back
                </Button>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
