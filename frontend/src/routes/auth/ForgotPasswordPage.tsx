import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  TextField,
} from '@mui/material';

import { httpPost } from '@/lib/api/http-client';
import { AuthShell } from '@/components/layout/AuthShell';

export function ForgotPasswordPage(): JSX.Element {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLoading(true);

    try {
      await httpPost('/auth/password-reset/request', { email });
    } catch {
      // Ignore errors — no email enumeration
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  }

  return (
    <AuthShell
      title="Reset password"
      subtitle="Enter your email and we will send a reset link if the account exists."
    >
      {submitted ? (
        <>
          <Alert severity="success" sx={{ mb: 2 }}>
            If that email is registered, a reset link has been sent.
          </Alert>
          <Button variant="text" onClick={() => navigate('/login')}>
            Back to sign in
          </Button>
        </>
      ) : (
        <Box component="form" onSubmit={(e) => void handleSubmit(e)}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            required
            autoComplete="email"
            sx={{ mb: 3 }}
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </Button>
          <Box mt={2} textAlign="center">
            <Button variant="text" size="small" onClick={() => navigate('/login')}>
              Back to sign in
            </Button>
          </Box>
        </Box>
      )}
    </AuthShell>
  );
}
