import { FormEvent, useEffect, useState } from 'react';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { PersonSelect } from '@/components/common/PersonSelect';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  ClientDto,
  createClient,
  fetchClients,
  updateClient,
} from '@/lib/api/clients';
import { Button, DataView, type Column } from '@/components/ds';

const columns: Column<ClientDto>[] = [
  { key: 'name', title: 'Name', render: (c) => <span style={{ fontWeight: 500 }}>{c.name}</span> },
  { key: 'industry', title: 'Industry', render: (c) => c.industry || '—' },
  { key: 'accountManager', title: 'Account Manager', render: (c) => c.accountManagerDisplayName || '—' },
  { key: 'projects', title: 'Projects', align: 'right', render: (c) => c.projectCount, width: 70 },
  { key: 'status', title: 'Status', render: (c) => <StatusBadge status={c.isActive ? 'active' : 'inactive'} variant="dot" />, width: 80 },
];

/**
 * EPIC B — Client master-data registry.
 *
 * Mirrors the admin-content pattern (DictionariesAdminContent etc.): the
 * content mounts both standalone at /admin/clients and inside the
 * AdminPanelPage "Dictionaries" tab. The Client backend (model + controller +
 * clients.ts API) was already built; this is the missing UI so operators can
 * add/edit the clients that the Create-Project "Client" dropdown lists.
 */
export function ClientRegistryAdminContent(): JSX.Element {
  const [clients, setClients] = useState<ClientDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formIndustry, setFormIndustry] = useState('');
  const [formAccountMgr, setFormAccountMgr] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function loadClients(): void {
    setIsLoading(true);
    setError(null);
    fetchClients(false)
      .then(setClients)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load clients.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(loadClients, []);

  async function handleCreate(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!formName.trim()) return;
    setIsSubmitting(true);
    try {
      const created = await createClient({
        name: formName.trim(),
        industry: formIndustry.trim() || undefined,
        accountManagerPersonId: formAccountMgr || undefined,
        notes: formNotes.trim() || undefined,
      });
      setClients((prev) => [created, ...prev]);
      setShowForm(false);
      setFormName('');
      setFormIndustry('');
      setFormAccountMgr('');
      setFormNotes('');
    } catch {
      setError('Failed to create client.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleActive(client: ClientDto): Promise<void> {
    try {
      const updated = await updateClient(client.id, { isActive: !client.isActive });
      setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch {
      setError('Failed to update client.');
    }
  }

  return (
    <div data-testid="client-registry">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-3)' }}>
        <Button variant="primary" size="sm" onClick={() => setShowForm((v) => !v)} type="button">
          {showForm ? 'Cancel' : 'Add Client'}
        </Button>
      </div>

      {isLoading ? <LoadingState variant="skeleton" skeletonType="table" /> : null}
      {error ? <ErrorState description={error} onRetry={loadClients} /> : null}

      {showForm && (
        <form
          onSubmit={(e) => void handleCreate(e)}
          style={{
            maxWidth: 520,
            marginBottom: 'var(--space-4)',
            padding: 'var(--space-3)',
            border: '1px solid var(--color-border)',
            borderRadius: 6,
            background: 'var(--color-surface-alt)',
          }}
        >
          <div className="entity-form__grid">
            <label className="field">
              <span className="field__label">Name *</span>
              <input className="field__control" value={formName} onChange={(e) => setFormName(e.target.value)} required />
            </label>
            <label className="field">
              <span className="field__label">Industry</span>
              <input
                className="field__control"
                value={formIndustry}
                onChange={(e) => setFormIndustry(e.target.value)}
                placeholder="Banking, Insurance, Retail"
              />
            </label>
            <PersonSelect label="Account Manager" value={formAccountMgr} onChange={setFormAccountMgr} />
            <label className="field field--full">
              <span className="field__label">Notes</span>
              <textarea className="field__control" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} />
            </label>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Client'}
            </Button>
            <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {!isLoading && !error && clients.length === 0 ? (
        <EmptyState
          actions={[{ label: 'Add Client', onClick: () => setShowForm(true) }]}
          description="No clients registered yet. Add one so projects can be tied to a customer."
          title="No clients"
        />
      ) : null}

      {!isLoading && clients.length > 0 ? (
        <DataView<ClientDto>
          pageSizeOptions={[1000]}
          caption="Client registry"
          columns={[
            ...columns,
            {
              key: 'actions',
              title: '',
              width: 90,
              render: (c) => (
                <Button
                  size="sm"
                  variant={c.isActive ? 'secondary' : 'primary'}
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleToggleActive(c);
                  }}
                  style={{ fontSize: 10 }}
                >
                  {c.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              ),
            },
          ]}
          getRowKey={(c) => c.id}
          rows={clients}
          variant="compact"
        />
      ) : null}
    </div>
  );
}

export function ClientRegistryPage(): JSX.Element {
  return (
    <PageContainer testId="client-registry-page">
      <PageHeader
        eyebrow="Admin"
        subtitle="Manage clients (customers) available for delivery projects."
        title="Client Registry"
      />
      <ClientRegistryAdminContent />
    </PageContainer>
  );
}
