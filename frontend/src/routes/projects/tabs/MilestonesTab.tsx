import { FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/app/auth-context';
import { PROJECT_CREATE_ROLES, hasAnyRole } from '@/app/route-manifest';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { InteractiveGantt } from '@/components/projects/InteractiveGantt';
import { MilestoneGanttSimple } from '@/components/projects/MilestoneGanttSimple';
import { ganttEnabledFor, type ProjectShape } from '@/features/project-pulse/shape-defaults';
import { formatDate } from '@/lib/format-date';
import {
  type MilestoneStatus,
  type ProjectMilestoneDto,
  createMilestone,
  deleteMilestone,
  fetchMilestones,
  updateMilestone,
} from '@/lib/api/project-milestones';

interface MilestonesTabProps {
  projectId: string;
  shape?: ProjectShape | null;
}

const STATUS_OPTIONS: MilestoneStatus[] = ['PLANNED', 'IN_PROGRESS', 'HIT', 'MISSED'];

function statusTone(status: MilestoneStatus): 'active' | 'warning' | 'danger' | 'neutral' {
  if (status === 'HIT') return 'active';
  if (status === 'IN_PROGRESS') return 'warning';
  if (status === 'MISSED') return 'danger';
  return 'neutral';
}

function toDateInput(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

export function MilestonesTab({ projectId, shape }: MilestonesTabProps): JSX.Element {
  const { principal } = useAuth();
  const canManage = hasAnyRole(principal?.roles, PROJECT_CREATE_ROLES);

  const [milestones, setMilestones] = useState<ProjectMilestoneDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createPlannedDate, setCreatePlannedDate] = useState('');
  const [createStatus, setCreateStatus] = useState<MilestoneStatus>('PLANNED');
  const [saving, setSaving] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPlannedDate, setEditPlannedDate] = useState('');
  const [editActualDate, setEditActualDate] = useState('');
  const [editStatus, setEditStatus] = useState<MilestoneStatus>('PLANNED');

  const [deleteTarget, setDeleteTarget] = useState<ProjectMilestoneDto | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void fetchMilestones(projectId)
      .then((m) => {
        if (active) setMilestones(m);
      })
      .catch(() => {
        if (active) toast.error('Failed to load milestones');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [projectId]);

  async function handleCreate(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!createName.trim() || !createPlannedDate) {
      toast.error('Name and planned date are required');
      return;
    }
    setSaving(true);
    try {
      const created = await createMilestone(projectId, {
        description: createDesc.trim() || undefined,
        name: createName.trim(),
        plannedDate: new Date(createPlannedDate).toISOString(),
        status: createStatus,
      });
      setMilestones((prev) => [...prev, created]);
      setCreateName('');
      setCreateDesc('');
      setCreatePlannedDate('');
      setCreateStatus('PLANNED');
      setShowCreate(false);
      toast.success('Milestone created');
    } catch {
      toast.error('Failed to create milestone');
    } finally {
      setSaving(false);
    }
  }

  function beginEdit(m: ProjectMilestoneDto): void {
    setEditId(m.id);
    setEditName(m.name);
    setEditDesc(m.description ?? '');
    setEditPlannedDate(toDateInput(m.plannedDate));
    setEditActualDate(toDateInput(m.actualDate));
    setEditStatus(m.status);
  }

  async function handleSaveEdit(): Promise<void> {
    if (!editId) return;
    setSaving(true);
    try {
      const updated = await updateMilestone(projectId, editId, {
        actualDate: editActualDate ? new Date(editActualDate).toISOString() : undefined,
        description: editDesc.trim() || undefined,
        name: editName.trim(),
        plannedDate: editPlannedDate ? new Date(editPlannedDate).toISOString() : undefined,
        status: editStatus,
      });
      setMilestones((prev) => prev.map((m) => (m.id === editId ? updated : m)));
      setEditId(null);
      toast.success('Milestone updated');
    } catch {
      toast.error('Failed to update milestone');
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDelete(): Promise<void> {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteMilestone(projectId, deleteTarget.id);
      setMilestones((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      toast.success('Milestone deleted');
    } catch {
      toast.error('Failed to delete milestone');
    } finally {
      setDeleteTarget(null);
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Loading milestones…" variant="skeleton" skeletonType="detail" />;

  return (
    <div
      data-testid="milestones-tab"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
    >
      <ConfirmDialog
        confirmLabel="Delete"
        message={deleteTarget ? `Delete milestone "${deleteTarget.name}"? This cannot be undone.` : ''}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleConfirmDelete()}
        open={deleteTarget !== null}
        title="Delete Milestone"
      />

      <SectionCard collapsible={milestones.length === 0} defaultCollapsed={milestones.length === 0} title="Timeline">
        {ganttEnabledFor(shape) ? (
          <InteractiveGantt
            canEdit={canManage}
            milestones={milestones}
            onChange={() => {
              void fetchMilestones(projectId)
                .then((next) => setMilestones(next))
                .catch(() => undefined);
            }}
            onOpenEditor={(id) => {
              const target = milestones.find((m) => m.id === id);
              if (target) beginEdit(target);
            }}
            projectId={projectId}
          />
        ) : (
          <MilestoneGanttSimple milestones={milestones} />
        )}
      </SectionCard>

      <SectionCard
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span>Milestones ({milestones.length})</span>
            {canManage && !showCreate ? (
              <button
                className="button button--secondary button--sm"
                onClick={() => setShowCreate(true)}
                type="button"
              >
                + New Milestone
              </button>
            ) : null}
          </span>
        }
      >
        {showCreate ? (
          <form onSubmit={(e) => void handleCreate(e)} style={{ marginBottom: 'var(--space-4)' }}>
            <div className="form-grid">
              <label className="field">
                <span className="field__label">Name</span>
                <input
                  className="field__control"
                  onChange={(e) => setCreateName(e.target.value)}
                  required
                  type="text"
                  value={createName}
                />
              </label>
              <label className="field">
                <span className="field__label">Description</span>
                <input
                  className="field__control"
                  onChange={(e) => setCreateDesc(e.target.value)}
                  type="text"
                  value={createDesc}
                />
              </label>
              <label className="field">
                <span className="field__label">Planned Date</span>
                <input
                  className="field__control"
                  onChange={(e) => setCreatePlannedDate(e.target.value)}
                  required
                  type="date"
                  value={createPlannedDate}
                />
              </label>
              <label className="field">
                <span className="field__label">Status</span>
                <select
                  className="field__control"
                  onChange={(e) => setCreateStatus(e.target.value as MilestoneStatus)}
                  value={createStatus}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
              <button className="button button--primary" disabled={saving} type="submit">
                {saving ? 'Saving…' : 'Create'}
              </button>
              <button
                className="button button--secondary"
                onClick={() => setShowCreate(false)}
                type="button"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        {milestones.length === 0 ? (
          <EmptyState
            description="No milestones yet. Create one to start tracking delivery commitments."
            title="No milestones"
          />
        ) : (
          <table className="dash-compact-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Name</th>
                <th style={{ textAlign: 'left' }}>Description</th>
                <th style={{ textAlign: 'left', width: 130 }}>Planned</th>
                <th style={{ textAlign: 'left', width: 130 }}>Actual</th>
                <th style={{ textAlign: 'left', width: 120 }}>Status</th>
                {canManage ? <th style={{ textAlign: 'right', width: 160 }}>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {milestones.map((m) => {
                const isEditing = editId === m.id;
                if (isEditing) {
                  return (
                    <tr key={m.id}>
                      <td>
                        <input
                          className="field__control"
                          onChange={(e) => setEditName(e.target.value)}
                          type="text"
                          value={editName}
                        />
                      </td>
                      <td>
                        <input
                          className="field__control"
                          onChange={(e) => setEditDesc(e.target.value)}
                          type="text"
                          value={editDesc}
                        />
                      </td>
                      <td>
                        <input
                          className="field__control"
                          onChange={(e) => setEditPlannedDate(e.target.value)}
                          type="date"
                          value={editPlannedDate}
                        />
                      </td>
                      <td>
                        <input
                          className="field__control"
                          onChange={(e) => setEditActualDate(e.target.value)}
                          type="date"
                          value={editActualDate}
                        />
                      </td>
                      <td>
                        <select
                          className="field__control"
                          onChange={(e) => setEditStatus(e.target.value as MilestoneStatus)}
                          value={editStatus}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s.replace('_', ' ')}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end' }}>
                          <button
                            className="button button--primary button--sm"
                            disabled={saving}
                            onClick={() => void handleSaveEdit()}
                            type="button"
                          >
                            Save
                          </button>
                          <button
                            className="button button--secondary button--sm"
                            onClick={() => setEditId(null)}
                            type="button"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 500 }}>{m.name}</td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{m.description ?? '—'}</td>
                    <td>{formatDate(m.plannedDate)}</td>
                    <td>{m.actualDate ? formatDate(m.actualDate) : '—'}</td>
                    <td>
                      <StatusBadge
                        label={m.status.replace('_', ' ')}
                        tone={statusTone(m.status)}
                        variant="chip"
                      />
                    </td>
                    {canManage ? (
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end' }}>
                          <button
                            className="button button--secondary button--sm"
                            onClick={() => beginEdit(m)}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="button button--secondary button--sm"
                            onClick={() => setDeleteTarget(m)}
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </SectionCard>
    </div>
  );
}
