import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { ALL_ROLES, type AppRole } from '@/app/route-manifest';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { RoleChipMultiSelect } from '@/components/common/RoleChipMultiSelect';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button, FormField, FormModal, Input, Switch, Table, type Column } from '@/components/ds';
import {
  createLeavePolicy,
  deactivateLeavePolicy,
  listLeavePolicies,
  updateLeavePolicy,
  type CreateLeavePolicyRequest,
  type LeavePolicy,
  type LeaveType,
  type UpdateLeavePolicyRequest,
} from '@/lib/api/leave-policy';

const NUM = { fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const };

const LEAVE_TYPES: { value: LeaveType; label: string }[] = [
  { value: 'ANNUAL', label: 'Annual Leave' },
  { value: 'SICK', label: 'Sick Leave' },
  { value: 'PARENTAL', label: 'Parental Leave' },
  { value: 'COMPASSIONATE', label: 'Compassionate' },
  { value: 'BEREAVEMENT', label: 'Bereavement' },
  { value: 'STUDY', label: 'Study Leave' },
  { value: 'PERSONAL', label: 'Personal' },
  { value: 'OT_OFF', label: 'Overtime Off' },
  { value: 'UNPAID', label: 'Unpaid' },
  { value: 'OTHER', label: 'Other' },
];

interface FormState {
  name: string;
  leaveType: LeaveType;
  accrualPerYear: string;
  maxCarryOver: string;
  approvalChain: AppRole[];
  active: boolean;
}

function emptyForm(): FormState {
  return {
    name: '',
    leaveType: 'ANNUAL',
    accrualPerYear: '20',
    maxCarryOver: '5',
    approvalChain: ['hr_manager'],
    active: true,
  };
}

function isAppRole(value: string): value is AppRole {
  return (ALL_ROLES as string[]).includes(value);
}

function policyToForm(p: LeavePolicy): FormState {
  return {
    name: p.name,
    leaveType: p.leaveType,
    accrualPerYear: String(p.accrualPerYear),
    maxCarryOver: String(p.maxCarryOver),
    approvalChain: p.approvalChain.filter(isAppRole),
    active: p.active,
  };
}

function labelForType(t: LeaveType): string {
  return LEAVE_TYPES.find((x) => x.value === t)?.label ?? t;
}

export function LeavePolicyAdminPage(): JSX.Element {
  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<LeavePolicy | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deactivating, setDeactivating] = useState<LeavePolicy | null>(null);

  async function reload(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const next = await listLeavePolicies();
      setPolicies(next);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load leave policies.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  function openCreate(): void {
    setForm(emptyForm());
    setCreating(true);
  }

  function openEdit(p: LeavePolicy): void {
    setForm(policyToForm(p));
    setEditing(p);
  }

  function validateForm(): { accrual: number; carry: number; chain: AppRole[] } | null {
    const accrual = Number(form.accrualPerYear);
    const carry = Number(form.maxCarryOver);
    if (!form.name.trim()) {
      toast.error('Name is required.');
      return null;
    }
    if (!Number.isFinite(accrual) || accrual < 0 || accrual > 365) {
      toast.error('Accrual per year must be 0–365.');
      return null;
    }
    if (!Number.isFinite(carry) || carry < 0 || carry > 365) {
      toast.error('Max carry-over must be 0–365.');
      return null;
    }
    const chain = form.approvalChain;
    if (chain.length === 0) {
      toast.error('Approval chain must include at least one role.');
      return null;
    }
    return { accrual, carry, chain };
  }

  async function handleCreate(): Promise<void> {
    const validated = validateForm();
    if (!validated) throw new Error('validation');
    const payload: CreateLeavePolicyRequest = {
      name: form.name.trim(),
      leaveType: form.leaveType,
      accrualPerYear: validated.accrual,
      maxCarryOver: validated.carry,
      approvalChain: validated.chain,
      active: form.active,
    };
    try {
      await createLeavePolicy(payload);
      toast.success('Leave policy created.');
      setCreating(false);
      await reload();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Create failed.';
      toast.error(msg);
      throw e;
    }
  }

  async function handleUpdate(): Promise<void> {
    if (!editing) return;
    const validated = validateForm();
    if (!validated) throw new Error('validation');
    const payload: UpdateLeavePolicyRequest = {
      name: form.name.trim(),
      leaveType: form.leaveType,
      accrualPerYear: validated.accrual,
      maxCarryOver: validated.carry,
      approvalChain: validated.chain,
      active: form.active,
    };
    try {
      await updateLeavePolicy(editing.id, payload);
      toast.success('Leave policy updated.');
      setEditing(null);
      await reload();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Update failed.';
      toast.error(msg);
      throw e;
    }
  }

  async function handleDeactivate(): Promise<void> {
    if (!deactivating) return;
    try {
      await deactivateLeavePolicy(deactivating.id);
      toast.success('Leave policy deactivated.');
      setDeactivating(null);
      await reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Deactivate failed.');
    }
  }

  const columns = useMemo<Column<LeavePolicy>[]>(
    () => [
      { key: 'name', title: 'Name', render: (r) => <span style={{ fontWeight: 500 }}>{r.name}</span> },
      {
        key: 'leaveType',
        title: 'Type',
        width: 160,
        render: (r) => labelForType(r.leaveType),
      },
      {
        key: 'accrualPerYear',
        title: 'Accrual',
        align: 'right',
        width: 90,
        render: (r) => (
          <span style={NUM}>{r.accrualPerYear} d</span>
        ),
      },
      {
        key: 'maxCarryOver',
        title: 'Carry',
        align: 'right',
        width: 80,
        render: (r) => <span style={NUM}>{r.maxCarryOver} d</span>,
      },
      {
        key: 'approvalChain',
        title: 'Approval chain',
        render: (r) =>
          r.approvalChain.length === 0 ? (
            <span style={{ color: 'var(--color-text-subtle)' }}>—</span>
          ) : (
            <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>
              {r.approvalChain.join(' → ')}
            </span>
          ),
      },
      {
        key: 'status',
        title: 'Status',
        width: 100,
        render: (r) =>
          r.active ? (
            <StatusBadge tone="active" variant="chip" label="Active" />
          ) : (
            <StatusBadge tone="neutral" variant="chip" label="Inactive" />
          ),
      },
      {
        key: 'actions',
        title: 'Actions',
        align: 'right',
        width: 200,
        render: (r) => (
          <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end' }}>
            <Button size="sm" variant="secondary" type="button" onClick={() => openEdit(r)}>
              Edit
            </Button>
            {r.active ? (
              <Button size="sm" variant="secondary" type="button" onClick={() => setDeactivating(r)}>
                Deactivate
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [],
  );

  if (loading && policies.length === 0)
    return (
      <PageContainer testId="leave-policy-admin-page">
        <PageHeader eyebrow="Admin" title="Leave Policies" />
        <LoadingState label="Loading leave policies…" skeletonType="table" variant="skeleton" />
      </PageContainer>
    );

  if (error)
    return (
      <PageContainer testId="leave-policy-admin-page">
        <PageHeader eyebrow="Admin" title="Leave Policies" />
        <ErrorState description={error} />
      </PageContainer>
    );

  const formOpen = creating || editing !== null;
  const totalPolicies = policies.length;
  const activePolicies = policies.filter((p) => p.active).length;
  const inactivePolicies = totalPolicies - activePolicies;
  const distinctTypes = new Set(policies.map((p) => p.leaveType)).size;

  return (
    <PageContainer testId="leave-policy-admin-page">
      <PageHeader
        eyebrow="Admin"
        subtitle="Configure per-leave-type accrual, max carry-over, and approval chains. Replaces hard-coded constants so HR governance can tune leave policy without code changes."
        title="Leave Policies"
      />

      <div className="kpi-strip" aria-label="Leave policy metrics">
        <Link
          className="kpi-strip__item"
          to="/admin/leave-policies"
          style={{ borderLeft: '3px solid var(--color-accent)' }}
        >
          <span className="kpi-strip__value">{totalPolicies}</span>
          <span className="kpi-strip__label">Policies</span>
          <span className="kpi-strip__context" style={{ color: 'var(--color-text-muted)' }}>
            total configured
          </span>
        </Link>
        <Link
          className="kpi-strip__item"
          to="/admin/leave-policies"
          style={{ borderLeft: '3px solid var(--color-status-active)' }}
        >
          <span className="kpi-strip__value">{activePolicies}</span>
          <span className="kpi-strip__label">Active</span>
          <span className="kpi-strip__context" style={{ color: 'var(--color-text-muted)' }}>
            in force today
          </span>
        </Link>
        <Link
          className="kpi-strip__item"
          to="/admin/leave-policies"
          style={{ borderLeft: '3px solid var(--color-status-neutral)' }}
        >
          <span className="kpi-strip__value">{inactivePolicies}</span>
          <span className="kpi-strip__label">Inactive</span>
          <span className="kpi-strip__context" style={{ color: 'var(--color-text-muted)' }}>
            retired
          </span>
        </Link>
        <Link
          className="kpi-strip__item"
          to="/admin/leave-policies"
          style={{ borderLeft: '3px solid var(--color-chart-5)' }}
        >
          <span className="kpi-strip__value">{distinctTypes}</span>
          <span className="kpi-strip__label">Leave types</span>
          <span className="kpi-strip__context" style={{ color: 'var(--color-text-muted)' }}>
            covered
          </span>
        </Link>
      </div>

      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-4)',
        }}
      >
        <div style={{ marginLeft: 'auto' }}>
          <Button variant="primary" type="button" onClick={openCreate}>
            + New leave policy
          </Button>
        </div>
      </div>

      {policies.length === 0 ? (
        <SectionCard>
          <EmptyState
            description="No leave policies yet. Create one to make accrual + approval-chain config visible to HR."
            title="No policies"
            actions={[{ label: 'Create policy', onClick: openCreate, variant: 'primary' }]}
          />
        </SectionCard>
      ) : (
        <SectionCard title={`Leave policies (${policies.length})`}>
          <Table
            variant="compact"
            columns={columns}
            rows={policies}
            getRowKey={(r) => r.id}
          />
        </SectionCard>
      )}

      <FormModal
        open={formOpen}
        onCancel={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSubmit={creating ? handleCreate : handleUpdate}
        title={creating ? 'New leave policy' : 'Edit leave policy'}
        submitLabel={creating ? 'Create' : 'Save changes'}
        size="md"
        testId="leave-policy-form"
      >
        <FormField label="Name">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </FormField>
        <label className="field">
          <span className="field__label">Leave type</span>
          <select
            className="field__control"
            value={form.leaveType}
            onChange={(e) => setForm({ ...form, leaveType: e.target.value as LeaveType })}
          >
            {LEAVE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <FormField label="Accrual per year (days, 0–365)">
          <Input
            type="number"
            min={0}
            max={365}
            value={form.accrualPerYear}
            onChange={(e) => setForm({ ...form, accrualPerYear: e.target.value })}
          />
        </FormField>
        <FormField label="Max carry-over (days, 0–365)">
          <Input
            type="number"
            min={0}
            max={365}
            value={form.maxCarryOver}
            onChange={(e) => setForm({ ...form, maxCarryOver: e.target.value })}
          />
        </FormField>
        <FormField
          label="Approval chain"
          hint="Pick the roles that must approve, in order. Click chips to remove."
        >
          <RoleChipMultiSelect
            value={form.approvalChain}
            onChange={(next) => setForm({ ...form, approvalChain: next })}
          />
        </FormField>
        <FormField label="Active">
          <Switch checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
        </FormField>
      </FormModal>

      <ConfirmDialog
        open={deactivating !== null}
        title="Deactivate leave policy"
        message={
          deactivating
            ? `Deactivate "${deactivating.name}"? Existing leave balances are unaffected; new balance lookups will fall back to the defaults until another policy of the same type is activated.`
            : ''
        }
        confirmLabel="Deactivate"
        tone="danger"
        onCancel={() => setDeactivating(null)}
        onConfirm={() => void handleDeactivate()}
      />
    </PageContainer>
  );
}
