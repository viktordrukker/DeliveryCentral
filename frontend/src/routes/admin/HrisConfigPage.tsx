import { useEffect, useState } from 'react';

import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { HrisConfig, HrisSyncResult, fetchHrisConfig, updateHrisConfig, triggerHrisSync } from '@/lib/api/hris';

export function HrisConfigPage(): JSX.Element {
  const [config, setConfig] = useState<HrisConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<HrisSyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchHrisConfig()
      .then(setConfig)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load HRIS config.'));
  }, []);

  async function handleSave(): Promise<void> {
    if (!config) return;
    setSaving(true);
    try {
      const updated = await updateHrisConfig(config);
      setConfig(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save config.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSync(): Promise<void> {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await triggerHrisSync();
      setSyncResult(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed.');
    } finally {
      setSyncing(false);
    }
  }

  if (!config) {
    return (
      <PageContainer viewport>
        <PageHeader eyebrow="Admin" title="HRIS Integration" subtitle="Configure BambooHR or Workday integration." />
        {error ? <p style={{ color: 'var(--color-status-danger)' }}>{error}</p> : <p>Loading…</p>}
      </PageContainer>
    );
  }

  return (
    <PageContainer viewport>
      <PageHeader
        eyebrow="Admin"
        subtitle="Configure your HRIS provider (BambooHR or Workday) to sync employee data into DeliveryCentral."
        title="HRIS Integration"
      />

      {error ? (
        <div style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-status-danger)', borderRadius: 6, padding: '0.75rem', marginBottom: '1rem', color: 'var(--color-danger)', fontSize: '0.875rem' }}>
          {error}
        </div>
      ) : null}

      <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label className="field">
          <span className="field__label">Active Adapter</span>
          <select
            className="field__control"
            onChange={(e) => setConfig((c) => c ? { ...c, activeAdapter: e.target.value as HrisConfig['activeAdapter'] } : c)}
            value={config.activeAdapter}
          >
            <option value="none">None (disabled)</option>
            <option value="bamboohr">BambooHR</option>
            <option value="workday">Workday</option>
          </select>
        </label>

        {config.activeAdapter === 'bamboohr' ? (
          <div style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700 }}>BambooHR Settings</h3>
            <label className="field">
              <span className="field__label">API Key</span>
              <input
                className="field__control"
                onChange={(e) => setConfig((c) => c ? { ...c, bamboohr: { ...c.bamboohr, apiKey: e.target.value } } : c)}
                placeholder="your-bamboohr-api-key"
                type="password"
                value={config.bamboohr.apiKey}
              />
            </label>
            <label className="field">
              <span className="field__label">Subdomain</span>
              <input
                className="field__control"
                onChange={(e) => setConfig((c) => c ? { ...c, bamboohr: { ...c.bamboohr, subdomain: e.target.value } } : c)}
                placeholder="yourcompany"
                type="text"
                value={config.bamboohr.subdomain}
              />
            </label>
          </div>
        ) : null}

        {config.activeAdapter === 'workday' ? (
          <div style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700 }}>Workday Settings</h3>
            <label className="field">
              <span className="field__label">Tenant URL</span>
              <input
                className="field__control"
                onChange={(e) => setConfig((c) => c ? { ...c, workday: { ...c.workday, tenantUrl: e.target.value } } : c)}
                placeholder="https://wd2.myworkday.com/yourcompany"
                type="url"
                value={config.workday.tenantUrl}
              />
            </label>
            <label className="field">
              <span className="field__label">Client ID</span>
              <input
                className="field__control"
                onChange={(e) => setConfig((c) => c ? { ...c, workday: { ...c.workday, clientId: e.target.value } } : c)}
                placeholder="client-id"
                type="text"
                value={config.workday.clientId}
              />
            </label>
            <label className="field">
              <span className="field__label">Client Secret</span>
              <input
                className="field__control"
                onChange={(e) => setConfig((c) => c ? { ...c, workday: { ...c.workday, clientSecret: e.target.value } } : c)}
                placeholder="client-secret"
                type="password"
                value={config.workday.clientSecret}
              />
            </label>
          </div>
        ) : null}

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button
            className="button button--primary"
            disabled={saving}
            onClick={() => void handleSave()}
            type="button"
          >
            {saving ? 'Saving…' : 'Save Configuration'}
          </button>
          <button
            className="button button--secondary"
            disabled={syncing || config.activeAdapter === 'none'}
            onClick={() => void handleSync()}
            type="button"
          >
            {syncing ? 'Syncing…' : 'Run Sync Now'}
          </button>
        </div>

        {syncResult ? (
          <div
            style={{
              background: syncResult.errors.length > 0 ? 'var(--color-danger-bg)' : 'var(--color-success-bg)',
              border: `1px solid ${syncResult.errors.length > 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)'}`,
              borderRadius: 6,
              padding: '0.75rem',
              fontSize: '0.8rem',
            }}
          >
            <strong>Sync complete</strong> — {syncResult.created} created, {syncResult.updated} updated
            {syncResult.errors.length > 0 ? (
              <ul style={{ margin: '4px 0 0', padding: '0 0 0 1.2rem', color: 'var(--color-status-danger)' }}>
                {syncResult.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </PageContainer>
  );
}
