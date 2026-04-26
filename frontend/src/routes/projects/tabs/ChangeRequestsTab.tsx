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
              <button
                className="button button--secondary button--sm"
                onClick={() => setShowCreate(true)}
                type="button"
              >
                + New Change Request
              </button>
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

        {filtered.length === 0 ? (
          <EmptyState
            description={
              crs.length === 0
                ? 'No change requests logged yet.'
                : 'No change requests match the current filters.'
            }
            title="No change requests"
          />
        ) : (
          <table className="dash-compact-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: 30, textAlign: 'left' }}>#</th>
                <th style={{ textAlign: 'left' }}>Title</th>
                <th style={{ width: 100, textAlign: 'left' }}>Severity</th>
                <th style={{ width: 100, textAlign: 'left' }}>Status</th>
                <th style={{ width: 80, textAlign: 'center' }}>OOB</th>
                <th style={{ textAlign: 'left' }}>Impact</th>
                {canManage ? <th style={{ width: 200, textAlign: 'right' }}>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {filtered.map((cr, idx) => {
                const isEditing = editId === cr.id;
                if (isEditing) {
                  return (
                    <tr key={cr.id}>
                      <td>{idx + 1}</td>
                      <td>
                        <input
                          className="field__control"
                          onChange={(e) => setEditTitle(e.target.value)}
                          type="text"
                          value={editTitle}
                        />
                        <textarea
                          className="field__control"
                          onChange={(e) => setEditDesc(e.target.value)}
                          rows={2}
                          style={{ marginTop: 4 }}
                          value={editDesc}
                        />
                      </td>
                      <td>
                        <select
                          className="field__control"
                          onChange={(e) => setEditSeverity(e.target.value as ChangeRequestSeverity)}
                          value={editSeverity}
                        >
                          {SEVERITY_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>{cr.status}</td>
                      <td style={{ textAlign: 'center' }}>
                        <input checked={editOob} onChange={(e) => setEditOob(e.target.checked)} type="checkbox" />
                      </td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{composeImpact(cr) || '—'}</td>
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
                  <tr key={cr.id}>
                    <td>{idx + 1}</td>
                    <td style={{ fontWeight: 500 }}>
                      <div>{cr.title}</div>
                      {cr.description ? (
                        <div style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>
                          {cr.description}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <StatusBadge label={cr.severity} tone={severityTone(cr.severity)} variant="chip" />
                    </td>
                    <td>
                      <StatusBadge label={cr.status} tone={statusTone(cr.status)} variant="chip" />
                    </td>
                    <td style={{ textAlign: 'center', fontSize: 11 }}>
                      {cr.outOfBaseline ? 'Yes' : '—'}
                    </td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>
                      {composeImpact(cr) || '—'}
                    </td>
                    {canManage ? (
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end' }}>
                          {cr.status === 'PROPOSED' ? (
                            <>
                              <button
                                className="button button--primary button--sm"
                                disabled={saving}
                                onClick={() => void handleApprove(cr)}
                                type="button"
                              >
                                Approve
                              </button>
                              <button
                                className="button button--secondary button--sm"
                                disabled={saving}
                                onClick={() => void handleReject(cr)}
                                type="button"
                              >
                                Reject
                              </button>
                              <button
                                className="button button--secondary button--sm"
                                onClick={() => beginEdit(cr)}
                                type="button"
                              >
                                Edit
                              </button>
                            </>
                          ) : null}
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
