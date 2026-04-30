import { EmptyState } from '@/components/common/EmptyState';
import { WorkEvidenceViewItem } from '@/features/work-evidence/useWorkEvidencePage';
import { updateWorkEvidence } from '@/lib/api/work-evidence';
import { formatDateShort } from '@/lib/format-date';
import { DataView, type Column } from '@/components/ds';

const EXTERNAL_TYPES = new Set(['JIRA_WORKLOG', 'MEETING']);
const isEditable = (item: WorkEvidenceViewItem): boolean => !EXTERNAL_TYPES.has(item.sourceType);

interface WorkEvidenceTableProps {
  items: WorkEvidenceViewItem[];
  onUpdated?: (id: string) => void;
}

/**
 * Phase DS-4-11 (re-targeted) — first real consumer of `Column.edit` (DS-4-5).
 *
 * The deferred-items register listed `ProjectDashboardPage` as the inline-edit
 * target, but that page has no inline-edit cells today (the entry was
 * speculative). The actual click-to-edit-in-cell pattern in the codebase is
 * here: `WorkEvidenceTable` previously used a custom `WorkEvidenceEditCell`
 * with an "Edit" button → expanded form. Migrated to:
 *
 *   - `<DataView>` chrome (replacing legacy `DataTable`)
 *   - per-cell `edit` on `effortHours` (number) and `summary` (text)
 *   - `enabledFor: isEditable` keeps external sources (Jira, Meeting)
 *     read-only — those rows render as plain display with no hover affordance
 *
 * `summary` was previously hidden behind the Edit form; surfacing it as a
 * visible column means the data is now readable inline instead of after a
 * click.
 */
export function WorkEvidenceTable({ items, onUpdated }: WorkEvidenceTableProps): JSX.Element {
  const columns: Column<WorkEvidenceViewItem>[] = [
    {
      key: 'person',
      title: 'Person',
      getValue: (item) => item.personName,
      sortable: true,
    },
    {
      key: 'project',
      title: 'Project',
      getValue: (item) => item.projectName,
      sortable: true,
    },
    {
      key: 'source',
      title: 'Source',
      getValue: (item) => item.sourceType,
      sortable: true,
      width: 110,
    },
    {
      key: 'effortHours',
      title: 'Effort (h)',
      align: 'right',
      width: 90,
      getValue: (item) => item.effortHours,
      render: (item) => `${item.effortHours}h`,
      sortable: true,
      edit: {
        kind: 'number',
        enabledFor: isEditable,
        validate: (next) => {
          const n = Number(next);
          if (Number.isNaN(n)) return 'Must be a number';
          if (n < 0) return 'Must be ≥ 0';
          return null;
        },
        commit: async (item, next) => {
          await updateWorkEvidence(item.id, { effortHours: Number(next) });
          onUpdated?.(item.id);
        },
      },
    },
    {
      key: 'summary',
      title: 'Summary',
      getValue: (item) => item.summary ?? '',
      render: (item) => (
        <span style={{ color: 'var(--color-text-muted)' }}>
          {item.summary ?? '—'}
        </span>
      ),
      edit: {
        kind: 'text',
        enabledFor: isEditable,
        commit: async (item, next) => {
          const value = String(next ?? '').trim();
          await updateWorkEvidence(item.id, { summary: value || undefined });
          onUpdated?.(item.id);
        },
      },
    },
    {
      key: 'activityDate',
      title: 'Activity Date',
      align: 'right',
      width: 110,
      getValue: (item) => item.activityDate.slice(0, 10),
      render: (item) => formatDateShort(item.activityDate),
      sortable: true,
    },
  ];

  return (
    <DataView
      columns={columns}
      rows={items}
      getRowKey={(item) => item.id}
      pageSizeOptions={[1000]}
      emptyState={
        <EmptyState
          description="No work evidence matched the current query."
          title="No work evidence results"
        />
      }
    />
  );
}
