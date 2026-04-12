import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  LinearProgress,
  TextField,
  Typography,
} from '@mui/material';

import { httpPost } from '@/lib/api/http-client';

function passwordStrength(pw: string): { score: number; label: string; color: 'error' | 'warning' | 'success' } {
  let score = 0;

  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 2) return { score: (score / 5) * 100, label: 'Weak', color: 'error' };
  if (score <= 3) return { score: (score / 5) * 100, label: 'Fair', color: 'warning' };

  return { score: (score / 5) * 100, label: 'Strong', color: 'success' };
}

export function ResetPasswordPage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const strength = passwordStrength(newPassword);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError('');

    if (newPassword !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    if (!token) {
      setError('Invalid or missing reset token.');
      return;
    }

    setLoading(true);

    try {
      await httpPost('/auth/password-reset/confirm', { token, newPassword });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password.');
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
            Set new password
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Choose a strong password for your account.
          </Typography>

          {done ? (
            <>
              <Alert severity="success" sx={{ mb: 2 }}>
                Password updated. You can now sign in.
              </Alert>
              <Button variant="contained" fullWidth onClick={() => navigate('/login')}>
                Sign in
              </Button>
            </>
          ) : (
            <Box component="form" onSubmit={(e) => void handleSubmit(e)}>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              <TextField
                label="New password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                fullWidth
                required
                autoComplete="new-password"
                sx={{ mb: 1 }}
              />
              {newPassword && (
                <Box mb={2}>
                  <LinearProgress
                    variant="determinate"
                    value={strength.score}
                    color={strength.color}
                    sx={{ borderRadius: 4, height: 6 }}
                  />
                  <Typography variant="caption" color={`${strength.color}.main`}>
                    {strength.label}
                  </Typography>
                </Box>
              )}
              <TextField
                label="Confirm password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                fullWidth
                required
                autoComplete="new-password"
                sx={{ mb: 3 }}
              />
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
              >
                {loading ? 'Updating…' : 'Update password'}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
