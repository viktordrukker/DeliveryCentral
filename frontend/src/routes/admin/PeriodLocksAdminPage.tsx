import { FormEvent, useEffect, useState } from 'react';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { Button, DatePicker, FormField, Table, type Column } from '@/components/ds';
import {
  createPeriodLock,
  deletePeriodLock,
  fetchPeriodLocks,
  type PeriodLock,
} from '@/lib/api/period-locks';
import { formatDate } from '@/lib/format-date';

export function PeriodLocksAdminPage(): JSX.Element {
  const [locks, setLocks] = useState<PeriodLock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function load(): Promise<void> {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchPeriodLocks();
      setLocks(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load period locks.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFormError(null);
    setSuccessMsg(null);

    if (!from || !to) {
      setFormError('Both From and To are required.');
      return;
    }
    if (new Date(from) > new Date(to)) {
      setFormError('From must be on or before To.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createPeriodLock({ from, to });
      setSuccessMsg(`Locked ${formatDate(created.periodFrom)} → ${formatDate(created.periodTo)}.`);
      setFrom('');
      setTo('');
      await load();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Failed to create period lock.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!confirmDeleteId) return;
    setDeleteError(null);
    try {
      await deletePeriodLock(confirmDeleteId);
      setConfirmDeleteId(null);
      await load();
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : 'Failed to delete period lock.');
    }
  }

  const columns: Column<PeriodLock>[] = [
    {
      key: 'periodFrom',
      title: 'From',
      getValue: (lock) => lock.periodFrom,
      render: (lock) => formatDate(lock.periodFrom),
    },
    {
      key: 'periodTo',
      title: 'To',
      getValue: (lock) => lock.periodTo,
      render: (lock) => formatDate(lock.periodTo),
    },
    {
      key: 'lockedAt',
      title: 'Locked at',
      getValue: (lock) => lock.lockedAt,
      render: (lock) => new Date(lock.lockedAt).toLocaleString(),
    },
    {
      key: 'lockedBy',
      title: 'Locked by',
      getValue: (lock) => lock.lockedByDisplayName ?? '',
      render: (lock) => lock.lockedByDisplayName ?? 'Unknown actor',
    },
    {
      key: 'actions',
      title: '',
      render: (lock) => (
        <Button
          size="sm"
          variant="danger"
          onClick={() => setConfirmDeleteId(lock.id)}
          type="button"
        >
          Unlock
        </Button>
      ),
    },
  ];

  return (
    <PageContainer testId="period-locks-admin-page">
      <PageHeader
        eyebrow="Administration"
        title="Period Locks"
        subtitle="Lock past time periods so timesheets, expenses, and capitalisation rows can't be edited retroactively."
      />

      <SectionCard title="Add a new lock">
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <FormField label="From" required>
            <DatePicker value={from} onValueChange={setFrom} />
          </FormField>
          <FormField label="To" required>
            <DatePicker value={to} onValueChange={setTo} />
          </FormField>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Locking…' : 'Lock period'}
          </Button>
        </form>
        {formError ? <ErrorState description={formError} variant="inline" /> : null}
        {successMsg ? (
          <div className="success-banner" role="status" style={{ marginTop: 'var(--space-2)' }}>
            {successMsg}
          </div>
        ) : null}
      </SectionCard>

      <SectionCard title="Current locks">
        {isLoading ? <LoadingState variant="skeleton" skeletonType="table" /> : null}
        {error ? <ErrorState description={error} onRetry={() => void load()} /> : null}
        {!isLoading && !error ? (
          locks.length === 0 ? (
            <EmptyState
              title="No period locks"
              description="Add a lock above to block edits to historical periods."
            />
          ) : (
            <Table columns={columns as Column<PeriodLock>[]} rows={locks} getRowKey={(lock) => lock.id} />
          )
        ) : null}
        {deleteError ? <ErrorState description={deleteError} variant="inline" /> : null}
      </SectionCard>

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Unlock period"
        message={(() => {
          const lock = locks.find((l) => l.id === confirmDeleteId);
          if (!lock) {
            return 'Once unlocked, the period becomes editable again. Are you sure?';
          }
          return `Unlock ${formatDate(lock.periodFrom)} → ${formatDate(lock.periodTo)}? Timesheets, expenses, and capitalisation rows in this range will become editable again.`;
        })()}
        confirmLabel="Unlock"
        tone="danger"
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => void handleDelete()}
      />
    </PageContainer>
  );
}
