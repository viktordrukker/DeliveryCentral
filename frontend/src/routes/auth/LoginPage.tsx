import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  TextField,
  Typography,
} from '@mui/material';

import { useAuth } from '@/app/auth-context';
import { getDashboardPath } from '@/app/role-routing';
import { httpGet } from '@/lib/api/http-client';
import { apiClientConfig } from '@/lib/api/config';

interface Providers {
  local: boolean;
  ldap: boolean;
  azureAd: boolean;
}

type LoginStep = 'credentials' | 'totp';

const DEMO_ACCOUNTS: ReadonlyArray<{ label: string; email: string; password: string; blurb: string }> = [
  { label: 'Director', email: 'daniel.cross@demo.local', password: 'DirectorPass1!', blurb: 'Portfolio health & finance' },
  { label: 'HR Manager', email: 'hannah.reyes@demo.local', password: 'HrManagerPass1!', blurb: 'People & org structure' },
  { label: 'Resource Manager', email: 'ravi.menon@demo.local', password: 'ResourceMgrPass1!', blurb: 'Staffing desk & bench' },
  { label: 'Project Manager', email: 'priya.shah@demo.local', password: 'ProjectMgrPass1!', blurb: 'Project delivery & demand' },
  { label: 'Delivery Manager', email: 'dana.whitfield@demo.local', password: 'DeliveryMgrPass1!', blurb: 'Conflicts & escalations' },
  { label: 'Employee', email: 'ethan.brooks@demo.local', password: 'EmployeePass1!', blurb: 'My time & assignments' },
];

export function LoginPage(): JSX.Element {
  const { login, completeTwoFactor, isAuthenticated, principal } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const demoMode = (import.meta.env.VITE_DEMO_MODE as string | undefined) === 'true';

  const [providers, setProviders] = useState<Providers>({ local: true, ldap: false, azureAd: false });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [step, setStep] = useState<LoginStep>('credentials');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(!demoMode);

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

  async function handleDemoLogin(creds: { email: string; password: string }): Promise<void> {
    setError('');
    setLoading(true);
    try {
      const outcome = await login(creds.email, creds.password);
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
            <Alert severity="error" role="alert" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {demoMode && step === 'credentials' && !showPasswordForm && (
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                Demo stand — pick a role to sign in instantly.
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {DEMO_ACCOUNTS.map((acct) => (
                  <Button
                    key={acct.email}
                    variant="outlined"
                    fullWidth
                    disabled={loading}
                    onClick={() => void handleDemoLogin(acct)}
                    data-testid={`demo-role-${acct.label.toLowerCase().replace(/\s+/g, '-')}`}
                    sx={{ justifyContent: 'flex-start', textTransform: 'none', py: 1 }}
                  >
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography variant="body2" fontWeight={600}>
                        {acct.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {acct.blurb}
                      </Typography>
                    </Box>
                  </Button>
                ))}
              </Box>
              <Box mt={2} textAlign="center">
                <Button variant="text" size="small" onClick={() => setShowPasswordForm(true)}>
                  Sign in with email &amp; password
                </Button>
              </Box>
            </Box>
          )}

          {step === 'credentials' && providers.azureAd && (!demoMode || showPasswordForm) && (
            <Box mb={providers.local || providers.ldap ? 2 : 0}>
              <Button
                variant="outlined"
                fullWidth
                href={`${apiClientConfig.baseUrl}/auth/oidc/login`}
                data-testid="sso-azuread-button"
              >
                Sign in with Microsoft
              </Button>
            </Box>
          )}

          {step === 'credentials' && providers.azureAd && (providers.local || providers.ldap) && (!demoMode || showPasswordForm) && (
            <Divider sx={{ mb: 2 }}>or</Divider>
          )}

          {step === 'credentials' && (providers.local || providers.ldap) && (!demoMode || showPasswordForm) && (
            <Box component="form" onSubmit={(e) => void handleLogin(e)}>
              {providers.ldap && !providers.local && (
                <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                  Use your corporate directory credentials.
                </Typography>
              )}
              <TextField
                label={providers.ldap && !providers.local ? 'Username' : 'Email'}
                type={providers.ldap && !providers.local ? 'text' : 'email'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                required
                autoComplete={providers.ldap && !providers.local ? 'username' : 'email'}
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
              {providers.local && (
                <Box mt={2} textAlign="center">
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => navigate('/forgot-password')}
                  >
                    Forgot password?
                  </Button>
                </Box>
              )}
              {demoMode && (
                <Box mt={1} textAlign="center">
                  <Button variant="text" size="small" onClick={() => setShowPasswordForm(false)}>
                    Back to demo roles
                  </Button>
                </Box>
              )}
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
