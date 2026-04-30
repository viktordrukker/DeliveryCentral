import { FormEvent, useEffect, useState } from 'react';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  VendorDto,
  createVendor,
  fetchVendors,
  updateVendor,
} from '@/lib/api/vendors';
import { Button, DataView, type Column } from '@/components/ds';

const columns: Column<VendorDto>[] = [
  { key: 'name', title: 'Name', render: (v) => <span style={{ fontWeight: 500 }}>{v.name}</span> },
  { key: 'contactName', title: 'Contact', render: (v) => v.contactName || '\u2014' },
  { key: 'contactEmail', title: 'Email', render: (v) => v.contactEmail || '\u2014' },
  { key: 'contractType', title: 'Type', render: (v) => <StatusBadge status={v.contractType} variant="chip" />, width: 140 },
  { key: 'skills', title: 'Skills', render: (v) => v.skillAreas.join(', ') || '\u2014' },
  { key: 'engagements', title: 'Projects', align: 'right', render: (v) => v.engagementCount, width: 70 },
  { key: 'status', title: 'Status', render: (v) => <StatusBadge status={v.isActive ? 'active' : 'inactive'} variant="dot" />, width: 80 },
];

export function VendorRegistryPage(): JSX.Element {
  const [vendors, setVendors] = useState<VendorDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formType, setFormType] = useState('STAFF_AUGMENTATION');
  const [formSkills, setFormSkills] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function loadVendors(): void {
    setIsLoading(true);
    fetchVendors(false)
      .then(setVendors)
      .catch(() => setError('Failed to load vendors.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(loadVendors, []);

  async function handleCreate(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!formName.trim()) return;
    setIsSubmitting(true);
    try {
      const created = await createVendor({
        name: formName.trim(),
        contactName: formContact.trim() || undefined,
        contactEmail: formEmail.trim() || undefined,
        contractType: formType,
        skillAreas: formSkills ? formSkills.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        notes: formNotes.trim() || undefined,
      });
      setVendors((prev) => [created, ...prev]);
      setShowForm(false);
      setFormName(''); setFormContact(''); setFormEmail(''); setFormSkills(''); setFormNotes('');
    } catch {
      setError('Failed to create vendor.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleActive(vendor: VendorDto): Promise<void> {
    try {
      const updated = await updateVendor(vendor.id, { isActive: !vendor.isActive });
      setVendors((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
    } catch {
      setError('Failed to update vendor.');
    }
  }

  return (
    <PageContainer testId="vendor-registry-page">
      <PageHeader
        actions={
          <Button variant="primary" size="sm" onClick={() => setShowForm(true)} type="button">
            Add Vendor
          </Button>
        }
        eyebrow="Admin"
        subtitle="Manage external vendors and subcontractors available for project staffing."
        title="Vendor Registry"
      />

      {isLoading ? <LoadingState variant="skeleton" skeletonType="table" /> : null}
      {error ? <ErrorState description={error} onRetry={loadVendors} /> : null}

      {showForm && (
        <SectionCard title="New Vendor">
          <form onSubmit={(e) => void handleCreate(e)} style={{ maxWidth: 480 }}>
            <div className="entity-form__grid">
              <label className="field">
                <span className="field__label">Name *</span>
                <input className="field__control" value={formName} onChange={(e) => setFormName(e.target.value)} required />
              </label>
              <label className="field">
                <span className="field__label">Contact Name</span>
                <input className="field__control" value={formContact} onChange={(e) => setFormContact(e.target.value)} />
              </label>
              <label className="field">
                <span className="field__label">Contact Email</span>
                <input className="field__control" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
              </label>
              <label className="field">
                <span className="field__label">Contract Type</span>
                <select className="field__control" value={formType} onChange={(e) => setFormType(e.target.value)}>
                  <option value="STAFF_AUGMENTATION">Staff Augmentation</option>
                  <option value="FIXED_DELIVERABLE">Fixed Deliverable</option>
                  <option value="MANAGED_SERVICE">Managed Service</option>
                </select>
              </label>
              <label className="field field--full">
                <span className="field__label">Skill Areas (comma-separated)</span>
                <input className="field__control" value={formSkills} onChange={(e) => setFormSkills(e.target.value)} placeholder="Java, React, DevOps" />
              </label>
              <label className="field field--full">
                <span className="field__label">Notes</span>
                <textarea className="field__control" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} />
              </label>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
              <Button variant="primary" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create Vendor'}</Button>
              <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </SectionCard>
      )}

      {!isLoading && !error && vendors.length === 0 ? (
        <EmptyState action={{ href: '#', label: 'Add Vendor' }} description="No vendors registered yet." title="No vendors" />
      ) : null}

      {!isLoading && vendors.length > 0 ? (
        <SectionCard title={`Vendors (${vendors.length})`}>
          <DataView<VendorDto>
            pageSizeOptions={[1000]}
            caption="Vendor registry"
            columns={[
              ...columns,
              {
                key: 'actions',
                title: '',
                width: 90,
                render: (v) => (
                  <Button
                    size="sm"
                    variant={v.isActive ? 'secondary' : 'primary'}
                    onClick={(e) => { e.stopPropagation(); void handleToggleActive(v); }}
                    style={{ fontSize: 10 }}
                  >
                    {v.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                ),
              },
            ]}
            getRowKey={(v) => v.id}
            rows={vendors}
            variant="compact"
          />
        </SectionCard>
      ) : null}
    </PageContainer>
  );
}
