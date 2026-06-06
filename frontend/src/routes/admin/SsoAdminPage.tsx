import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ds';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { isFeatureEnabled } from '@/lib/feature-flags';
import {
  SsoConfig,
  SsoProvider,
  SsoTestResult,
  SsoUpdateRequest,
  fetchSsoConfig,
  testSsoConnection,
  updateSsoConfig,
} from '@/lib/api/sso-admin';

interface ProviderPreset {
  value: SsoProvider;
  label: string;
  hint: string;
  discoveryHint: string;
}

const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    value: 'google',
    label: 'Google Workspace',
    hint: 'Configure via Google Cloud Console → APIs & Services → Credentials.',
    discoveryHint: 'https://accounts.google.com/.well-known/openid-configuration',
  },
  {
    value: 'azure_ad',
    label: 'Azure AD / Microsoft Entra ID',
    hint: 'Register a confidential client in Entra ID and copy the Application (client) ID.',
    discoveryHint: 'https://login.microsoftonline.com/<tenant-id>/v2.0/.well-known/openid-configuration',
  },
  {
    value: 'okta',
    label: 'Okta',
    hint: 'Add a new OIDC Web Application in Okta and reuse the Client ID + Secret here.',
    discoveryHint: 'https://<your-org>.okta.com/.well-known/openid-configuration',
  },
  {
    value: 'oidc',
    label: 'Generic OIDC',
    hint: 'Any IdP exposing a standard /.well-known/openid-configuration document.',
    discoveryHint: 'https://idp.example.com/.well-known/openid-configuration',
  },
];

function statusFor(cfg: SsoConfig): {
  tone: 'active' | 'warning' | 'danger' | 'neutral';
  label: string;
} {
  if (!cfg.clientId || !cfg.discoveryUrl) {
    return { tone: 'danger', label: 'Not configured' };
  }
  if (!cfg.clientSecretSet) {
    return { tone: 'warning', label: 'Missing client secret' };
  }
  return { tone: 'active', label: 'Configured' };
}

export function SsoAdminPage(): JSX.Element {
  const dsRefreshEnabled = isFeatureEnabled('dsRefresh');
  const [config, setConfig] = useState<SsoConfig | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form state — separate from `config` so unsaved edits don't bleed.
  const [provider, setProvider] = useState<SsoProvider>('oidc');
  const [clientId, setClientId] = useState('');
  const [discoveryUrl, setDiscoveryUrl] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [autoProvisionUsers, setAutoProvisionUsers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<SsoTestResult | null>(null);

  useEffect(() => {
    let active = true;
    fetchSsoConfig()
      .then((cfg) => {
        if (!active) return;
        setConfig(cfg);
        setProvider(cfg.provider);
        setClientId(cfg.clientId);
        setDiscoveryUrl(cfg.discoveryUrl);
        setAutoProvisionUsers(cfg.autoProvisionUsers);
      })
      .catch((err: Error) => {
        if (!active) return;
        setLoadError(err.message);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSave(): Promise<void> {
    setSaving(true);
    const body: SsoUpdateRequest = {
      provider,
      clientId,
      discoveryUrl,
      autoProvisionUsers,
    };
    if (clientSecret.length > 0) {
      body.clientSecret = clientSecret;
    }
    try {
      const next = await updateSsoConfig(body);
      setConfig(next);
      setClientSecret('');
      toast.success('SSO configuration saved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest(): Promise<void> {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testSsoConnection();
      setTestResult(result);
      if (result.ok) {
        toast.success('Discovery document is valid.');
      } else {
        toast.error(result.error ?? 'Test failed.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Test failed.';
      setTestResult({ ok: false, error: message });
      toast.error(message);
    } finally {
      setTesting(false);
    }
  }

  if (!config && !loadError) {
    return (
      <PageContainer testId="sso-admin-page" viewport>
        <PageHeader eyebrow="Admin" subtitle="Configure your OIDC identity provider." title="SSO Configuration" />
        <LoadingState label="Loading SSO configuration..." variant="skeleton" skeletonType="page" />
      </PageContainer>
    );
  }

  if (loadError && !config) {
    return (
      <PageContainer testId="sso-admin-page" viewport>
        <PageHeader eyebrow="Admin" subtitle="Configure your OIDC identity provider." title="SSO Configuration" />
        <ErrorState
          description={loadError}
          onRetry={() => window.location.reload()}
        />
      </PageContainer>
    );
  }

  const status = config ? statusFor(config) : { tone: 'neutral' as const, label: 'Unknown' };
  const selectedPreset = PROVIDER_PRESETS.find((p) => p.value === provider) ?? PROVIDER_PRESETS[3];

  const header = dsRefreshEnabled ? (
    <PageHeader
      actions={
        <Button as={Link} variant="secondary" to="/admin/integrations/registry">
          Back to integrations
        </Button>
      }
      eyebrow="Admin"
      subtitle="Configure single sign-on (OIDC) provider, client credentials, and auto-provisioning. Bank ops self-serve — no backend access required."
      title="SSO Configuration"
    />
  ) : (
    <PageHeader
      actions={
        <Button as={Link} variant="secondary" to="/admin">
          Back to admin panel
        </Button>
      }
      eyebrow="Admin"
      subtitle="Configure single sign-on (OIDC) provider, client credentials, and auto-provisioning."
      title="SSO Configuration"
    />
  );

  return (
    <PageContainer testId="sso-admin-page" viewport>
      {header}

      <SectionCard title="Current status">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            padding: 'var(--space-2)',
          }}
          data-testid="sso-status-row"
        >
          <StatusBadge label={status.label} tone={status.tone} variant="chip" />
          <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
            Provider:{' '}
            <strong style={{ color: 'var(--color-text)' }}>
              {PROVIDER_PRESETS.find((p) => p.value === config?.provider)?.label ?? config?.provider ?? '—'}
            </strong>
            {' · '}Client ID: <code>{config?.clientId || '—'}</code>
            {' · '}Auto-provision:{' '}
            <strong style={{ color: 'var(--color-text)' }}>
              {config?.autoProvisionUsers ? 'on' : 'off'}
            </strong>
          </span>
        </div>
      </SectionCard>

      <SectionCard title="Provider configuration">
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
            maxWidth: 640,
          }}
        >
          <label className="field">
            <span className="field__label">Provider</span>
            <select
              className="field__control"
              data-testid="sso-provider-select"
              onChange={(e) => setProvider(e.target.value as SsoProvider)}
              value={provider}
            >
              {PROVIDER_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <span
              style={{
                fontSize: 11,
                color: 'var(--color-text-muted)',
                marginTop: 'var(--space-1)',
              }}
            >
              {selectedPreset.hint}
            </span>
          </label>

          <label className="field">
            <span className="field__label">Client ID</span>
            <input
              className="field__control"
              data-testid="sso-client-id-input"
              onChange={(e) => setClientId(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
              type="text"
              value={clientId}
            />
          </label>

          <label className="field">
            <span className="field__label">Discovery URL</span>
            <input
              className="field__control"
              data-testid="sso-discovery-url-input"
              onChange={(e) => setDiscoveryUrl(e.target.value)}
              placeholder={selectedPreset.discoveryHint}
              type="url"
              value={discoveryUrl}
            />
          </label>

          <label className="field">
            <span className="field__label">
              Client Secret{' '}
              {config?.clientSecretSet ? (
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                  (stored — leave blank to keep)
                </span>
              ) : null}
            </span>
            <input
              className="field__control"
              data-testid="sso-client-secret-input"
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder={config?.clientSecretSet ? '••••••••' : 'paste the IdP client secret'}
              type="password"
              value={clientSecret}
            />
          </label>

          <label
            className="field"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 'var(--space-2)' }}
          >
            <input
              checked={autoProvisionUsers}
              data-testid="sso-auto-provision-toggle"
              onChange={(e) => setAutoProvisionUsers(e.target.checked)}
              type="checkbox"
            />
            <span className="field__label" style={{ margin: 0 }}>
              Auto-provision users on first sign-in
            </span>
          </label>

          <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
            <Button
              data-testid="sso-save-button"
              disabled={saving}
              onClick={() => void handleSave()}
              type="button"
              variant="primary"
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button
              data-testid="sso-test-button"
              disabled={testing || !config?.discoveryUrl}
              onClick={() => void handleTest()}
              type="button"
              variant="secondary"
            >
              {testing ? 'Testing…' : 'Test connection'}
            </Button>
          </div>

          {testResult ? (
            <div
              data-testid="sso-test-result"
              style={{
                borderRadius: 6,
                border: `1px solid ${
                  testResult.ok ? 'var(--color-status-active)' : 'var(--color-status-danger)'
                }`,
                padding: 'var(--space-2)',
                background: 'var(--color-surface-alt)',
                fontSize: 12,
                color: 'var(--color-text)',
              }}
            >
              {testResult.ok ? (
                <div>
                  <strong>Discovery OK.</strong>
                  <ul style={{ margin: 'var(--space-1) 0 0', paddingLeft: 'var(--space-4)' }}>
                    <li>Issuer: <code>{testResult.issuer}</code></li>
                    <li>Authorization endpoint: <code>{testResult.authorizationEndpoint}</code></li>
                    <li>Token endpoint: <code>{testResult.tokenEndpoint}</code></li>
                  </ul>
                </div>
              ) : (
                <div>
                  <strong style={{ color: 'var(--color-status-danger)' }}>Test failed.</strong>{' '}
                  {testResult.error}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </SectionCard>
    </PageContainer>
  );
}
