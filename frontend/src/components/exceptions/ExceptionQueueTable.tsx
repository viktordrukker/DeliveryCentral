import { useState } from 'react';

import { ExceptionQueueItem } from '@/lib/api/exceptions';
import { DataTable } from '@/components/common/DataTable';
import { humanizeEnum } from '@/lib/labels';

interface ExceptionQueueTableProps {
  items: ExceptionQueueItem[];
  onSelect: (item: ExceptionQueueItem) => void;
  onResolve?: (id: string, resolution: string) => Promise<void>;
  onSuppress?: (id: string, reason: string) => Promise<void>;
  selectedId?: string | null;
}

export function ExceptionQueueTable({
  items,
  onResolve,
  onSelect,
  onSuppress,
  selectedId,
}: ExceptionQueueTableProps): JSX.Element {
  return (
    <DataTable
      columns={[
        {
          key: 'category',
          render: (item) => (
            <div className="audit-record">
              <span className="audit-record__primary">
                {formatCategory(item.category)}
                {selectedId === item.id ? ' (selected)' : ''}
              </span>
              <span className="audit-record__secondary">
                <span className={`status-indicator status-indicator--${item.status.toLowerCase()}`}>{item.status}</span>
              </span>
            </div>
          ),
          title: 'Category',
        },
        {
          key: 'summary',
          render: (item) => (
            <div className="audit-record">
              <span className="audit-record__primary">{item.summary}</span>
              <span className="audit-record__secondary">
                {item.personDisplayName ?? item.personId ?? 'No person'} |{' '}
                {item.projectName ?? item.projectId ?? item.targetEntityId}
                {item.provider ? ` | ${item.provider.toUpperCase()}` : ''}
              </span>
            </div>
          ),
          title: 'Related Context',
        },
        {
          key: 'observedAt',
          render: (item) => new Date(item.observedAt).toLocaleString('en-US'),
          title: 'Observed',
        },
        ...(onResolve || onSuppress
          ? [{
              key: 'actions',
              render: (item: ExceptionQueueItem) =>
                item.status === 'OPEN' ? (
                  <ExceptionActionCell
                    id={item.id}
                    onResolve={onResolve}
                    onSuppress={onSuppress}
                  />
                ) : null,
              title: 'Actions',
            }]
          : []),
      ]}
      getRowKey={(item) => item.id}
      items={items}
      onRowClick={onSelect}
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
        <textarea
          className="field__control"
          onChange={(e) => setNote(e.target.value)}
          placeholder={mode === 'resolve' ? 'Resolution note...' : 'Suppression reason...'}
          rows={2}
          style={{ fontSize: '12px', marginBottom: '4px', width: '100%' }}
          value={note}
        />
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            className="button button--primary"
            disabled={isSaving || !note.trim()}
            onClick={(e) => { e.stopPropagation(); void handleConfirm(); }}
            style={{ fontSize: '11px', padding: '2px 8px' }}
            type="button"
          >
            {isSaving ? '...' : 'Confirm'}
          </button>
          <button
            className="button button--secondary"
            onClick={(e) => { e.stopPropagation(); setMode('idle'); setNote(''); }}
            style={{ fontSize: '11px', padding: '2px 8px' }}
            type="button"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      {onResolve ? (
        <button
          className="button button--secondary"
          onClick={(e) => { e.stopPropagation(); setMode('resolve'); }}
          style={{ fontSize: '11px', padding: '2px 8px' }}
          type="button"
        >
          Resolve
        </button>
      ) : null}
      {onSuppress ? (
        <button
          className="button button--secondary"
          onClick={(e) => { e.stopPropagation(); setMode('suppress'); }}
          style={{ fontSize: '11px', padding: '2px 8px' }}
          type="button"
        >
          Suppress
        </button>
      ) : null}
    </div>
  );
}

function formatCategory(value: string): string {
  return humanizeEnum(value);
}
