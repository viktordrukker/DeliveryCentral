import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button, FormField, FormModal, Input, Switch, Table, Textarea, type Column } from '@/components/ds';
import {
  archiveRateCard,
  archiveRateCardEntry,
  createRateCard,
  createRateCardEntry,
  fetchRateCard,
  listRateCards,
  updateRateCard,
  updateRateCardEntry,
  type CreateRateCardEntryRequest,
  type CreateRateCardRequest,
  type RateCard,
  type RateCardEntry,
  type RateCardWithEntries,
} from '@/lib/api/rate-cards';

const NUM = { fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const };

interface CardFormState {
  name: string;
  currencyCode: string;
  clientId: string;
  validFrom: string;
  validTo: string;
  notes: string;
}

interface EntryFormState {
  staffingRole: string;
  grade: string;
  requiredSkills: string;
  hourlyRate: string;
  notes: string;
}

function emptyCardForm(): CardFormState {
  const today = new Date().toISOString().slice(0, 10);
  return {
    name: '',
    currencyCode: 'USD',
    clientId: '',
    validFrom: today,
    validTo: '',
    notes: '',
  };
}

function emptyEntryForm(): EntryFormState {
  return {
    staffingRole: '',
    grade: '',
    requiredSkills: '',
    hourlyRate: '0',
    notes: '',
  };
}

function entryToForm(e: RateCardEntry): EntryFormState {
  return {
    staffingRole: e.staffingRole,
    grade: e.grade,
    requiredSkills: e.requiredSkills.join(', '),
    hourlyRate: String(e.hourlyRate),
    notes: e.notes ?? '',
  };
}

function parseSkills(s: string): string[] {
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

export function RateCardsAdminPage(): JSX.Element {
  const [cards, setCards] = useState<RateCard[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<RateCardWithEntries | null>(null);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Card form state
  const [creatingCard, setCreatingCard] = useState(false);
  const [editingCard, setEditingCard] = useState<RateCard | null>(null);
  const [cardForm, setCardForm] = useState<CardFormState>(emptyCardForm);
  const [archivingCard, setArchivingCard] = useState<RateCard | null>(null);

  // Entry form state
  const [creatingEntry, setCreatingEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState<RateCardEntry | null>(null);
  const [entryForm, setEntryForm] = useState<EntryFormState>(emptyEntryForm);
  const [archivingEntry, setArchivingEntry] = useState<RateCardEntry | null>(null);

  async function reloadList(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const next = await listRateCards({ includeArchived });
      setCards(next);
      // Auto-select first card on initial load
      if (!selectedId && next.length > 0) setSelectedId(next[0].id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load rate cards.');
    } finally {
      setLoading(false);
    }
  }

  async function reloadSelected(id: string): Promise<void> {
    try {
      const card = await fetchRateCard(id);
      setSelected(card);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to load card detail.');
    }
  }

  useEffect(() => {
    void reloadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload is stable
  }, [includeArchived]);

  useEffect(() => {
    if (selectedId) void reloadSelected(selectedId);
    else setSelected(null);
  }, [selectedId]);

  function openCreateCard(): void {
    setCardForm(emptyCardForm());
    setCreatingCard(true);
  }

  function openEditCard(card: RateCard): void {
    setCardForm({
      name: card.name,
      currencyCode: card.currencyCode,
      clientId: card.clientId ?? '',
      validFrom: card.validFrom,
      validTo: card.validTo ?? '',
      notes: card.notes ?? '',
    });
    setEditingCard(card);
  }

  async function handleCreateCard(): Promise<void> {
    if (!cardForm.name.trim()) {
      toast.error('Name is required.');
      throw new Error('Name is required.');
    }
    if (!/^[A-Za-z]{3}$/.test(cardForm.currencyCode)) {
      toast.error('Currency must be a 3-letter ISO code.');
      throw new Error('Bad currency.');
    }
    const payload: CreateRateCardRequest = {
      name: cardForm.name.trim(),
      currencyCode: cardForm.currencyCode.toUpperCase(),
      clientId: cardForm.clientId.trim() || null,
      validFrom: cardForm.validFrom,
      validTo: cardForm.validTo || null,
      notes: cardForm.notes.trim() || undefined,
    };
    try {
      const created = await createRateCard(payload);
      toast.success('Rate card created.');
      setCreatingCard(false);
      setSelectedId(created.id);
      await reloadList();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Create failed.';
      toast.error(msg);
      throw e;
    }
  }

  async function handleUpdateCard(): Promise<void> {
    if (!editingCard) return;
    if (!cardForm.name.trim()) {
      toast.error('Name is required.');
      throw new Error('Name is required.');
    }
    try {
      await updateRateCard(editingCard.id, {
        name: cardForm.name.trim(),
        validFrom: cardForm.validFrom,
        validTo: cardForm.validTo || null,
        notes: cardForm.notes.trim() || null,
      });
      toast.success('Rate card updated.');
      setEditingCard(null);
      await reloadList();
      if (editingCard.id === selectedId) await reloadSelected(editingCard.id);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Update failed.';
      toast.error(msg);
      throw e;
    }
  }

  async function handleArchiveCard(): Promise<void> {
    if (!archivingCard) return;
    try {
      await archiveRateCard(archivingCard.id);
      toast.success('Card archived.');
      if (archivingCard.id === selectedId) setSelectedId(null);
      setArchivingCard(null);
      await reloadList();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Archive failed.');
    }
  }

  async function handleToggleCardActive(card: RateCard): Promise<void> {
    try {
      await updateRateCard(card.id, { isActive: !card.isActive });
      toast.success(card.isActive ? 'Card disabled.' : 'Card enabled.');
      await reloadList();
      if (card.id === selectedId) await reloadSelected(card.id);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Toggle failed.');
    }
  }

  function openCreateEntry(): void {
    setEntryForm(emptyEntryForm());
    setCreatingEntry(true);
  }

  function openEditEntry(e: RateCardEntry): void {
    setEntryForm(entryToForm(e));
    setEditingEntry(e);
  }

  async function handleCreateEntry(): Promise<void> {
    if (!selected) return;
    const rate = Number(entryForm.hourlyRate);
    if (!Number.isFinite(rate) || rate < 0) {
      toast.error('hourlyRate must be a non-negative number.');
      throw new Error('Bad rate.');
    }
    if (!entryForm.staffingRole.trim() || !entryForm.grade.trim()) {
      toast.error('staffingRole and grade are required.');
      throw new Error('Missing keys.');
    }
    const payload: CreateRateCardEntryRequest = {
      staffingRole: entryForm.staffingRole.trim(),
      grade: entryForm.grade.trim(),
      requiredSkills: parseSkills(entryForm.requiredSkills),
      hourlyRate: rate,
      notes: entryForm.notes.trim() || undefined,
    };
    try {
      await createRateCardEntry(selected.id, payload);
      toast.success('Entry added.');
      setCreatingEntry(false);
      await reloadSelected(selected.id);
      await reloadList();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Create entry failed.';
      toast.error(msg);
      throw e;
    }
  }

  async function handleUpdateEntry(): Promise<void> {
    if (!selected || !editingEntry) return;
    const rate = Number(entryForm.hourlyRate);
    if (!Number.isFinite(rate) || rate < 0) {
      toast.error('hourlyRate must be a non-negative number.');
      throw new Error('Bad rate.');
    }
    try {
      await updateRateCardEntry(selected.id, editingEntry.id, {
        hourlyRate: rate,
        requiredSkills: parseSkills(entryForm.requiredSkills),
        notes: entryForm.notes.trim() || null,
      });
      toast.success('Entry updated.');
      setEditingEntry(null);
      await reloadSelected(selected.id);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Update entry failed.';
      toast.error(msg);
      throw e;
    }
  }

  async function handleArchiveEntry(): Promise<void> {
    if (!selected || !archivingEntry) return;
    try {
      await archiveRateCardEntry(selected.id, archivingEntry.id);
      toast.success('Entry archived.');
      setArchivingEntry(null);
      await reloadSelected(selected.id);
      await reloadList();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Archive failed.');
    }
  }

  async function handleToggleEntryActive(entry: RateCardEntry): Promise<void> {
    if (!selected) return;
    try {
      await updateRateCardEntry(selected.id, entry.id, { isActive: !entry.isActive });
      toast.success(entry.isActive ? 'Entry disabled.' : 'Entry enabled.');
      await reloadSelected(selected.id);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Toggle failed.');
    }
  }

  const cardColumns = useMemo<Column<RateCard>[]>(
    () => [
      {
        key: 'name',
        title: 'Name',
        render: (r) => (
          <span style={{ fontWeight: r.id === selectedId ? 600 : 400 }}>{r.name}</span>
        ),
      },
      {
        key: 'scope',
        title: 'Scope',
        width: 140,
        render: (r) => (
          <span style={{ color: 'var(--color-text-muted)' }}>
            {r.clientId ? `Client · ${r.clientName ?? r.clientId.slice(0, 8)}` : 'Tenant default'}
          </span>
        ),
      },
      { key: 'currencyCode', title: 'Currency', width: 80 },
      {
        key: 'validity',
        title: 'Validity',
        width: 200,
        render: (r) => (
          <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>
            {r.validFrom} → {r.validTo ?? '∞'}
          </span>
        ),
      },
      {
        key: 'entryCount',
        title: 'Entries',
        align: 'right',
        width: 70,
        render: (r) => <span style={NUM}>{r.entryCount}</span>,
      },
      {
        key: 'status',
        title: 'Status',
        width: 100,
        render: (r) => {
          if (r.archivedAt) return <StatusBadge tone="neutral" variant="chip" label="Archived" />;
          if (r.isActive) return <StatusBadge tone="active" variant="chip" label="Active" />;
          return <StatusBadge tone="warning" variant="chip" label="Disabled" />;
        },
      },
    ],
    [selectedId],
  );

  const entryColumns = useMemo<Column<RateCardEntry>[]>(
    () => [
      { key: 'staffingRole', title: 'Role', render: (r) => r.staffingRole },
      { key: 'grade', title: 'Grade', width: 90, render: (r) => r.grade },
      {
        key: 'requiredSkills',
        title: 'Required skills',
        render: (r) =>
          r.requiredSkills.length === 0 ? (
            <span style={{ color: 'var(--color-text-subtle)' }}>—</span>
          ) : (
            r.requiredSkills.join(', ')
          ),
      },
      {
        key: 'hourlyRate',
        title: 'Rate',
        align: 'right',
        width: 100,
        render: (r) => (
          <span style={NUM}>
            {r.hourlyRate.toFixed(2)} {selected?.currencyCode ?? ''}
          </span>
        ),
      },
      {
        key: 'pinned',
        title: 'Pinned',
        align: 'right',
        width: 70,
        render: (r) => <span style={NUM}>{r.pinnedAssignmentCount}</span>,
      },
      {
        key: 'status',
        title: 'Status',
        width: 100,
        render: (r) => {
          if (r.archivedAt) return <StatusBadge tone="neutral" variant="chip" label="Archived" />;
          if (r.isActive) return <StatusBadge tone="active" variant="chip" label="Active" />;
          return <StatusBadge tone="warning" variant="chip" label="Disabled" />;
        },
      },
      {
        key: 'actions',
        title: 'Actions',
        align: 'right',
        width: 240,
        render: (r) => {
          if (r.archivedAt) return <span style={{ color: 'var(--color-text-subtle)', fontSize: 11 }}>—</span>;
          return (
            <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end' }}>
              <Button size="sm" variant="secondary" type="button" onClick={() => void handleToggleEntryActive(r)}>
                {r.isActive ? 'Disable' : 'Enable'}
              </Button>
              <Button size="sm" variant="secondary" type="button" onClick={() => openEditEntry(r)}>
                Edit
              </Button>
              <Button size="sm" variant="secondary" type="button" onClick={() => setArchivingEntry(r)}>
                Archive
              </Button>
            </div>
          );
        },
      },
    ],
    [selected],
  );

  if (loading && cards.length === 0)
    return (
      <PageContainer testId="rate-cards-admin-page">
        <PageHeader eyebrow="Admin" title="Rate Cards" />
        <LoadingState label="Loading rate cards…" skeletonType="table" variant="skeleton" />
      </PageContainer>
    );

  if (error)
    return (
      <PageContainer testId="rate-cards-admin-page">
        <PageHeader eyebrow="Admin" title="Rate Cards" />
        <ErrorState description={error} />
      </PageContainer>
    );

  const cardFormOpen = creatingCard || editingCard !== null;
  const entryFormOpen = creatingEntry || editingEntry !== null;

  return (
    <PageContainer testId="rate-cards-admin-page">
      <PageHeader
        eyebrow="Admin"
        subtitle="Bill-rate cards used by the J2 resolver. Cards target a client or the tenant default; entries map (role × grade × required skills) → hourly rate."
        title="Rate Cards"
      />

      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-4)',
        }}
      >
        <FormField label="Include archived">
          <Switch checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} />
        </FormField>
        <div style={{ marginLeft: 'auto' }}>
          <Button variant="primary" type="button" onClick={openCreateCard}>
            + New rate card
          </Button>
        </div>
      </div>

      {cards.length === 0 ? (
        <SectionCard>
          <EmptyState
            description="No rate cards yet. Create one to start mapping role × grade → hourly rate."
            title="No cards"
            actions={[{ label: 'Create card', onClick: openCreateCard, variant: 'primary' }]}
          />
        </SectionCard>
      ) : (
        <SectionCard title={`Rate cards (${cards.length})`}>
          <Table
            variant="compact"
            columns={cardColumns}
            rows={cards}
            getRowKey={(r) => r.id}
            onRowClick={(r) => setSelectedId(r.id)}
          />
          <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
            {cards.map((r) =>
              r.id === selectedId ? (
                <div key={r.id} style={{ display: 'flex', gap: 'var(--space-1)' }}>
                  <Button size="sm" variant="secondary" type="button" onClick={() => void handleToggleCardActive(r)}>
                    {r.isActive ? 'Disable card' : 'Enable card'}
                  </Button>
                  <Button size="sm" variant="secondary" type="button" onClick={() => openEditCard(r)}>
                    Edit card
                  </Button>
                  <Button size="sm" variant="secondary" type="button" onClick={() => setArchivingCard(r)}>
                    Archive card
                  </Button>
                </div>
              ) : null,
            )}
          </div>
        </SectionCard>
      )}

      {selected ? (
        <SectionCard title={`${selected.name} — entries (${selected.entries.length})`}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-2)' }}>
            <Button size="sm" variant="primary" type="button" onClick={openCreateEntry}>
              + New entry
            </Button>
          </div>
          {selected.entries.length === 0 ? (
            <EmptyState
              description="This rate card has no entries yet. Add one to make the resolver match."
              title="No entries"
              actions={[{ label: 'Add entry', onClick: openCreateEntry, variant: 'primary' }]}
            />
          ) : (
            <Table
              variant="compact"
              columns={entryColumns}
              rows={selected.entries}
              getRowKey={(r) => r.id}
            />
          )}
        </SectionCard>
      ) : null}

      <FormModal
        open={cardFormOpen}
        onCancel={() => {
          setCreatingCard(false);
          setEditingCard(null);
        }}
        onSubmit={creatingCard ? handleCreateCard : handleUpdateCard}
        title={creatingCard ? 'New rate card' : 'Edit rate card'}
        submitLabel={creatingCard ? 'Create' : 'Save changes'}
        size="md"
      >
        <FormField label="Name">
          <Input value={cardForm.name} onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })} />
        </FormField>
        <FormField label="Currency (3-letter ISO)" hint="e.g. USD, EUR, GBP">
          <Input
            disabled={!creatingCard}
            value={cardForm.currencyCode}
            onChange={(e) => setCardForm({ ...cardForm, currencyCode: e.target.value })}
          />
        </FormField>
        {creatingCard ? (
          <FormField label="Client id (UUID, optional)" hint="Empty → tenant default; the resolver checks client cards first.">
            <Input value={cardForm.clientId} onChange={(e) => setCardForm({ ...cardForm, clientId: e.target.value })} />
          </FormField>
        ) : null}
        <FormField label="Valid from">
          <Input
            type="date"
            value={cardForm.validFrom}
            onChange={(e) => setCardForm({ ...cardForm, validFrom: e.target.value })}
          />
        </FormField>
        <FormField label="Valid to (optional)" hint="Empty = open-ended.">
          <Input
            type="date"
            value={cardForm.validTo}
            onChange={(e) => setCardForm({ ...cardForm, validTo: e.target.value })}
          />
        </FormField>
        <FormField label="Notes">
          <Textarea rows={3} value={cardForm.notes} onChange={(e) => setCardForm({ ...cardForm, notes: e.target.value })} />
        </FormField>
      </FormModal>

      <FormModal
        open={entryFormOpen}
        onCancel={() => {
          setCreatingEntry(false);
          setEditingEntry(null);
        }}
        onSubmit={creatingEntry ? handleCreateEntry : handleUpdateEntry}
        title={creatingEntry ? 'New rate card entry' : 'Edit rate card entry'}
        submitLabel={creatingEntry ? 'Create' : 'Save changes'}
        size="md"
      >
        <FormField label="Staffing role" hint="e.g. Engineer, Tech Lead">
          <Input
            disabled={!creatingEntry}
            value={entryForm.staffingRole}
            onChange={(e) => setEntryForm({ ...entryForm, staffingRole: e.target.value })}
          />
        </FormField>
        <FormField label="Grade" hint="Key from the tenant grade dictionary (e.g. g13, senior).">
          <Input
            disabled={!creatingEntry}
            value={entryForm.grade}
            onChange={(e) => setEntryForm({ ...entryForm, grade: e.target.value })}
          />
        </FormField>
        <FormField
          label="Required skills (comma-separated, optional)"
          hint="Person must hold ALL listed skills for the entry to apply (matches CLIENT_FULL / TENANT_FULL layers)."
        >
          <Input
            value={entryForm.requiredSkills}
            onChange={(e) => setEntryForm({ ...entryForm, requiredSkills: e.target.value })}
          />
        </FormField>
        <FormField label={`Hourly rate (${selected?.currencyCode ?? cardForm.currencyCode})`}>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={entryForm.hourlyRate}
            onChange={(e) => setEntryForm({ ...entryForm, hourlyRate: e.target.value })}
          />
        </FormField>
        <FormField label="Notes">
          <Textarea rows={3} value={entryForm.notes} onChange={(e) => setEntryForm({ ...entryForm, notes: e.target.value })} />
        </FormField>
      </FormModal>

      <ConfirmDialog
        open={archivingCard !== null}
        title="Archive rate card"
        message={
          archivingCard
            ? `Archive "${archivingCard.name}"? All ${archivingCard.entryCount} entries remain on disk; the resolver will skip the card. Pinned assignments keep their snapshot.`
            : ''
        }
        confirmLabel="Archive"
        tone="danger"
        onCancel={() => setArchivingCard(null)}
        onConfirm={() => void handleArchiveCard()}
      />
      <ConfirmDialog
        open={archivingEntry !== null}
        title="Archive rate card entry"
        message={
          archivingEntry
            ? `Archive "${archivingEntry.staffingRole} / ${archivingEntry.grade}"? Pinned assignments keep their snapshot; the resolver will look elsewhere on next match.`
            : ''
        }
        confirmLabel="Archive"
        tone="danger"
        onCancel={() => setArchivingEntry(null)}
        onConfirm={() => void handleArchiveEntry()}
      />
    </PageContainer>
  );
}
