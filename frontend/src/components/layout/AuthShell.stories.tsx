import type { Story } from '@ladle/react';
import { useState } from 'react';
import { Alert, Box, Button, TextField } from '@mui/material';

import { AuthShell } from './AuthShell';

export default { title: 'DS / Layout / AuthShell' };

export const Login: Story = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return (
    <AuthShell title="Sign in" subtitle="Welcome back to DeliveryCentral.">
      <Box component="form" onSubmit={(e) => e.preventDefault()}>
        <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth required sx={{ mb: 2 }} />
        <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth required sx={{ mb: 3 }} />
        <Button type="submit" variant="contained" fullWidth>Sign in</Button>
        <Box mt={2} textAlign="center">
          <Button variant="text" size="small">Forgot password?</Button>
        </Box>
      </Box>
    </AuthShell>
  );
};

export const ForgotPassword: Story = () => {
  const [email, setEmail] = useState('');
  return (
    <AuthShell title="Reset password" subtitle="Enter your email and we will send a reset link.">
      <Box component="form" onSubmit={(e) => e.preventDefault()}>
        <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth required sx={{ mb: 3 }} />
        <Button type="submit" variant="contained" fullWidth>Send reset link</Button>
      </Box>
    </AuthShell>
  );
};

export const Submitted: Story = () => (
  <AuthShell title="Reset password">
    <Alert severity="success" sx={{ mb: 2 }}>
      If that email is registered, a reset link has been sent.
    </Alert>
    <Button variant="text">Back to sign in</Button>
  </AuthShell>
);

export const NoTitle: Story = () => (
  <AuthShell>
    <Box component="form" onSubmit={(e) => e.preventDefault()}>
      <TextField label="Email" type="email" fullWidth required sx={{ mb: 3 }} />
      <Button type="submit" variant="contained" fullWidth>Continue</Button>
    </Box>
  </AuthShell>
);
