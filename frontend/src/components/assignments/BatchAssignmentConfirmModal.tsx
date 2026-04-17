import { FormEvent, useState } from 'react';

import { useAuth } from '@/app/auth-context';
import { bulkCreateAssignments, type BulkAssignmentResponse } from '@/lib/api/assignments';
import { STAFFING_ROLES } from '@/lib/staffing-roles';
import type { AssignmentModalPreFill } from './CreateAssignmentModal';

interface BatchAssignmentConfirmModalProps {
  items: AssignmentModalPreFill[];
  onCancel: () => void;
  onSuccess: (response: BulkAssignmentResponse) => void;
  open: boolean;
}

function BatchInner({ items, onCancel, onSuccess }: { items: AssignmentModalPreFill[]; onCancel: () => void; onSuccess: (r: BulkAssignmentResponse) => void }): JSX.Element {
  const { principal } = useAuth();
  const [staffingRole, setStaffingRole] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [allocationPercent, setAllocationPercent] = useState(100);
  const [startDate, setStartDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actorId = principal?.personId ?? '';
  const effectiveRole = staffingRole === '__custom__' ? customRole : staffingRole;

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!actorId) return;
    if (!effectiveRole.trim()) { setError('Staffing role is required.'); return; }
    if (allocationPercent < 1 || allocationPercent > 100) { setError('Allocation must be 1–100%.'); return; }
    if (!startDate) { setError('Start date is required.'); return; }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await bulkCreateAssignments({
        actorId,
        entries: items.map((item) => ({
          allocationPercent,
          personId: item.personId,
          projectId: item.projectId,
          staffingRole: effectiveRole.trim(),
          startDate,
        })),
      });
      setStaffingRole('');
      setAllocationPercent(100);
      setStartDate('');
      onSuccess(response);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Batch creation failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="confirm-dialog-overlay" onClick={onCancel}>
      <div className="confirm-dialog" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div className="confirm-dialog__title">Batch Create Assignments</div>

        <div style={{ background: 'var(--color-status-warning)', color: 'var(--color-surface)', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, marginBottom: 'var(--space-3)' }}>
          This will create {items.length} assignment{items.length !== 1 ? 's' : ''} in one operation.
        </div>

        {/* Summary table */}
        <div style={{ maxHeight: 180, overflow: 'auto', marginBottom: 'var(--space-3)', border: '1px solid var(--color-border)', borderRadius: 6 }}>
          <table className="dash-compact-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Person</th>
                <th>Project</th>
                <th style={{ textAlign: 'right' }}>Hours</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{item.personName}</td>
                  <td>{item.projectName}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{item.contextHours !== null ? `${item.contextHours}h` : '\u2014'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {error && <div style={{ color: 'var(--color-status-danger)', fontSize: 12, marginBottom: 'var(--space-2)' }}>{error}</div>}

        <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: 2 }}>These fields apply to all {items.length} assignments:</div>
          <label className="field">
            <span className="field__label">Staffing Role *</span>
            <select className="field__control" value={staffingRole} onChange={(e) => setStaffingRole(e.target.value)}>
              <option value="">Select a role...</option>
              {STAFFING_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
              <option value="__custom__">Other (custom)</option>
            </select>
          </label>
          {staffingRole === '__custom__' && (
            <label className="field">
              <span className="field__label">Custom Role *</span>
              <input className="field__control" value={customRole} onChange={(e) => setCustomRole(e.target.value)} placeholder="Enter custom role" required />
            </label>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
            <label className="field">
              <span className="field__label">Allocation % *</span>
              <input className="field__control" type="number" min={1} max={100} value={allocationPercent} onChange={(e) => setAllocationPercent(Number(e.target.value))} required />
            </label>
            <label className="field">
              <span className="field__label">Start Date *</span>
              <input className="field__control" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </label>
          </div>

          <div className="confirm-dialog__actions">
            <button className="button button--secondary" type="button" onClick={onCancel} disabled={isSubmitting}>Cancel</button>
            <button className="button button--primary" type="submit" disabled={isSubmitting || !actorId}>
              {isSubmitting ? 'Creating...' : `Create ${items.length} Assignment${items.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function BatchAssignmentConfirmModal({ items, onCancel, onSuccess, open }: BatchAssignmentConfirmModalProps): JSX.Element | null {
  if (!open || items.length === 0) return null;
  return <BatchInner items={items} onCancel={onCancel} onSuccess={onSuccess} />;
}
