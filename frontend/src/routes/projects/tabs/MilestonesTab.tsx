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
import { Button, DatePicker, Input, Select, Table, type Column } from '@/components/ds';

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
              <Button variant="secondary" size="sm" onClick={() => setShowCreate(true)} type="button">
                + New Milestone
              </Button>
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
                <DatePicker onValueChange={(value) => setCreatePlannedDate(value)}
 required value={createPlannedDate}
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
              <Button variant="primary" disabled={saving} type="submit">
                {saving ? 'Saving…' : 'Create'}
              </Button>
              <Button variant="secondary" onClick={() => setShowCreate(false)} type="button">
                Cancel
              </Button>
            </div>
          </form>
        ) : null}

        {milestones.length === 0 ? (
          <EmptyState
            description="No milestones yet. Create one to start tracking delivery commitments."
            title="No milestones"
          />
        ) : (() => {
          const baseColumns: Column<ProjectMilestoneDto>[] = [
            { key: 'name', title: 'Name', getValue: (m) => m.name, render: (m) => (
              editId === m.id
                ? <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                : <span style={{ fontWeight: 500 }}>{m.name}</span>
            ) },
            { key: 'desc', title: 'Description', getValue: (m) => m.description ?? '', render: (m) => (
              editId === m.id
                ? <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
                : <span style={{ color: 'var(--color-text-muted)' }}>{m.description ?? '—'}</span>
            ) },
            { key: 'planned', title: 'Planned', width: 130, getValue: (m) => m.plannedDate, render: (m) => (
              editId === m.id
                ? <DatePicker onValueChange={setEditPlannedDate} value={editPlannedDate} />
                : formatDate(m.plannedDate)
            ) },
            { key: 'actual', title: 'Actual', width: 130, getValue: (m) => m.actualDate ?? '', render: (m) => (
              editId === m.id
                ? <DatePicker onValueChange={setEditActualDate} value={editActualDate} />
                : (m.actualDate ? formatDate(m.actualDate) : '—')
            ) },
            { key: 'status', title: 'Status', width: 120, getValue: (m) => m.status, render: (m) => (
              editId === m.id ? (
                <Select value={editStatus} onChange={(e) => setEditStatus(e.target.value as MilestoneStatus)}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </Select>
              ) : (
                <StatusBadge label={m.status.replace('_', ' ')} tone={statusTone(m.status)} variant="chip" />
              )
            ) },
          ];
          if (canManage) {
            baseColumns.push({ key: 'actions', title: 'Actions', align: 'right', width: 160, render: (m) => (
              editId === m.id ? (
                <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end' }}>
                  <Button variant="primary" size="sm" disabled={saving} onClick={() => void handleSaveEdit()} type="button">Save</Button>
                  <Button variant="secondary" size="sm" onClick={() => setEditId(null)} type="button">Cancel</Button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end' }}>
                  <Button variant="secondary" size="sm" onClick={() => beginEdit(m)} type="button">Edit</Button>
                  <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(m)} type="button">Delete</Button>
                </div>
              )
            ) });
          }
          return (
            <Table
              variant="compact"
              columns={baseColumns}
              rows={milestones}
              getRowKey={(m) => m.id}
            />
          );
        })()}
      </SectionCard>
    </div>
  );
}
