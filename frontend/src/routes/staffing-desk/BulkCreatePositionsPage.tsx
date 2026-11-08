import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useAuth } from '@/app/auth-context';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { Button, Table, type Column } from '@/components/ds';
import {
  createProjectPosition,
  type CreateProjectPositionRequest,
} from '@/lib/api/project-positions';
import {
  fetchProjectDirectory,
  type ProjectDirectoryItem,
} from '@/lib/api/project-registry';

// W2-05 — /staffing-requests/bulk "create multiple positions at once" surface.
// Companion to CreatePositionPage (single position) and the BulkReassignPanel
// (existing-position reassignment from issue 542). PM/RM JTBD: stand up a
// whole project team in one pass without round-tripping the single-position
// form.

const COMMON_ROLES = [
  'Senior Frontend Engineer',
  'Frontend Engineer',
  'Senior Backend Engineer',
  'Backend Engineer',
  'Full-Stack Engineer',
  'Mobile Engineer',
  'QA Engineer',
  'Data Engineer',
  'ML Engineer',
  'DevOps Engineer',
  'Platform Engineer',
  'Security Engineer',
  'Solution Architect',
  'Engineering Manager',
  'Product Manager',
  'Project Manager',
  'Tech Lead',
  'Staff Engineer',
  'Designer',
  'Business Analyst',
];

interface RowState {
  rowKey: string;
  projectId: string;
  role: string;
  customRole: string;
  requiredAllocationPercent: string;
  startDate: string;
  endDate: string;
  summary: string;
  status: 'pending' | 'creating' | 'created' | 'failed';
  error?: string;
  createdPositionId?: string;
}

interface RowErrors {
  projectId?: string;
  role?: string;
  startDate?: string;
  endDate?: string;
  requiredAllocationPercent?: string;
}

let rowKeySeq = 0;
function nextRowKey(): string {
  rowKeySeq += 1;
  return `row-${rowKeySeq}`;
}

function blankRow(seed?: Partial<RowState>): RowState {
  return {
    rowKey: nextRowKey(),
    projectId: '',
    role: '',
    customRole: '',
    requiredAllocationPercent: '100',
    startDate: '',
    endDate: '',
    summary: '',
    status: 'pending',
    ...seed,
  };
}

function resolveRole(row: RowState): string {
  return row.role === '__custom' ? row.customRole.trim() : row.role.trim();
}

function validateRow(row: RowState): RowErrors {
  const errors: RowErrors = {};
  if (!row.projectId) errors.projectId = 'Project is required';
  if (!resolveRole(row)) errors.role = 'Role is required';
  if (!row.startDate) errors.startDate = 'Start date is required';
  if (!row.endDate) errors.endDate = 'End date is required';
  if (row.startDate && row.endDate && row.startDate > row.endDate) {
    errors.endDate = 'End must be ≥ start';
  }
  const alloc = Number(row.requiredAllocationPercent);
  if (Number.isNaN(alloc) || alloc <= 0 || alloc > 100) {
    errors.requiredAllocationPercent = '1–100';
  }
  return errors;
}

export function BulkCreatePositionsPage(): JSX.Element {
  const { principal } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<RowState[]>(() => [blankRow(), blankRow(), blankRow()]);
  const [projects, setProjects] = useState<ProjectDirectoryItem[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [openImmediately, setOpenImmediately] = useState(true);
  const [defaultProjectId, setDefaultProjectId] = useState<string>('');

  useEffect(() => {
    let active = true;
    setProjectsLoading(true);
    setProjectsError(null);
    fetchProjectDirectory({ pageSize: 200 })
      .then((response) => {
        if (!active) return;
        const eligible = response.items.filter(
          (p) => !['CLOSED', 'ARCHIVED', 'CANCELLED', 'COMPLETED'].includes(p.status.toUpperCase()),
        );
        setProjects(eligible);
      })
      .catch((e: unknown) => {
        if (!active) return;
        setProjectsError(e instanceof Error ? e.message : 'Could not load projects.');
      })
      .finally(() => {
        if (active) setProjectsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function updateRow(rowKey: string, patch: Partial<RowState>): void {
    setRows((prev) => prev.map((r) => (r.rowKey === rowKey ? { ...r, ...patch } : r)));
  }

  function addRow(): void {
    setRows((prev) => [...prev, blankRow({ projectId: defaultProjectId })]);
  }

  function removeRow(rowKey: string): void {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.rowKey !== rowKey) : prev));
  }

  function applyDefaultProjectToEmpty(): void {
    if (!defaultProjectId) return;
    setRows((prev) =>
      prev.map((r) => (r.projectId === '' ? { ...r, projectId: defaultProjectId } : r)),
    );
  }

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setSubmitError(null);
    if (!principal?.personId) {
      setSubmitError('You must be signed in.');
      return;
    }

    // Only submit rows still pending — already-created ones stay green on retry.
    const queue = rows.filter((r) => r.status !== 'created');
    if (queue.length === 0) {
      setSubmitError('Nothing to create — every row is already opened.');
      return;
    }

    // Validate every queued row up-front so the user sees all failures at once.
    const rowValidation = queue.map((r) => ({ row: r, errors: validateRow(r) }));
    const invalid = rowValidation.filter((v) => Object.keys(v.errors).length > 0);
    if (invalid.length > 0) {
      setSubmitError(`Fix ${invalid.length} invalid row(s) before submitting.`);
      return;
    }

    setSubmitting(true);
    // Sequential calls — keeps audit ordering deterministic and avoids
    // hammering the BE if the operator is opening 30+ positions.
    let created = 0;
    let failed = 0;
    for (const row of queue) {
      updateRow(row.rowKey, { status: 'creating', error: undefined });
      try {
        const request: CreateProjectPositionRequest = {
          projectId: row.projectId,
          role: resolveRole(row),
          requiredAllocationPercent: Number(row.requiredAllocationPercent),
          startDate: row.startDate,
          endDate: row.endDate,
          summary: row.summary.trim() || undefined,
          requestedByPersonId: principal.personId,
          openImmediately,
        };
        const result = await createProjectPosition(request);
        updateRow(row.rowKey, { status: 'created', createdPositionId: result.id });
        created += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Create failed.';
        updateRow(row.rowKey, { status: 'failed', error: message });
        failed += 1;
      }
    }

    setSubmitting(false);

    if (failed === 0) {
      toast.success(`Opened ${created} position${created === 1 ? '' : 's'}.`);
      navigate('/staffing-desk?view=table');
      return;
    }
    if (created === 0) {
      setSubmitError(`All ${failed} row(s) failed. Review errors below and retry.`);
      return;
    }
    setSubmitError(
      `${created} created, ${failed} failed. Fix the red rows and re-submit — created rows are skipped on retry.`,
    );
    toast.error(`${failed} of ${queue.length} positions failed to open.`);
  }

  const pendingCount = rows.filter((r) => r.status !== 'created').length;
  const createdCount = rows.filter((r) => r.status === 'created').length;
  const failedCount = rows.filter((r) => r.status === 'failed').length;

  return (
    <PageContainer testId="bulk-create-positions-page">
      <PageHeader
        eyebrow="Staffing"
        title="Open multiple positions"
        subtitle="Stand up a whole project team in one pass. Each row becomes a ProjectPosition."
      />
      <SectionCard title="Bulk position details">
        {projectsLoading ? (
          <LoadingState label="Loading projects…" />
        ) : projectsError ? (
          <ErrorState description={projectsError} />
        ) : (
          <form
            onSubmit={(e) => {
              void handleSubmit(e);
            }}
            noValidate
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
          >
            {submitError && <ErrorState description={submitError} />}

            <div
              style={{
                display: 'flex',
                gap: 'var(--space-2)',
                alignItems: 'flex-end',
                flexWrap: 'wrap',
              }}
            >
              <label className="field" style={{ flex: 1, minWidth: 240 }}>
                <span className="field__label">Default project (apply to empty rows)</span>
                <select
                  className="field__control"
                  value={defaultProjectId}
                  onChange={(e) => setDefaultProjectId(e.target.value)}
                  disabled={submitting}
                  data-testid="bulk-create-default-project"
                >
                  <option value="">No default…</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.projectCode} — {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                type="button"
                variant="secondary"
                onClick={applyDefaultProjectToEmpty}
                disabled={!defaultProjectId || submitting}
                data-testid="bulk-create-apply-default"
              >
                Apply to empty rows
              </Button>
            </div>

            <Table<RowState>
              testId="bulk-create-table"
              variant="compact"
              rows={rows}
              getRowKey={(r) => r.rowKey}
              columns={bulkColumns({
                rows,
                projects,
                submitting,
                onUpdate: updateRow,
                onRemove: removeRow,
              })}
            />

            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <Button
                type="button"
                variant="secondary"
                onClick={addRow}
                disabled={submitting}
                data-testid="bulk-create-add-row"
              >
                + Add row
              </Button>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                {rows.length} row{rows.length === 1 ? '' : 's'} · {pendingCount} pending ·{' '}
                {createdCount} opened · {failedCount} failed
              </span>
            </div>

            <label style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={openImmediately}
                onChange={(e) => setOpenImmediately(e.target.checked)}
                disabled={submitting}
                data-testid="bulk-create-open-immediately"
              />
              <span>Open immediately (skip DRAFT — surface on staffing desk right away)</span>
            </label>

            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
              <Button
                type="submit"
                variant="primary"
                disabled={submitting || pendingCount === 0}
                data-testid="bulk-create-submit"
              >
                {submitting
                  ? `Opening ${pendingCount}…`
                  : `Open ${pendingCount} position${pendingCount === 1 ? '' : 's'}`}
              </Button>
              <Link to="/staffing-desk?view=table">
                <Button type="button" variant="secondary" disabled={submitting}>
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        )}
      </SectionCard>
    </PageContainer>
  );
}

interface BulkColumnsParams {
  rows: RowState[];
  projects: ProjectDirectoryItem[];
  submitting: boolean;
  onUpdate: (rowKey: string, patch: Partial<RowState>) => void;
  onRemove: (rowKey: string) => void;
}

function bulkColumns(params: BulkColumnsParams): Column<RowState>[] {
  const { rows, projects, submitting, onUpdate, onRemove } = params;
  return [
    {
      key: 'idx',
      title: '#',
      width: 32,
      render: (_row, index) => (
        <span style={{ color: 'var(--color-text-muted)' }}>{index + 1}</span>
      ),
    },
    {
      key: 'project',
      title: 'Project',
      render: (row, index) => {
        const errors = validateRow(row);
        const created = row.status === 'created';
        return (
          <select
            className="field__control"
            value={row.projectId}
            onChange={(e) => onUpdate(row.rowKey, { projectId: e.target.value })}
            disabled={submitting || created}
            aria-invalid={Boolean(errors.projectId)}
            aria-label={`Row ${index + 1} project`}
            data-testid={`bulk-create-row-${index}-project`}
          >
            <option value="">Select…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.projectCode} — {p.name}
              </option>
            ))}
          </select>
        );
      },
    },
    {
      key: 'role',
      title: 'Role',
      render: (row, index) => {
        const errors = validateRow(row);
        const created = row.status === 'created';
        return (
          <>
            <select
              className="field__control"
              value={row.role}
              onChange={(e) => onUpdate(row.rowKey, { role: e.target.value })}
              disabled={submitting || created}
              aria-invalid={Boolean(errors.role)}
              aria-label={`Row ${index + 1} role`}
              data-testid={`bulk-create-row-${index}-role`}
            >
              <option value="">Select…</option>
              {COMMON_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
              <option value="__custom">Other…</option>
            </select>
            {row.role === '__custom' && (
              <input
                className="field__control"
                type="text"
                value={row.customRole}
                onChange={(e) => onUpdate(row.rowKey, { customRole: e.target.value })}
                placeholder="Custom role"
                disabled={submitting || created}
                aria-label={`Row ${index + 1} custom role`}
                data-testid={`bulk-create-row-${index}-custom-role`}
                style={{ marginTop: 'var(--space-1)' }}
              />
            )}
          </>
        );
      },
    },
    {
      key: 'start',
      title: 'Start',
      width: 110,
      render: (row, index) => {
        const errors = validateRow(row);
        const created = row.status === 'created';
        return (
          <input
            className="field__control"
            type="date"
            value={row.startDate}
            onChange={(e) => onUpdate(row.rowKey, { startDate: e.target.value })}
            disabled={submitting || created}
            aria-invalid={Boolean(errors.startDate)}
            aria-label={`Row ${index + 1} start date`}
            data-testid={`bulk-create-row-${index}-start`}
          />
        );
      },
    },
    {
      key: 'end',
      title: 'End',
      width: 110,
      render: (row, index) => {
        const errors = validateRow(row);
        const created = row.status === 'created';
        return (
          <input
            className="field__control"
            type="date"
            value={row.endDate}
            onChange={(e) => onUpdate(row.rowKey, { endDate: e.target.value })}
            disabled={submitting || created}
            aria-invalid={Boolean(errors.endDate)}
            aria-label={`Row ${index + 1} end date`}
            data-testid={`bulk-create-row-${index}-end`}
          />
        );
      },
    },
    {
      key: 'alloc',
      title: 'Alloc %',
      width: 80,
      render: (row, index) => {
        const errors = validateRow(row);
        const created = row.status === 'created';
        return (
          <input
            className="field__control"
            type="number"
            min={1}
            max={100}
            value={row.requiredAllocationPercent}
            onChange={(e) =>
              onUpdate(row.rowKey, { requiredAllocationPercent: e.target.value })
            }
            disabled={submitting || created}
            aria-invalid={Boolean(errors.requiredAllocationPercent)}
            aria-label={`Row ${index + 1} allocation percent`}
            data-testid={`bulk-create-row-${index}-alloc`}
          />
        );
      },
    },
    {
      key: 'status',
      title: 'Status',
      width: 110,
      render: (row, index) => {
        const created = row.status === 'created';
        const failed = row.status === 'failed';
        const creating = row.status === 'creating';
        const color = created
          ? 'var(--color-status-active)'
          : failed
            ? 'var(--color-status-danger)'
            : creating
              ? 'var(--color-status-info)'
              : 'var(--color-text-muted)';
        return (
          <span
            data-testid={`bulk-create-row-${index}-status`}
            style={{ fontSize: 11, color }}
          >
            {created && 'Opened'}
            {creating && 'Opening…'}
            {failed && (row.error ?? 'Failed')}
            {row.status === 'pending' && 'Pending'}
          </span>
        );
      },
    },
    {
      key: 'remove',
      title: '',
      width: 40,
      render: (row, index) => (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(row.rowKey)}
          disabled={submitting || rows.length <= 1 || row.status === 'created'}
          aria-label={`Remove row ${index + 1}`}
          data-testid={`bulk-create-row-${index}-remove`}
        >
          ×
        </Button>
      ),
    },
  ];
}
