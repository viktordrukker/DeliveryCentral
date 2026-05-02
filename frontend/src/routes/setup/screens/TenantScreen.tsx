import { useState } from 'react';
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';

import type { TenantInput } from '@/lib/api/setup';

interface Props {
  loading: boolean;
  error: string | null;
  onSave: (input: TenantInput) => Promise<void>;
}

const TIMEZONES = ['UTC', 'Australia/Brisbane', 'Australia/Sydney', 'Europe/London', 'America/New_York', 'Asia/Singapore'];
const CURRENCIES = ['AUD', 'USD', 'GBP', 'EUR', 'NZD', 'SGD', 'JPY'];
const LOCALES = ['en-AU', 'en-GB', 'en-US', 'en-NZ'];

export function TenantScreen({ loading, error, onSave }: Props): JSX.Element {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [locale, setLocale] = useState('en-AU');
  const [currency, setCurrency] = useState('AUD');

  const valid = code.trim().length >= 2 && name.trim().length >= 2;

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    if (!valid) return;
    void onSave({ code: code.trim(), name: name.trim(), timezone, locale, currency });
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography variant="h5" fontWeight={700} mb={1}>
        Default tenant
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        DeliveryCentral is multi-tenant under the hood; every install needs at least the default
        tenant configured. You can add more tenants later from admin Settings.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={2} sx={{ mb: 3 }}>
        <TextField
          required
          label="Tenant code"
          helperText="Short identifier, used internally (e.g. ITCO)"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          inputProps={{ maxLength: 32 }}
        />
        <TextField
          required
          label="Tenant name"
          helperText="The organisation's display name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          inputProps={{ maxLength: 128 }}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField select fullWidth label="Timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {TIMEZONES.map((tz) => (
              <MenuItem key={tz} value={tz}>
                {tz}
              </MenuItem>
            ))}
          </TextField>
          <TextField select fullWidth label="Locale" value={locale} onChange={(e) => setLocale(e.target.value)}>
            {LOCALES.map((l) => (
              <MenuItem key={l} value={l}>
                {l}
              </MenuItem>
            ))}
          </TextField>
          <TextField select fullWidth label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {CURRENCIES.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Stack>

      <Button type="submit" variant="contained" size="large" disabled={!valid || loading}>
        Save tenant
      </Button>
    </Box>
  );
}
