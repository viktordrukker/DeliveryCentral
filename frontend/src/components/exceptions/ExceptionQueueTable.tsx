import { useState } from 'react';

import { ExceptionQueueItem } from '@/lib/api/exceptions';
import { StatusBadge } from '@/components/common/StatusBadge';
import { humanizeEnum } from '@/lib/labels';
import { formatDateTime } from '@/lib/format-date';
import { Button, DataView, Textarea, type Column } from '@/components/ds';

interface ExceptionQueueTableProps {
  items: ExceptionQueueItem[];
  onSelect: (item: ExceptionQueueItem) => void;
  onResolve?: (id: string, resolution: string) => Promise<void>;
  onSuppress?: (id: string, reason: string) => Promise<void>;
  selectedId?: string | null;
}

/**
 * Phase DS-4-7 — first migration onto the new <DataView> compound. Same
 * external API; visual chrome and behavior preserved per the "identical row
 * sets / sort orders" policy. The inline Resolve/Suppress note textarea
 * (ExceptionActionCell) is unchanged — DataView's rowActions API shows
 * simple buttons; this cell is a custom render kept inline.
 *
 * Pagination is configured to a very large page size so the table never
 * paginates in practice (the legacy DataTable rendered all items at once).
 */
export function ExceptionQueueTable({
  items,
  onResolve,
  onSelect,
  onSuppress,
  selectedId,
}: ExceptionQueueTableProps): JSX.Element {
  const columns: Column<ExceptionQueueItem>[] = [
    {
      key: 'category',
      title: 'Category',
      getValue: (item) => formatCategory(item.category),
      render: (item) => (
        <div className="audit-record">
          <span className="audit-record__primary">
            {formatCategory(item.category)}
            {selectedId === item.id ? ' (selected)' : ''}
          </span>
          <span className="audit-record__secondary">
            <StatusBadge status={item.status} variant="dot" />
          </span>
        </div>
      ),
    },
    {
      key: 'summary',
      title: 'Related Context',
      getValue: (item) => item.summary,
      render: (item) => (
        <div className="audit-record">
          <span className="audit-record__primary">{item.summary}</span>
          <span className="audit-record__secondary">
            {item.personDisplayName ?? item.personId ?? 'No person'} |{' '}
            {item.projectName ?? item.projectId ?? item.targetEntityId}
          </span>
        </div>
      ),
    },
    {
      key: 'observedAt',
      title: 'Observed',
      getValue: (item) => item.observedAt,
      render: (item) => formatDateTime(item.observedAt),
    },
    ...(onResolve || onSuppress
      ? [{
          key: 'actions',
          title: 'Actions',
          render: (item: ExceptionQueueItem) =>
            item.status === 'OPEN' ? (
              <ExceptionActionCell
                id={item.id}
                onResolve={onResolve}
                onSuppress={onSuppress}
              />
            ) : null,
        }]
      : []),
  ];

  return (
    <DataView
      columns={columns}
      rows={items}
      getRowKey={(item) => item.id}
      onRowClick={onSelect}
      pageSizeOptions={[1000]}
    />
  );
}

interface ExceptionActionCellProps {
  id: string;
  onResolve?: (id: string, resolution: string) => Promise<void>;
  onSuppress?: (id: string, reason: string) => Promise<void>;
}

function ExceptionActionCell({ id, onResolve, onSuppress }: ExceptionActionCellProps): JSX.Element {
  const [mode, setMode] = useState<'idle' | 'resolve' | 'suppress'>('idle');
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function handleConfirm(): Promise<void> {
    if (!note.trim()) return;
    setIsSaving(true);
    try {
      if (mode === 'resolve' && onResolve) {
        await onResolve(id, note.trim());
      } else if (mode === 'suppress' && onSuppress) {
        await onSuppress(id, note.trim());
      }
      setMode('idle');
      setNote('');
    } finally {
      setIsSaving(false);
    }
  }

  if (mode !== 'idle') {
    return (
      <div style={{ minWidth: '220px' }}>
        <Textarea
          onChange={(e) => setNote(e.target.value)}
          placeholder={mode === 'resolve' ? 'Resolution note...' : 'Suppression reason...'}
          rows={2}
          style={{ fontSize: '12px', marginBottom: '4px', width: '100%' }}
          value={note}
        />
        <div style={{ display: 'flex', gap: '4px' }}>
          <Button variant="primary" size="sm" disabled={isSaving || !note.trim()} onClick={(e) => { e.stopPropagation(); void handleConfirm(); }}>
            {isSaving ? '...' : 'Confirm'}
          </Button>
          <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); setMode('idle'); setNote(''); }}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      {onResolve ? (
        <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); setMode('resolve'); }}>
          Resolve
        </Button>
      ) : null}
      {onSuppress ? (
        <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); setMode('suppress'); }}>
          Suppress
        </Button>
      ) : null}
    </div>
  );
}

function formatCategory(value: string): string {
  return humanizeEnum(value);
}
