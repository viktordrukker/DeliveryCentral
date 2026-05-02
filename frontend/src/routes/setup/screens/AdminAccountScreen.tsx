import { useState } from 'react';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';

import type { AdminInput } from '@/lib/api/setup';

interface Props {
  loading: boolean;
  error: string | null;
  onSave: (input: AdminInput) => Promise<void>;
}

export function AdminAccountScreen({ loading, error, onSave }: Props): JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [displayName, setDisplayName] = useState('');

  const passwordValid = password.length >= 12;
  const passwordsMatch = password === confirm;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const valid = passwordValid && passwordsMatch && emailValid;

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    if (!valid) return;
    void onSave({ email: email.trim(), password, displayName: displayName.trim() || undefined });
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography variant="h5" fontWeight={700} mb={1}>
        Administrator account
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Create the superadmin account that will manage the platform. You can change the email or
        password later from admin Settings.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={2} sx={{ mb: 3 }}>
        <TextField
          required
          type="email"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={email.length > 0 && !emailValid}
          helperText={email.length > 0 && !emailValid ? 'Enter a valid email address' : ''}
        />
        <TextField
          label="Display name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          helperText="Shown in the UI; optional"
        />
        <TextField
          required
          type="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={password.length > 0 && !passwordValid}
          helperText={
            password.length === 0
              ? 'Minimum 12 characters'
              : !passwordValid
                ? `${12 - password.length} more character(s) needed`
                : 'Strong enough'
          }
        />
        <TextField
          required
          type="password"
          label="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={confirm.length > 0 && !passwordsMatch}
          helperText={confirm.length > 0 && !passwordsMatch ? 'Passwords do not match' : ''}
        />
      </Stack>

      <Button type="submit" variant="contained" size="large" disabled={!valid || loading}>
        Create admin account
      </Button>
    </Box>
  );
}
