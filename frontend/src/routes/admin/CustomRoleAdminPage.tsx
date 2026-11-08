import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button, FormField, FormModal, Input, Table, Tabs, type Column } from '@/components/ds';
import {
  createCustomRole,
  deactivateCustomRole,
  listBuiltInRoles,
  listCustomRoles,
  reactivateCustomRole,
  updateCustomRole,
  type BuiltInRoleDescriptor,
  type CreateCustomRoleRequest,
  type CustomRole,
  type PlatformRole,
  type UpdateCustomRoleRequest,
} from '@/lib/api/custom-role';
import { AccessPoliciesContent } from './AccessPoliciesPage';
import { ResponsibilityMatrixAdminContent } from './ResponsibilityMatrixAdminPage';

/**
 * NEW-LGL-3 — admin surface for tenant-defined custom roles.
 *
 * Bank ops add shapes like Squad Lead, Tribe Lead, IT Service Owner
 * without code changes. The page mounts at `/admin/governance/roles`
 * (ADMIN_ROLES only). Built-in PlatformRole values are listed
 * read-only; only custom rows can be edited or deactivated.
 */

const PLATFORM_ROLE_OPTIONS: { value: PlatformRole; label: string }[] = [
  { value: 'admin', label: 'admin — Administrator' },
  { value: 'director', label: 'director — Director' },
  { value: 'hr_manager', label: 'hr_manager — HR Manager' },
  { value: 'delivery_manager', label: 'delivery_manager — Delivery Manager' },
  { value: 'project_manager', label: 'project_manager — Project Manager' },
  { value: 'resource_manager', label: 'resource_manager — Resource Manager' },
  { value: 'employee', label: 'employee — Employee' },
];

interface FormState {
  roleKey: string;
  displayName: string;
  description: string;
  inheritedRoles: PlatformRole[];
}

function emptyForm(): FormState {
  return {
    roleKey: '',
    displayName: '',
    description: '',
    inheritedRoles: ['employee'],
  };
}

function roleToForm(r: CustomRole): FormState {
  return {
    roleKey: r.roleKey,
    displayName: r.displayName,
    description: r.description ?? '',
    inheritedRoles: r.inheritedRoles,
  };
}

const ROLE_KEY_PATTERN = /^[a-z][a-z0-9_]{1,62}[a-z0-9]$/;

export function CustomRoleAdminContent(): JSX.Element {
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [builtInRoles, setBuiltInRoles] = useState<BuiltInRoleDescriptor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CustomRole | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deactivating, setDeactivating] = useState<CustomRole | null>(null);

  async function reload(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const [next, built] = await Promise.all([listCustomRoles(), listBuiltInRoles()]);
      setCustomRoles(next);
      setBuiltInRoles(built);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load custom roles.');
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

  function openEdit(r: CustomRole): void {
    setForm(roleToForm(r));
    setEditing(r);
  }

  function toggleInherited(role: PlatformRole): void {
    setForm((prev) =>
      prev.inheritedRoles.includes(role)
        ? { ...prev, inheritedRoles: prev.inheritedRoles.filter((r) => r !== role) }
        : { ...prev, inheritedRoles: [...prev.inheritedRoles, role] },
    );
  }

  function validateForCreate(): boolean {
    if (!ROLE_KEY_PATTERN.test(form.roleKey)) {
      toast.error('Role key must be a 3-64 char slug: lowercase letters, digits, underscores.');
      return false;
    }
    return validateShared();
  }

  function validateShared(): boolean {
    if (!form.displayName.trim()) {
      toast.error('Display name is required.');
      return false;
    }
    if (form.inheritedRoles.length === 0) {
      toast.error('Pick at least one inherited platform role.');
      return false;
    }
    return true;
  }

  async function handleCreate(): Promise<void> {
    if (!validateForCreate()) throw new Error('validation');
    const payload: CreateCustomRoleRequest = {
      roleKey: form.roleKey.trim(),
      displayName: form.displayName.trim(),
      description: form.description.trim() || null,
      inheritedRoles: form.inheritedRoles,
    };
    try {
      await createCustomRole(payload);
      toast.success('Custom role created.');
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
    if (!validateShared()) throw new Error('validation');
    const payload: UpdateCustomRoleRequest = {
      displayName: form.displayName.trim(),
      description: form.description.trim() || null,
      inheritedRoles: form.inheritedRoles,
    };
    try {
      await updateCustomRole(editing.id, payload);
      toast.success('Custom role updated.');
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
      await deactivateCustomRole(deactivating.id, 0);
      toast.success('Custom role deactivated.');
      setDeactivating(null);
      await reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Deactivate failed.');
    }
  }

  async function handleReactivate(r: CustomRole): Promise<void> {
    try {
      await reactivateCustomRole(r.id);
      toast.success('Custom role reactivated.');
      await reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Reactivate failed.');
    }
  }

  const customColumns = useMemo<Column<CustomRole>[]>(
    () => [
      {
        key: 'roleKey',
        title: 'Key',
        width: 160,
        render: (r) => (
          <code style={{ fontSize: 12 }}>{r.roleKey}</code>
        ),
      },
      {
        key: 'displayName',
        title: 'Name',
        render: (r) => <span style={{ fontWeight: 500 }}>{r.displayName}</span>,
      },
      {
        key: 'description',
        title: 'Description',
        render: (r) =>
          r.description ? (
            <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{r.description}</span>
          ) : (
            <span style={{ color: 'var(--color-text-subtle)' }}>—</span>
          ),
      },
      {
        key: 'inheritedRoles',
        title: 'Inherits',
        render: (r) =>
          r.inheritedRoles.length === 0 ? (
            <span style={{ color: 'var(--color-text-subtle)' }}>—</span>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)' }}>
              {r.inheritedRoles.map((role) => (
                <StatusBadge key={role} label={role} size="small" tone="info" variant="chip" />
              ))}
            </div>
          ),
      },
      {
        key: 'status',
        title: 'Status',
        width: 110,
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
        width: 230,
        render: (r) => (
          <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end' }}>
            <Button size="sm" variant="secondary" type="button" onClick={() => openEdit(r)}>
              Edit
            </Button>
            {r.active ? (
              <Button
                size="sm"
                variant="secondary"
                type="button"
                onClick={() => setDeactivating(r)}
              >
                Deactivate
              </Button>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                type="button"
                onClick={() => void handleReactivate(r)}
              >
                Reactivate
              </Button>
            )}
          </div>
        ),
      },
    ],
    [],
  );

  const builtInColumns = useMemo<Column<BuiltInRoleDescriptor>[]>(
    () => [
      {
        key: 'roleKey',
        title: 'Key',
        width: 200,
        render: (r) => <code style={{ fontSize: 12 }}>{r.roleKey}</code>,
      },
      {
        key: 'displayName',
        title: 'Name',
        width: 220,
        render: (r) => <span style={{ fontWeight: 500 }}>{r.displayName}</span>,
      },
      {
        key: 'description',
        title: 'Description',
        render: (r) => (
          <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{r.description}</span>
        ),
      },
      {
        key: 'lock',
        title: '',
        width: 90,
        render: () => <StatusBadge tone="neutral" variant="chip" label="Built-in" />,
      },
    ],
    [],
  );

  if (loading && customRoles.length === 0 && builtInRoles.length === 0)
    return <LoadingState label="Loading roles…" skeletonType="table" variant="skeleton" />;

  if (error) return <ErrorState description={error} />;

  const formOpen = creating || editing !== null;

  return (
    <>
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
            + New custom role
          </Button>
        </div>
      </div>

      <SectionCard title={`Custom roles (${customRoles.length})`}>
        {customRoles.length === 0 ? (
          <EmptyState
            description="No custom roles yet. Create one to add tenant-specific shapes like Squad Lead or IT Service Owner."
            title="No custom roles"
            actions={[{ label: 'Create role', onClick: openCreate, variant: 'primary' }]}
          />
        ) : (
          <Table
            variant="compact"
            columns={customColumns}
            rows={customRoles}
            getRowKey={(r) => r.id}
          />
        )}
      </SectionCard>

      <div style={{ marginTop: 'var(--space-5)' }}>
        <SectionCard title={`Built-in roles (${builtInRoles.length})`}>
          <Table
            variant="compact"
            columns={builtInColumns}
            rows={builtInRoles}
            getRowKey={(r) => r.roleKey}
          />
        </SectionCard>
      </div>

      <FormModal
        open={formOpen}
        onCancel={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSubmit={creating ? handleCreate : handleUpdate}
        title={creating ? 'New custom role' : 'Edit custom role'}
        submitLabel={creating ? 'Create' : 'Save changes'}
        size="md"
        testId="custom-role-form"
      >
        {creating ? (
          <FormField
            label="Role key (slug)"
            hint="3-64 chars: lowercase letters, digits, underscores. e.g. squad_lead, tribe_lead, it_service_owner."
          >
            <Input
              value={form.roleKey}
              onChange={(e) => setForm({ ...form, roleKey: e.target.value })}
            />
          </FormField>
        ) : (
          <FormField label="Role key (slug)" hint="Cannot be changed after creation.">
            <Input value={form.roleKey} disabled />
          </FormField>
        )}
        <FormField label="Display name">
          <Input
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          />
        </FormField>
        <FormField label="Description">
          <Input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </FormField>
        <FormField
          label="Inherited platform roles"
          hint="Pick the built-in roles this custom role expands to. People with the custom role gain the union of these permissions."
        >
          <div
            style={{
              display: 'grid',
              gap: 'var(--space-1)',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            }}
          >
            {PLATFORM_ROLE_OPTIONS.map((opt) => {
              const checked = form.inheritedRoles.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  style={{ alignItems: 'center', display: 'flex', gap: 'var(--space-1)' }}
                >
                  <input
                    checked={checked}
                    onChange={() => toggleInherited(opt.value)}
                    type="checkbox"
                  />
                  <span style={{ fontSize: 12 }}>{opt.label}</span>
                </label>
              );
            })}
          </div>
        </FormField>
      </FormModal>

      <ConfirmDialog
        open={deactivating !== null}
        title="Deactivate custom role"
        message={
          deactivating
            ? `Deactivate "${deactivating.displayName}" (${deactivating.roleKey})? Existing assignments are unaffected; new bindings will reject the role until it is reactivated.`
            : ''
        }
        confirmLabel="Deactivate"
        tone="danger"
        onCancel={() => setDeactivating(null)}
        onConfirm={() => void handleDeactivate()}
      />
    </>
  );
}

/**
 * W4-11 — consolidated governance shell.
 *
 * Three tabs under `/admin/governance/roles`:
 *  - `roles`                 → Custom Roles (built-in + tenant-defined)
 *  - `access-policies`       → ABAC policy registry
 *  - `responsibility-matrix` → Who-approves-what rule matrix
 *
 * Tab selection is URL-driven (`?tab=...`) so deep-links survive Back/Forward
 * and the v2 redirects from the legacy `/admin/access-policies` /
 * `/admin/responsibility-matrix` URLs land directly on the right tab.
 */
type GovernanceTab = 'roles' | 'access-policies' | 'responsibility-matrix';

const GOVERNANCE_TABS: { id: GovernanceTab; label: string }[] = [
  { id: 'roles', label: 'Roles' },
  { id: 'access-policies', label: 'Access Policies' },
  { id: 'responsibility-matrix', label: 'Responsibility Matrix' },
];

const TAB_IDS: ReadonlyArray<GovernanceTab> = ['roles', 'access-policies', 'responsibility-matrix'];

export function CustomRoleAdminPage(): JSX.Element {
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab');
  const activeTab: GovernanceTab = (TAB_IDS as readonly string[]).includes(requested ?? '')
    ? (requested as GovernanceTab)
    : 'roles';

  function selectTab(id: GovernanceTab): void {
    const next = new URLSearchParams(params);
    next.set('tab', id);
    setParams(next, { replace: false });
  }

  return (
    <PageContainer testId="custom-role-admin-page">
      <PageHeader
        eyebrow="Admin · Governance"
        subtitle="Roles, access policies, and the responsibility matrix — the three surfaces that decide who can do what across the tenant."
        title="Governance"
      />
      <Tabs
        tabs={GOVERNANCE_TABS}
        value={activeTab}
        onValueChange={(id) => selectTab(id as GovernanceTab)}
        ariaLabel="Governance tabs"
        idPrefix="governance-tab"
        testId="governance-tabs"
      />
      <div
        role="tabpanel"
        id={`governance-tabpanel-${activeTab}`}
        aria-labelledby={`governance-tab-${activeTab}`}
        data-testid={`governance-tabpanel-${activeTab}`}
        style={{ paddingTop: 'var(--space-4)' }}
      >
        {activeTab === 'roles' && <CustomRoleAdminContent />}
        {activeTab === 'access-policies' && <AccessPoliciesContent headerless />}
        {activeTab === 'responsibility-matrix' && <ResponsibilityMatrixAdminContent headerless />}
      </div>
    </PageContainer>
  );
}
