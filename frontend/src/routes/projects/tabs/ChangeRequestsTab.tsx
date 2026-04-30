import { FormEvent, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/app/auth-context';
import { PROJECT_CREATE_ROLES, hasAnyRole } from '@/app/route-manifest';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  type ChangeRequestSeverity,
  type ChangeRequestStatus,
  type ProjectChangeRequestDto,
  approveChangeRequest,
  createChangeRequest,
  fetchChangeRequests,
  rejectChangeRequest,
  updateChangeRequest,
} from '@/lib/api/project-change-requests';
import { Button, Input, Select, Table, Textarea, type Column } from '@/components/ds';

interface ChangeRequestsTabProps {
  projectId: string;
}

const STATUS_OPTIONS: ChangeRequestStatus[] = ['PROPOSED', 'APPROVED', 'REJECTED', 'WITHDRAWN'];
const SEVERITY_OPTIONS: ChangeRequestSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

function severityTone(sev: ChangeRequestSeverity): 'active' | 'info' | 'warning' | 'danger' {
  if (sev === 'LOW') return 'active';
  if (sev === 'MEDIUM') return 'info';
  if (sev === 'HIGH') return 'warning';
  return 'danger';
}

function statusTone(st: ChangeRequestStatus): 'active' | 'warning' | 'danger' | 'neutral' {
  if (st === 'APPROVED') return 'active';
  if (st === 'PROPOSED') return 'warning';
  if (st === 'REJECTED') return 'danger';
  return 'neutral';
}

function composeImpact(cr: ProjectChangeRequestDto): string {
  const parts: string[] = [];
  if (cr.impactScope) parts.push(`Scope: ${cr.impactScope}`);
  if (cr.impactSchedule) parts.push(`Schedule: ${cr.impactSchedule}`);
  if (cr.impactBudget) parts.push(`Budget: ${cr.impactBudget}`);
  return parts.join(' · ');
}

export function ChangeRequestsTab({ projectId }: ChangeRequestsTabProps): JSX.Element {
  const { principal } = useAuth();
  const canManage = hasAnyRole(principal?.roles, PROJECT_CREATE_ROLES);

  const [crs, setCrs] = useState<ProjectChangeRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<ChangeRequestStatus | ''>('');
  const [filterSeverity, setFilterSeverity] = useState<ChangeRequestSeverity | ''>('');
  const [oobOnly, setOobOnly] = useState(false);
  const [saving, setSaving] = useState(false);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newSeverity, setNewSeverity] = useState<ChangeRequestSeverity>('MEDIUM');
  const [newOob, setNewOob] = useState(false);
  const [newImpactScope, setNewImpactScope] = useState('');
  const [newImpactSchedule, setNewImpactSchedule] = useState('');
  const [newImpactBudget, setNewImpactBudget] = useState('');

  // Edit
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editSeverity, setEditSeverity] = useState<ChangeRequestSeverity>('MEDIUM');
  const [editOob, setEditOob] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void fetchChangeRequests(projectId)
      .then((rows) => {
        if (active) setCrs(rows);
      })
      .catch(() => {
        if (active) toast.error('Failed to load change requests');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [projectId]);

  const filtered = useMemo(() => {
    return crs.filter((cr) => {
      if (filterStatus && cr.status !== filterStatus) return false;
      if (filterSeverity && cr.severity !== filterSeverity) return false;
      if (oobOnly && !cr.outOfBaseline) return false;
      return true;
    });
  }, [crs, filterStatus, filterSeverity, oobOnly]);

  async function handleCreate(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Title required');
      return;
    }
    setSaving(true);
    try {
      const created = await createChangeRequest(projectId, {
        description: newDesc.trim() || undefined,
        impactBudget: newImpactBudget.trim() || undefined,
        impactSchedule: newImpactSchedule.trim() || undefined,
        impactScope: newImpactScope.trim() || undefined,
        outOfBaseline: newOob,
        severity: newSeverity,
        title: newTitle.trim(),
      });
      setCrs((prev) => [created, ...prev]);
      setNewTitle('');
      setNewDesc('');
      setNewSeverity('MEDIUM');
      setNewOob(false);
      setNewImpactScope('');
      setNewImpactSchedule('');
      setNewImpactBudget('');
      setShowCreate(false);
      toast.success('Change request created');
    } catch {
      toast.error('Failed to create change request');
    } finally {
      setSaving(false);
    }
  }

  function beginEdit(cr: ProjectChangeRequestDto): void {
    setEditId(cr.id);
    setEditTitle(cr.title);
    setEditDesc(cr.description ?? '');
    setEditSeverity(cr.severity);
    setEditOob(cr.outOfBaseline);
  }

  async function handleSaveEdit(): Promise<void> {
    if (!editId) return;
    setSaving(true);
    try {
      const updated = await updateChangeRequest(projectId, editId, {
        description: editDesc.trim() || undefined,
        outOfBaseline: editOob,
        severity: editSeverity,
        title: editTitle.trim(),
      });
      setCrs((prev) => prev.map((x) => (x.id === editId ? updated : x)));
      setEditId(null);
      toast.success('Change request updated');
    } catch {
      toast.error('Failed to update change request');
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove(cr: ProjectChangeRequestDto): Promise<void> {
    setSaving(true);
    try {
      const updated = await approveChangeRequest(projectId, cr.id);
      setCrs((prev) => prev.map((x) => (x.id === cr.id ? updated : x)));
      toast.success('Change request approved');
    } catch {
      toast.error('Failed to approve');
    } finally {
      setSaving(false);
    }
  }

  async function handleReject(cr: ProjectChangeRequestDto): Promise<void> {
    setSaving(true);
    try {
      const updated = await rejectChangeRequest(projectId, cr.id);
      setCrs((prev) => prev.map((x) => (x.id === cr.id ? updated : x)));
      toast.success('Change request rejected');
    } catch {
      toast.error('Failed to reject');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Loading change requests…" skeletonType="detail" variant="skeleton" />;

  return (
    <div
      data-testid="change-requests-tab"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
    >
      <SectionCard
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span>Change Requests ({crs.length})</span>
            {canManage && !showCreate ? (
              <Button variant="secondary" size="sm" onClick={() => setShowCreate(true)} type="button">
                + New Change Request
              </Button>
            ) : null}
          </span>
        }
      >
        {/* Filters */}
        <div
          style={{
            alignItems: 'end',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--space-3)',
            marginBottom: 'var(--space-3)',
          }}
        >
          <label className="field" style={{ minWidth: 160 }}>
            <span className="field__label">Status</span>
            <select
              className="field__control"
              onChange={(e) => setFilterStatus(e.target.value as ChangeRequestStatus | '')}
              value={filterStatus}
            >
              <option value="">All</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="field" style={{ minWidth: 160 }}>
            <span className="field__label">Severity</span>
            <select
              className="field__control"
              onChange={(e) => setFilterSeverity(e.target.value as ChangeRequestSeverity | '')}
              value={filterSeverity}
            >
              <option value="">All</option>
              {SEVERITY_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label style={{ alignItems: 'center', display: 'flex', fontSize: 12, gap: 'var(--space-2)' }}>
            <input checked={oobOnly} onChange={(e) => setOobOnly(e.target.checked)} type="checkbox" />
            Out-of-baseline only
          </label>
        </div>

        {/* Create form */}
        {showCreate ? (
          <form onSubmit={(e) => void handleCreate(e)} style={{ marginBottom: 'var(--space-4)' }}>
            <div className="form-grid">
              <label className="field">
                <span className="field__label">Title</span>
                <input
                  className="field__control"
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  type="text"
                  value={newTitle}
                />
              </label>
              <label className="field">
                <span className="field__label">Severity</span>
                <select
                  className="field__control"
                  onChange={(e) => setNewSeverity(e.target.value as ChangeRequestSeverity)}
                  value={newSeverity}
                >
                  {SEVERITY_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" style={{ gridColumn: '1 / -1' }}>
                <span className="field__label">Description</span>
                <textarea
                  className="field__control"
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={2}
                  value={newDesc}
                />
              </label>
              <label className="field">
                <span className="field__label">Impact — Scope</span>
                <input
                  className="field__control"
                  onChange={(e) => setNewImpactScope(e.target.value)}
                  type="text"
                  value={newImpactScope}
                />
              </label>
              <label className="field">
                <span className="field__label">Impact — Schedule</span>
                <input
                  className="field__control"
                  onChange={(e) => setNewImpactSchedule(e.target.value)}
                  type="text"
                  value={newImpactSchedule}
                />
              </label>
              <label className="field">
                <span className="field__label">Impact — Budget</span>
                <input
                  className="field__control"
                  onChange={(e) => setNewImpactBudget(e.target.value)}
                  type="text"
                  value={newImpactBudget}
                />
              </label>
              <label style={{ alignItems: 'center', display: 'flex', fontSize: 12, gap: 'var(--space-2)' }}>
                <input checked={newOob} onChange={(e) => setNewOob(e.target.checked)} type="checkbox" />
                Out-of-baseline
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

        {filtered.length === 0 ? (
          <EmptyState
            description={
              crs.length === 0
                ? 'No change requests logged yet.'
                : 'No change requests match the current filters.'
            }
            title="No change requests"
          />
        ) : (() => {
          const baseColumns: Column<ProjectChangeRequestDto>[] = [
            { key: 'index', title: '#', width: 30, render: (_cr: ProjectChangeRequestDto, idx: number) => idx + 1 },
            { key: 'title', title: 'Title', getValue: (cr) => cr.title, render: (cr) => (
              editId === cr.id ? (
                <>
                  <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                  <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={2} style={{ marginTop: 4 }} />
                </>
              ) : (
                <>
                  <div style={{ fontWeight: 500 }}>{cr.title}</div>
                  {cr.description ? <div style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{cr.description}</div> : null}
                </>
              )
            ) },
            { key: 'severity', title: 'Severity', width: 100, getValue: (cr) => cr.severity, render: (cr) => (
              editId === cr.id ? (
                <Select value={editSeverity} onChange={(e) => setEditSeverity(e.target.value as ChangeRequestSeverity)}>
                  {SEVERITY_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
              ) : (
                <StatusBadge label={cr.severity} tone={severityTone(cr.severity)} variant="chip" />
              )
            ) },
            { key: 'status', title: 'Status', width: 100, getValue: (cr) => cr.status, render: (cr) => (
              editId === cr.id ? cr.status : <StatusBadge label={cr.status} tone={statusTone(cr.status)} variant="chip" />
            ) },
            { key: 'oob', title: 'OOB', width: 80, align: 'center', getValue: (cr) => cr.outOfBaseline ? 1 : 0, render: (cr) => (
              editId === cr.id
                ? <input checked={editOob} onChange={(e) => setEditOob(e.target.checked)} type="checkbox" />
                : <span style={{ fontSize: 11 }}>{cr.outOfBaseline ? 'Yes' : '—'}</span>
            ) },
            { key: 'impact', title: 'Impact', getValue: (cr) => composeImpact(cr), render: (cr) => (
              <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{composeImpact(cr) || '—'}</span>
            ) },
          ];
          if (canManage) {
            baseColumns.push({ key: 'actions', title: 'Actions', width: 200, align: 'right', render: (cr) => (
              editId === cr.id ? (
                <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end' }}>
                  <Button variant="primary" size="sm" disabled={saving} onClick={() => void handleSaveEdit()} type="button">Save</Button>
                  <Button variant="secondary" size="sm" onClick={() => setEditId(null)} type="button">Cancel</Button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end' }}>
                  {cr.status === 'PROPOSED' ? (
                    <>
                      <Button variant="primary" size="sm" disabled={saving} onClick={() => void handleApprove(cr)} type="button">Approve</Button>
                      <Button variant="secondary" size="sm" disabled={saving} onClick={() => void handleReject(cr)} type="button">Reject</Button>
                      <Button variant="secondary" size="sm" onClick={() => beginEdit(cr)} type="button">Edit</Button>
                    </>
                  ) : null}
                </div>
              )
            ) });
          }
          return (
            <Table
              variant="compact"
              columns={baseColumns}
              rows={filtered}
              getRowKey={(cr) => cr.id}
            />
          );
        })()}
      </SectionCard>
    </div>
  );
}
