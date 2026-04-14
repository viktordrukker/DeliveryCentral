import { useEffect, useState } from 'react';

import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import {
  WebhookSubscription,
  WebhookDeliveryAttempt,
  fetchWebhooks,
  createWebhook,
  deleteWebhook,
  testWebhookDelivery,
  fetchWebhookDeliveries,
} from '@/lib/api/webhooks';
import { useAuth } from '@/app/auth-context';
import { formatDateShort } from '@/lib/format-date';

const ALL_EVENT_TYPES = [
  'case.created',
  'case.closed',
  'case.cancelled',
  'assignment.created',
  'assignment.approved',
  'person.created',
  'person.updated',
];

export function WebhooksAdminPage(): JSX.Element {
  const { principal } = useAuth();
  const [subscriptions, setSubscriptions] = useState<WebhookSubscription[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ url: '', secret: '', eventTypes: [] as string[] });
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDeliveryAttempt[]>([]);
  const [testResult, setTestResult] = useState<WebhookDeliveryAttempt | null>(null);

  useEffect(() => {
    void fetchWebhooks()
      .then(setSubscriptions)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load webhooks.'));
  }, []);

  async function handleCreate(): Promise<void> {
    if (!form.url || !form.secret) return;
    setSaving(true);
    try {
      const sub = await createWebhook({
        url: form.url,
        secret: form.secret,
        eventTypes: form.eventTypes,
        createdByPersonId: principal?.personId ?? '',
      });
      setSubscriptions((prev) => [...prev, sub]);
      setForm({ url: '', secret: '', eventTypes: [] });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create webhook.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string): Promise<void> {
    try {
      await deleteWebhook(id);
      setSubscriptions((prev) => prev.filter((s) => s.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete webhook.');
    }
  }

  async function handleTest(id: string): Promise<void> {
    try {
      const result = await testWebhookDelivery(id);
      setTestResult(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Test delivery failed.');
    }
  }

  async function handleViewDeliveries(id: string): Promise<void> {
    setSelectedId(id);
    setTestResult(null);
    try {
      const log = await fetchWebhookDeliveries(id);
      setDeliveries(log);
    } catch {
      setDeliveries([]);
    }
  }

  function toggleEventType(et: string): void {
    setForm((f) => ({
      ...f,
      eventTypes: f.eventTypes.includes(et)
        ? f.eventTypes.filter((x) => x !== et)
        : [...f.eventTypes, et],
    }));
  }

  return (
    <PageContainer viewport>
      <PageHeader
        eyebrow="Admin"
        subtitle="Manage outbound webhook subscriptions. Events are signed with HMAC-SHA256 in the X-Delivery-Signature header."
        title="Webhook Subscriptions"
      />

      {error ? (
        <div style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-status-danger)', borderRadius: 6, padding: '0.75rem', marginBottom: '1rem', color: 'var(--color-danger)', fontSize: '0.875rem' }}>
          {error}
        </div>
      ) : null}

      <div style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '1rem', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 700 }}>Add Subscription</h3>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <label className="field" style={{ flex: '2 1 200px' }}>
            <span className="field__label">Endpoint URL</span>
            <input
              className="field__control"
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="https://your-server.com/hooks/delivery-central"
              type="url"
              value={form.url}
            />
          </label>
          <label className="field" style={{ flex: '1 1 160px' }}>
            <span className="field__label">Signing Secret</span>
            <input
              className="field__control"
              onChange={(e) => setForm((f) => ({ ...f, secret: e.target.value }))}
              placeholder="your-secret"
              type="password"
              value={form.secret}
            />
          </label>
        </div>
        <div style={{ marginTop: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text)' }}>Event Types (empty = all):</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.25rem' }}>
            {ALL_EVENT_TYPES.map((et) => (
              <label key={et} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', cursor: 'pointer' }}>
                <input
                  checked={form.eventTypes.includes(et)}
                  onChange={() => toggleEventType(et)}
                  type="checkbox"
                />
                {et}
              </label>
            ))}
          </div>
        </div>
        <button
          className="button button--primary"
          disabled={!form.url || !form.secret || saving}
          onClick={() => void handleCreate()}
          style={{ marginTop: '0.75rem' }}
          type="button"
        >
          {saving ? 'Adding…' : 'Add Webhook'}
        </button>
      </div>

      {subscriptions.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>No webhook subscriptions configured.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-alt)' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid var(--color-border)' }}>URL</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid var(--color-border)' }}>Event Types</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid var(--color-border)' }}>Created</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid var(--color-border)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((sub) => (
              <tr key={sub.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '8px 12px', wordBreak: 'break-all' }}>{sub.url}</td>
                <td style={{ padding: '8px 12px' }}>
                  {sub.eventTypes.length === 0 ? 'all' : sub.eventTypes.join(', ')}
                </td>
                <td style={{ padding: '8px 12px' }}>{formatDateShort(sub.createdAt)}</td>
                <td style={{ padding: '8px 12px' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="button button--secondary"
                      onClick={() => void handleTest(sub.id)}
                      style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                      type="button"
                    >
                      Test
                    </button>
                    <button
                      className="button button--secondary"
                      onClick={() => void handleViewDeliveries(sub.id)}
                      style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                      type="button"
                    >
                      Deliveries
                    </button>
                    <button
                      className="button button--danger"
                      onClick={() => void handleDelete(sub.id)}
                      style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {testResult ? (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem',
            background: testResult.success ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
            border: `1px solid ${testResult.success ? 'var(--color-status-active)' : 'var(--color-status-danger)'}`,
            borderRadius: 6,
            fontSize: '0.8rem',
          }}
        >
          <strong>Test delivery result:</strong>{' '}
          {testResult.success
            ? `Success (HTTP ${testResult.statusCode ?? '?'})`
            : `Failed — ${testResult.error ?? `HTTP ${testResult.statusCode ?? 'no response'}`}`}
        </div>
      ) : null}

      {selectedId && deliveries.length > 0 ? (
        <div style={{ marginTop: '1rem' }}>
          <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>Last 10 Delivery Attempts</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-alt)' }}>
                <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>Event</th>
                <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>Status</th>
                <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((d, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--color-surface-alt)' }}>
                  <td style={{ padding: '6px 10px' }}>{d.eventType}</td>
                  <td style={{ padding: '6px 10px', color: d.success ? 'var(--color-status-active)' : 'var(--color-status-danger)' }}>
                    {d.success ? `OK ${d.statusCode ?? ''}` : `Failed ${d.statusCode ?? ''} ${d.error ?? ''}`}
                  </td>
                  <td style={{ padding: '6px 10px' }}>{d.attemptedAt.slice(0, 19).replace('T', ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </PageContainer>
  );
}
