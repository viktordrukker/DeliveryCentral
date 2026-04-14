import { useState } from 'react';

import { DataTable } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { WorkEvidenceViewItem } from '@/features/work-evidence/useWorkEvidencePage';
import { updateWorkEvidence } from '@/lib/api/work-evidence';
import { formatDateShort } from '@/lib/format-date';

const EXTERNAL_TYPES = ['JIRA_WORKLOG', 'MEETING'];

interface WorkEvidenceTableProps {
  items: WorkEvidenceViewItem[];
  onUpdated?: (id: string) => void;
}

export function WorkEvidenceTable({ items, onUpdated }: WorkEvidenceTableProps): JSX.Element {
  return (
    <DataTable
      columns={[
        {
          key: 'person',
          render: (item: WorkEvidenceViewItem) => item.personName,
          title: 'Person',
        },
        {
          key: 'project',
          render: (item: WorkEvidenceViewItem) => item.projectName,
          title: 'Project',
        },
        {
          key: 'source',
          render: (item: WorkEvidenceViewItem) => item.sourceType,
          title: 'Source',
        },
        {
          key: 'effortHours',
          render: (item: WorkEvidenceViewItem) => `${item.effortHours}h`,
          title: 'Effort / Hours',
        },
        {
          key: 'activityDate',
          render: (item: WorkEvidenceViewItem) =>
            formatDateShort(item.activityDate),
          title: 'Activity Date',
        },
        {
          key: 'actions',
          render: (item: WorkEvidenceViewItem) =>
            EXTERNAL_TYPES.includes(item.sourceType) ? (
              <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>Read-only</span>
            ) : (
              <WorkEvidenceEditCell id={item.id} item={item} onUpdated={onUpdated} />
            ),
          title: 'Edit',
        },
      ]}
      emptyState={
        <EmptyState
          description="No work evidence matched the current query."
          title="No work evidence results"
        />
      }
      getRowKey={(item) => item.id}
      items={items}
    />
  );
}

interface WorkEvidenceEditCellProps {
  id: string;
  item: WorkEvidenceViewItem;
  onUpdated?: (id: string) => void;
}

function WorkEvidenceEditCell({ id, item, onUpdated }: WorkEvidenceEditCellProps): JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const [effortHours, setEffortHours] = useState(String(item.effortHours));
  const [summary, setSummary] = useState(item.summary ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isEditing) {
    return (
      <button
        className="button button--secondary"
        onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
        style={{ fontSize: '11px', padding: '2px 8px' }}
        type="button"
      >
        Edit
      </button>
    );
  }

  async function handleSave(): Promise<void> {
    setIsSaving(true);
    setError(null);
    try {
      await updateWorkEvidence(id, {
        effortHours: parseFloat(effortHours) || undefined,
        summary: summary || undefined,
      });
      setIsEditing(false);
      onUpdated?.(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div style={{ minWidth: '200px' }} onClick={(e) => e.stopPropagation()}>
      <label className="field" style={{ marginBottom: '4px' }}>
        <span className="field__label" style={{ fontSize: '11px' }}>Effort (hours)</span>
        <input
          className="field__control"
          onChange={(e) => setEffortHours(e.target.value)}
          style={{ fontSize: '12px', padding: '2px 4px' }}
          type="number"
          value={effortHours}
        />
      </label>
      <label className="field" style={{ marginBottom: '4px' }}>
        <span className="field__label" style={{ fontSize: '11px' }}>Summary</span>
        <input
          className="field__control"
          onChange={(e) => setSummary(e.target.value)}
          style={{ fontSize: '12px', padding: '2px 4px' }}
          value={summary}
        />
      </label>
      {error ? <p style={{ color: 'red', fontSize: '11px', margin: '2px 0' }}>{error}</p> : null}
      <div style={{ display: 'flex', gap: '4px' }}>
        <button
          className="button button--primary"
          disabled={isSaving}
          onClick={() => { void handleSave(); }}
          style={{ fontSize: '11px', padding: '2px 8px' }}
          type="button"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
        <button
          className="button button--secondary"
          onClick={() => setIsEditing(false)}
          style={{ fontSize: '11px', padding: '2px 8px' }}
          type="button"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
