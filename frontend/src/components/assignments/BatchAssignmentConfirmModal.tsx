import { useState } from 'react';

import { useAuth } from '@/app/auth-context';
import { bulkCreateAssignments, type BulkAssignmentResponse } from '@/lib/api/assignments';
import { STAFFING_ROLES } from '@/lib/staffing-roles';
import type { AssignmentModalPreFill } from './CreateAssignmentModal';
import { DatePicker, FormField, FormModal, Input, Select, Table, type Column } from '@/components/ds';

interface BatchAssignmentConfirmModalProps {
  items: AssignmentModalPreFill[];
  onCancel: () => void;
  onSuccess: (response: BulkAssignmentResponse) => void;
  open: boolean;
}

/**
 * Phase DS-2-7 Tier C1 — rebuilt on `<FormModal>`. The custom
 * `confirm-dialog-overlay` markup is gone; the new shell handles backdrop /
 * focus trap / scroll lock / mobile fullscreen / submit-loading / cancel
 * dirty-guard. Public API unchanged.
 */
export function BatchAssignmentConfirmModal({ items, onCancel, onSuccess, open }: BatchAssignmentConfirmModalProps): JSX.Element | null {
  if (!open) return null;
  return (
    <BatchInner items={items} onCancel={onCancel} onSuccess={onSuccess} open={open} />
  );
}

function BatchInner({ items, onCancel, onSuccess, open }: BatchAssignmentConfirmModalProps): JSX.Element {
  const { principal } = useAuth();
  const [staffingRole, setStaffingRole] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [allocationPercent, setAllocationPercent] = useState(100);
  const [startDate, setStartDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const actorId = principal?.personId ?? '';
  const effectiveRole = staffingRole === '__custom__' ? customRole : staffingRole;
  const isDirty = staffingRole !== '' || customRole !== '' || allocationPercent !== 100 || startDate !== '';
  const submitDisabled =
    !actorId ||
    !effectiveRole.trim() ||
    allocationPercent < 1 ||
    allocationPercent > 100 ||
    !startDate;

  async function handleSubmit(): Promise<void> {
    if (!actorId) return;
    if (!effectiveRole.trim()) { setError('Staffing role is required.'); throw new Error('validation'); }
    if (allocationPercent < 1 || allocationPercent > 100) { setError('Allocation must be 1–100%.'); throw new Error('validation'); }
    if (!startDate) { setError('Start date is required.'); throw new Error('validation'); }

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
      const msg = err instanceof Error ? err.message : 'Batch creation failed.';
      setError(msg);
      throw err;
    }
  }

  if (items.length === 0) return <></>;

  return (
    <FormModal
      open={open}
      onCancel={onCancel}
      onSubmit={handleSubmit}
      title="Batch Create Assignments"
      description={`This will create ${items.length} assignment${items.length !== 1 ? 's' : ''} in one operation.`}
      submitLabel={`Create ${items.length} Assignment${items.length !== 1 ? 's' : ''}`}
      submitDisabled={submitDisabled}
      dirty={isDirty}
      size="md"
    >
      <div style={{ maxHeight: 180, overflow: 'auto', marginBottom: 'var(--space-3)', border: '1px solid var(--color-border)', borderRadius: 6 }}>
        <Table
          variant="compact"
          columns={[
            { key: 'person', title: 'Person', getValue: (i) => i.personName, render: (i) => <span style={{ fontWeight: 500 }}>{i.personName}</span> },
            { key: 'project', title: 'Project', getValue: (i) => i.projectName, render: (i) => i.projectName },
            { key: 'hours', title: 'Hours', align: 'right', getValue: (i) => i.contextHours ?? 0, render: (i) => (
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{i.contextHours !== null ? `${i.contextHours}h` : '—'}</span>
            ) },
          ] as Column<AssignmentModalPreFill>[]}
          rows={items}
          getRowKey={(_, i) => String(i)}
        />
      </div>

      {error && <div style={{ color: 'var(--color-status-danger)', fontSize: 12, marginBottom: 'var(--space-2)' }}>{error}</div>}

      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: 2 }}>
        These fields apply to all {items.length} assignments:
      </div>

      <FormField label="Staffing Role" required>
        {(props) => (
          <Select value={staffingRole} onChange={(e) => setStaffingRole(e.target.value)} {...props}>
            <option value="">Select a role...</option>
            {STAFFING_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
            <option value="__custom__">Other (custom)</option>
          </Select>
        )}
      </FormField>

      {staffingRole === '__custom__' && (
        <FormField label="Custom Role" required>
          {(props) => (
            <Input value={customRole} onChange={(e) => setCustomRole(e.target.value)} placeholder="Enter custom role" required {...props} />
          )}
        </FormField>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
        <FormField label="Allocation %" required>
          {(props) => (
            <Input type="number" min={1} max={100} value={allocationPercent} onChange={(e) => setAllocationPercent(Number(e.target.value))} required {...props} />
          )}
        </FormField>
        <FormField label="Start Date" required>
          {(props) => (
            <DatePicker value={startDate} onValueChange={setStartDate} required {...props} />
          )}
        </FormField>
      </div>
    </FormModal>
  );
}
