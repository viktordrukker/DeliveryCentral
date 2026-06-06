import { useEffect, useState } from 'react';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { SectionCard } from '@/components/common/SectionCard';
import { Button, Table, type Column } from '@/components/ds';
import {
  type DmEscalation,
  confirmDmEscalation,
  listPendingDmEscalations,
  overrideDmEscalation,
} from '@/lib/api/dm-escalation';

function sourceLabel(kind: DmEscalation['sourceKind']): string {
  switch (kind) {
    case 'timesheet': return 'Timesheet';
    case 'work-hour': return 'Work hour';
    case 'milestone': return 'Milestone';
    case 'leave': return 'Leave';
  }
}

/**
 * LEAN-P4-missing-9 — Director-side "Escalations awaiting confirmation".
 *
 * Director either:
 *   * Confirms — DM rejection stands.
 *   * Overrides — DM must re-approve the underlying artefact upstream.
 *
 * Confirm/override use ConfirmDialog so the Director's resolution notes
 * are captured and the destructive override action requires explicit
 * acknowledgement.
 */
export function DirectorEscalationsCard(): JSX.Element {
  const [rows, setRows] = useState<DmEscalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingAction, setPendingAction] = useState<
    { id: string; mode: 'confirm' | 'override' } | null
  >(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    listPendingDmEscalations()
      .then((items) => { if (active) setRows(items); })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load escalations.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refreshKey]);

  async function resolve(notes?: string): Promise<void> {
    if (!pendingAction) return;
    try {
      if (pendingAction.mode === 'confirm') {
        await confirmDmEscalation(pendingAction.id, notes);
      } else {
        await overrideDmEscalation(pendingAction.id, notes);
      }
      setPendingAction(null);
      setRefreshKey((k) => k + 1);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Action failed.');
    }
  }

  if (error) return <ErrorState description={error} />;

  return (
    <>
      <SectionCard title="Escalations awaiting confirmation" collapsible>
        {loading ? (
          <div data-testid="director-escalations-loading" style={{ color: 'var(--color-text-muted)', padding: 'var(--space-3)' }}>
            Loading...
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No escalations to triage"
            description="When a Delivery Manager rejects a downstream item, the escalation appears here for your confirmation or override."
          />
        ) : (
          <Table
            testId="director-escalations-table"
            variant="compact"
            columns={[
              {
                key: 'sourceKind',
                title: 'Type',
                width: 90,
                render: (r) => <span style={{ fontSize: 11 }}>{sourceLabel(r.sourceKind)}</span>,
              },
              {
                key: 'submittedBy',
                title: 'Escalated by',
                width: 160,
                render: (r) => (
                  <span style={{ fontSize: 11 }}>{r.escalatedByDisplayName ?? r.escalatedByPersonId}</span>
                ),
              },
              {
                key: 'reason',
                title: 'Reason',
                render: (r) => <span>{r.reason}</span>,
              },
              {
                key: 'created',
                title: 'Created',
                width: 110,
                render: (r) => (
                  <span style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-muted)' }}>
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                ),
              },
              {
                key: 'actions',
                title: '',
                width: 180,
                render: (r) => (
                  <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                    <Button
                      data-testid={`director-escalation-confirm-${r.id}`}
                      onClick={() => setPendingAction({ id: r.id, mode: 'confirm' })}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      Confirm
                    </Button>
                    <Button
                      data-testid={`director-escalation-override-${r.id}`}
                      onClick={() => setPendingAction({ id: r.id, mode: 'override' })}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      Override
                    </Button>
                  </div>
                ),
              },
            ] as Column<DmEscalation>[]}
            rows={rows}
            getRowKey={(r) => r.id}
          />
        )}
      </SectionCard>
      {pendingAction ? (
        <ConfirmDialog
          open={pendingAction !== null}
          title={pendingAction.mode === 'confirm' ? 'Confirm DM rejection' : 'Override DM rejection'}
          message={
            pendingAction.mode === 'confirm'
              ? 'The DM rejection will stand.'
              : 'The DM rejection will be reversed; the DM must re-approve the artefact upstream.'
          }
          confirmLabel={pendingAction.mode === 'confirm' ? 'Confirm' : 'Override'}
          tone={pendingAction.mode === 'override' ? 'danger' : 'default'}
          onCancel={() => setPendingAction(null)}
          onConfirm={(notes) => resolve(notes)}
        />
      ) : null}
    </>
  );
}
