import { useState } from 'react';
import { Alert, Box, Button, TextField, Typography } from '@mui/material';

interface Props {
  onSubmit: (token: string) => void;
  loading: boolean;
  error: string | null;
}

export function TokenPromptScreen({ onSubmit, loading, error }: Props): JSX.Element {
  const [value, setValue] = useState('');

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    if (value.trim().length === 0) return;
    onSubmit(value.trim());
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography variant="h5" fontWeight={700} mb={1}>
        Welcome to DeliveryCentral
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        This deployment hasn&apos;t been set up yet. To start the install wizard, paste the
        one-time setup token from the backend container logs.
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
        <Typography variant="caption" color="text.secondary">
          Where to find the token:
        </Typography>
        <Box component="pre" sx={{ m: 0, mt: 1, fontSize: 12, fontFamily: 'monospace' }}>
          docker logs dc-prod-backend-1 | grep SETUP_TOKEN
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TextField
        fullWidth
        autoFocus
        label="Setup token"
        placeholder="64-character hex string"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={loading}
        sx={{ mb: 2 }}
      />

      <Button
        type="submit"
        variant="contained"
        fullWidth
        size="large"
        disabled={loading || value.trim().length === 0}
      >
        Continue
      </Button>
    </Box>
  );
}
