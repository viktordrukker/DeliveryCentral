import { useState } from 'react';
import { Alert, Box, Button, Card, CardActionArea, CardContent, Chip, Stack, Typography } from '@mui/material';

import type { SeedProfile } from '@/lib/api/setup';

interface Props {
  loading: boolean;
  error: string | null;
  onPick: (profile: SeedProfile) => Promise<void>;
}

interface ProfileCard {
  key: SeedProfile;
  title: string;
  subtitle: string;
  body: string;
  badge: { label: string; color: 'default' | 'info' | 'success' | 'warning' };
}

const PROFILES: ProfileCard[] = [
  {
    key: 'demo',
    title: 'Demo',
    subtitle: 'Full IT-company scenario',
    body:
      'Loads a 200-person custom-software-development firm with 40 projects, 5-year history, RAG snapshots, and 8 role-test login accounts. Best for evaluating the platform.',
    badge: { label: 'For evaluation', color: 'info' },
  },
  {
    key: 'preset',
    title: 'Quick-start preset',
    subtitle: 'Infrastructure only — bring your own data',
    body:
      'Loads skills catalog, dictionaries, notification templates, radiator thresholds, and a default tenant. Skips people / projects / assignments — those are the operating data your tenant will populate. Recommended for real organisations.',
    badge: { label: 'Recommended', color: 'success' },
  },
  {
    key: 'clean',
    title: 'Full clean',
    subtitle: 'Admin + tenant only',
    body:
      'No catalogs, no templates, nothing pre-populated. Maximum control — every list starts empty. Choose this only if you have a complete migration plan from another system.',
    badge: { label: 'Advanced', color: 'warning' },
  },
];

export function SeedProfileScreen({ loading, error, onPick }: Props): JSX.Element {
  const [selected, setSelected] = useState<SeedProfile | null>('preset');

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={1}>
        Pick an install path
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Choose how to populate this database. You can re-run the wizard later from admin
        Settings → Setup if you need to change paths.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={2} sx={{ mb: 3 }}>
        {PROFILES.map((p) => (
          <Card
            key={p.key}
            variant="outlined"
            sx={{
              borderColor: selected === p.key ? 'primary.main' : 'divider',
              borderWidth: selected === p.key ? 2 : 1,
            }}
          >
            <CardActionArea onClick={() => setSelected(p.key)} disabled={loading}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                  <Typography variant="h6" fontWeight={700}>
                    {p.title}
                  </Typography>
                  <Chip size="small" label={p.badge.label} color={p.badge.color} />
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {p.subtitle}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {p.body}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Stack>

      <Button
        variant="contained"
        size="large"
        disabled={!selected || loading}
        onClick={() => selected && void onPick(selected)}
      >
        {loading ? 'Seeding…' : `Install with ${selected ?? '…'}`}
      </Button>
    </Box>
  );
}
