import { useState } from 'react';
import { Alert, Box, Button, FormControlLabel, Stack, Switch, TextField, Typography } from '@mui/material';

import type { MonitoringInput } from '@/lib/api/setup';

interface Props {
  loading: boolean;
  error: string | null;
  onSave: (input: MonitoringInput) => Promise<void>;
  onSkip: () => void;
}

export function MonitoringScreen({ loading, error, onSave, onSkip }: Props): JSX.Element {
  const [otlpEnabled, setOtlpEnabled] = useState(false);
  const [otlpEndpoint, setOtlpEndpoint] = useState('');
  const [otlpHeaders, setOtlpHeaders] = useState('');

  const [splunkEnabled, setSplunkEnabled] = useState(false);
  const [splunkHec, setSplunkHec] = useState('');
  const [splunkToken, setSplunkToken] = useState('');

  const [datadogEnabled, setDatadogEnabled] = useState(false);
  const [datadogKey, setDatadogKey] = useState('');
  const [datadogRegion, setDatadogRegion] = useState('US1');

  const [syslogEnabled, setSyslogEnabled] = useState(false);
  const [syslogHost, setSyslogHost] = useState('');
  const [syslogPort, setSyslogPort] = useState<number | ''>(514);

  function buildInput(): MonitoringInput {
    return {
      otlp: { enabled: otlpEnabled, endpoint: otlpEndpoint, headers: otlpHeaders },
      splunk: { enabled: splunkEnabled, hecUrl: splunkHec, token: splunkToken },
      datadog: { enabled: datadogEnabled, apiKey: datadogKey, region: datadogRegion },
      syslog: {
        enabled: syslogEnabled,
        host: syslogHost,
        port: typeof syslogPort === 'number' ? syslogPort : undefined,
      },
    };
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    void onSave(buildInput());
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography variant="h5" fontWeight={700} mb={1}>
        Monitoring forwarders
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Configure where structured logs and traces should ship. All providers are optional — you
        can wire them up later. Endpoints + tokens are stored in platform settings; the actual
        log shipper config snippet is downloadable on the next screen.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Section
        title="OpenTelemetry (OTLP HTTP)"
        enabled={otlpEnabled}
        onToggle={setOtlpEnabled}
      >
        <TextField
          fullWidth
          label="OTLP endpoint"
          placeholder="https://collector.example.com:4318"
          value={otlpEndpoint}
          onChange={(e) => setOtlpEndpoint(e.target.value)}
          disabled={!otlpEnabled}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label="Headers"
          placeholder="Authorization=Bearer …,X-Tenant=foo"
          value={otlpHeaders}
          onChange={(e) => setOtlpHeaders(e.target.value)}
          disabled={!otlpEnabled}
          helperText="Comma-separated key=value pairs"
        />
      </Section>

      <Section title="Splunk HEC" enabled={splunkEnabled} onToggle={setSplunkEnabled}>
        <TextField
          fullWidth
          label="HEC URL"
          placeholder="https://splunk.example.com:8088/services/collector"
          value={splunkHec}
          onChange={(e) => setSplunkHec(e.target.value)}
          disabled={!splunkEnabled}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          type="password"
          label="Token"
          value={splunkToken}
          onChange={(e) => setSplunkToken(e.target.value)}
          disabled={!splunkEnabled}
        />
      </Section>

      <Section title="Datadog" enabled={datadogEnabled} onToggle={setDatadogEnabled}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            fullWidth
            type="password"
            label="API key"
            value={datadogKey}
            onChange={(e) => setDatadogKey(e.target.value)}
            disabled={!datadogEnabled}
          />
          <TextField
            label="Region"
            select
            sx={{ width: { sm: 140 } }}
            value={datadogRegion}
            onChange={(e) => setDatadogRegion(e.target.value)}
            disabled={!datadogEnabled}
            SelectProps={{ native: true }}
          >
            <option>US1</option>
            <option>US3</option>
            <option>US5</option>
            <option>EU1</option>
            <option>AP1</option>
          </TextField>
        </Stack>
      </Section>

      <Section title="Syslog (TCP/UDP)" enabled={syslogEnabled} onToggle={setSyslogEnabled}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            fullWidth
            label="Host"
            value={syslogHost}
            onChange={(e) => setSyslogHost(e.target.value)}
            disabled={!syslogEnabled}
          />
          <TextField
            label="Port"
            type="number"
            sx={{ width: { sm: 120 } }}
            value={syslogPort}
            onChange={(e) => setSyslogPort(e.target.value === '' ? '' : Number.parseInt(e.target.value, 10))}
            disabled={!syslogEnabled}
          />
        </Stack>
      </Section>

      <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
        <Button type="submit" variant="contained" size="large" disabled={loading}>
          Save and continue
        </Button>
        <Button type="button" variant="text" onClick={onSkip} disabled={loading}>
          Skip — configure later
        </Button>
      </Stack>
    </Box>
  );
}

interface SectionProps {
  title: string;
  enabled: boolean;
  onToggle: (next: boolean) => void;
  children: React.ReactNode;
}

function Section({ title, enabled, onToggle, children }: SectionProps): JSX.Element {
  return (
    <Box sx={{ mb: 2, p: 2, backgroundColor: 'background.default', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
      <FormControlLabel
        control={<Switch checked={enabled} onChange={(e) => onToggle(e.target.checked)} />}
        label={<Typography variant="subtitle1" fontWeight={600}>{title}</Typography>}
        sx={{ mb: 1 }}
      />
      {children}
    </Box>
  );
}
